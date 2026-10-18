-- Bitácora de labores agrícolas por parcela (siembra, fertilización, cosecha, etc.).
-- Idempotente: se puede ejecutar varias veces (npm run db:init).
-- Las labores no se eliminan: se anulan con un motivo, para conservar la trazabilidad.

CREATE TABLE IF NOT EXISTS public.actividades_parcela (
    actividad_id uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    parcela_id uuid NOT NULL REFERENCES public.parcelas(parcela_id) ON DELETE CASCADE,
    usuario_id uuid NOT NULL REFERENCES public.usuarios(usuario_id),
    tipo character varying(30) NOT NULL,
    fecha date NOT NULL,
    producto character varying(120),
    cantidad numeric(10,2),
    unidad character varying(20),
    descripcion text,
    anulada boolean DEFAULT false NOT NULL,
    motivo_anulacion text,
    anulada_por uuid REFERENCES public.usuarios(usuario_id),
    fecha_anulacion timestamp with time zone,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT actividad_tipo_valido CHECK (tipo IN (
        'siembra', 'fertilizacion', 'encalado', 'riego', 'fitosanitario', 'muestreo', 'cosecha', 'otra'
    )),
    CONSTRAINT actividad_cantidad_no_negativa CHECK (cantidad IS NULL OR cantidad >= 0),
    CONSTRAINT actividad_fecha_razonable CHECK (fecha >= DATE '2000-01-01'),
    CONSTRAINT actividad_anulacion_completa CHECK (
        anulada = false OR (motivo_anulacion IS NOT NULL AND fecha_anulacion IS NOT NULL)
    )
);

COMMENT ON TABLE public.actividades_parcela IS 'Bitácora de labores agrícolas de cada parcela; las labores se anulan, no se eliminan.';

CREATE INDEX IF NOT EXISTS idx_actividades_parcela_fecha
    ON public.actividades_parcela USING btree (parcela_id, fecha DESC);
