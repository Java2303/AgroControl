-- 1) Nombres de la base de datos en español (tipo, columnas, restricciones, índices y secuencia).
-- 2) División de la parcela en lotes de igual superficie (RN-02, RN-03): cada lote guarda su polígono.
-- Idempotente: cada renombre se aplica solo si el nombre anterior todavía existe.

DO $$
DECLARE
    r record;
    nuevo text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE public.user_role RENAME TO rol_usuario;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'email') THEN
        ALTER TABLE public.usuarios RENAME COLUMN email TO correo;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'password_hash') THEN
        ALTER TABLE public.usuarios RENAME COLUMN password_hash TO contrasena_hash;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parcelas' AND column_name = 'geom') THEN
        ALTER TABLE public.parcelas RENAME COLUMN geom TO geometria;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lotes' AND column_name = 'dispositivo_token_hash') THEN
        ALTER TABLE public.lotes RENAME COLUMN dispositivo_token_hash TO clave_dispositivo_hash;
    END IF;
    -- Columna del diseño inicial con IA: el motor de reglas es determinista y nunca la usó
    ALTER TABLE public.reportes DROP COLUMN IF EXISTS nivel_confianza;

    -- Restricciones: sufijos de PostgreSQL (_pkey, _fkey, _key) y prefijo fk_ pasan a español
    FOR r IN
        SELECT c.conname, t.relname
        FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          -- Las tablas de extensiones (spatial_ref_sys de PostGIS) no son del proyecto
          AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
          AND (c.conname ~ '_(pkey|fkey|key)$' OR c.conname ~ '^fk_' OR c.conname ~ '(email|geom($|_))')
    LOOP
        nuevo := regexp_replace(r.conname, '_pkey$', '_clave_primaria');
        nuevo := regexp_replace(nuevo, '_fkey$', '_referencia');
        nuevo := regexp_replace(nuevo, '_key$', '_unico');
        nuevo := regexp_replace(nuevo, '^fk_', 'referencia_');
        nuevo := regexp_replace(replace(nuevo, 'email', 'correo'), 'geom($|_)', 'geometria\1');
        IF nuevo <> r.conname THEN
            EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', r.relname, r.conname, nuevo);
        END IF;
    END LOOP;

    -- Índices (los de restricciones ya cambiaron con ellas)
    FOR r IN
        SELECT i.relname FROM pg_class i JOIN pg_namespace n ON n.oid = i.relnamespace
        WHERE n.nspname = 'public' AND i.relkind = 'i' AND i.relname ~ '^idx_'
    LOOP
        nuevo := replace(regexp_replace(r.relname, '^idx_', 'indice_'), 'geom', 'geometria');
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = nuevo) THEN
            EXECUTE format('DROP INDEX public.%I', r.relname);
        ELSE
            EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.relname, nuevo);
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tipos_cultivo_tipo_cultivo_id_seq') THEN
        ALTER SEQUENCE public.tipos_cultivo_tipo_cultivo_id_seq RENAME TO tipos_cultivo_id_secuencia;
    END IF;
END $$;

COMMENT ON COLUMN public.lotes.clave_dispositivo_hash IS 'SHA-256 de la clave del nodo ESP32; NULL si el lote usa el simulador.';
COMMENT ON COLUMN public.parcelas.geometria IS 'Polígono georreferenciado de la parcela dibujada por el agrónomo.';
COMMENT ON TABLE public.reportes IS 'Certificados de suelo emitidos a partir de una lectura y del motor de reglas del CIAT.';

-- Polígono de cada lote dentro de su parcela
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS geometria public.geometry(MultiPolygon, 4326);
COMMENT ON COLUMN public.lotes.geometria IS 'Porción de la parcela que cubre el nodo del lote.';

-- Divide un polígono en `cantidad` franjas de igual superficie, cortando a lo largo de su lado
-- mayor. Cada corte se ubica por bisección sobre el área geodésica acumulada.
CREATE OR REPLACE FUNCTION public.dividir_en_lotes(contorno public.geometry, cantidad integer)
RETURNS SETOF public.geometry
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    xmin float8 := ST_XMin(contorno);
    xmax float8 := ST_XMax(contorno);
    ymin float8 := ST_YMin(contorno);
    ymax float8 := ST_YMax(contorno);
    por_x boolean := (xmax - xmin) * cos(radians((ymin + ymax) / 2)) >= (ymax - ymin);
    total float8 := ST_Area(contorno::geography);
    inicio float8;
    bajo float8;
    alto float8;
    medio float8;
    corte float8;
    i integer;
    j integer;
BEGIN
    IF cantidad <= 1 THEN
        RETURN NEXT ST_Multi(contorno);
        RETURN;
    END IF;
    inicio := CASE WHEN por_x THEN xmin ELSE ymin END - 1;
    FOR i IN 1..cantidad LOOP
        IF i = cantidad THEN
            corte := CASE WHEN por_x THEN xmax ELSE ymax END + 1;
        ELSE
            bajo := CASE WHEN por_x THEN xmin ELSE ymin END;
            alto := CASE WHEN por_x THEN xmax ELSE ymax END;
            FOR j IN 1..40 LOOP
                medio := (bajo + alto) / 2;
                IF ST_Area(ST_Intersection(contorno, CASE WHEN por_x
                        THEN ST_MakeEnvelope(xmin - 1, ymin - 1, medio, ymax + 1, 4326)
                        ELSE ST_MakeEnvelope(xmin - 1, ymin - 1, xmax + 1, medio, 4326) END)::geography) < total * i / cantidad THEN
                    bajo := medio;
                ELSE
                    alto := medio;
                END IF;
            END LOOP;
            corte := (bajo + alto) / 2;
        END IF;
        RETURN NEXT ST_Multi(ST_CollectionExtract(ST_Intersection(contorno, CASE WHEN por_x
            THEN ST_MakeEnvelope(inicio, ymin - 1, corte, ymax + 1, 4326)
            ELSE ST_MakeEnvelope(xmin - 1, inicio, xmax + 1, corte, 4326) END), 3));
        inicio := corte;
    END LOOP;
END $$;

-- Cantidad de lotes de una parcela: uno por cada 15 ha o fracción, hasta cuatro (RN-02, RN-03)
CREATE OR REPLACE FUNCTION public.cantidad_de_lotes(contorno public.geometry)
RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
    SELECT LEAST(4, GREATEST(1, CEIL(ST_Area(contorno::geography) / 150000.0)))::integer
$$;

-- Crea los lotes de una parcela que todavía no tiene ninguno; devuelve cuántos creó
CREATE OR REPLACE FUNCTION public.crear_lotes_de_parcela(id_parcela uuid)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    contorno public.geometry;
    nombre_parcela text;
    n integer;
    k integer := 0;
    pieza public.geometry;
BEGIN
    SELECT geometria, nombre INTO contorno, nombre_parcela FROM public.parcelas WHERE parcela_id = id_parcela;
    IF contorno IS NULL OR EXISTS (SELECT 1 FROM public.lotes WHERE parcela_id = id_parcela) THEN
        RETURN 0;
    END IF;
    n := public.cantidad_de_lotes(contorno);
    FOR pieza IN SELECT * FROM public.dividir_en_lotes(contorno, n) LOOP
        k := k + 1;
        INSERT INTO public.lotes (parcela_id, nombre_lote, descripcion, superficie_ha, geometria)
        VALUES (id_parcela, CASE WHEN n > 1 THEN format('Lote %s de %s', k, n) ELSE 'Lote único' END,
                format('Lote de monitoreo de %s', nombre_parcela),
                LEAST(15, ROUND((ST_Area(pieza::geography) / 10000)::numeric, 2)), pieza);
    END LOOP;
    RETURN n;
END $$;

-- Parcelas registradas antes de la división: el lote existente (con sus lecturas y su nodo) pasa a
-- ser el lote 1 y se crean los demás. Solo se procesan las parcelas cuyos lotes aún no tienen polígono.
DO $$
DECLARE
    p record;
    n integer;
    k integer;
    pieza public.geometry;
    lote_inicial uuid;
BEGIN
    FOR p IN
        SELECT pa.parcela_id, pa.nombre, pa.geometria FROM public.parcelas pa
        WHERE EXISTS (SELECT 1 FROM public.lotes l WHERE l.parcela_id = pa.parcela_id)
          AND NOT EXISTS (SELECT 1 FROM public.lotes l WHERE l.parcela_id = pa.parcela_id AND l.geometria IS NOT NULL)
    LOOP
        n := public.cantidad_de_lotes(p.geometria);
        SELECT lote_id INTO lote_inicial FROM public.lotes WHERE parcela_id = p.parcela_id ORDER BY fecha_creacion, lote_id LIMIT 1;
        k := 0;
        FOR pieza IN SELECT * FROM public.dividir_en_lotes(p.geometria, n) LOOP
            k := k + 1;
            IF k = 1 THEN
                UPDATE public.lotes
                SET geometria = pieza,
                    superficie_ha = LEAST(15, ROUND((ST_Area(pieza::geography) / 10000)::numeric, 2)),
                    nombre_lote = CASE WHEN n > 1 THEN format('Lote 1 de %s', n) ELSE nombre_lote END
                WHERE lote_id = lote_inicial;
            ELSE
                INSERT INTO public.lotes (parcela_id, nombre_lote, descripcion, superficie_ha, geometria)
                VALUES (p.parcela_id, format('Lote %s de %s', k, n), format('Lote de monitoreo de %s', p.nombre),
                        LEAST(15, ROUND((ST_Area(pieza::geography) / 10000)::numeric, 2)), pieza);
            END IF;
        END LOOP;
    END LOOP;
END $$;
