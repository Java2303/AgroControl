--
-- Esquema de la base de datos de Agro Control (PostgreSQL 16+ con PostGIS).
-- Generado desde agro_control_db con: pg_dump --schema-only --no-owner --no-privileges
-- Se aplica una sola vez sobre una base vacía con: npm run db:init (desde backend/)
--

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'admin_ciat',
    'agronomo',
    'productor'
);

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: lecturas_suelo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lecturas_suelo (
    lectura_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lote_id uuid NOT NULL,
    nitrogeno numeric(6,2) NOT NULL,
    fosforo numeric(6,2) NOT NULL,
    potasio numeric(6,2) NOT NULL,
    ph numeric(4,2) NOT NULL,
    humedad_suelo numeric(5,2) NOT NULL,
    temperatura_suelo numeric(5,2) NOT NULL,
    conductividad_electrica integer NOT NULL,
    fecha_captura timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: TABLE lecturas_suelo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lecturas_suelo IS 'Almacena los parámetros químicos y físicos captados por el sensor NPK 7-en-1 vía ESP32.';

--
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    lote_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parcela_id uuid NOT NULL,
    nombre_lote character varying(100) NOT NULL,
    descripcion text,
    superficie_ha numeric(10,2) NOT NULL,
    dispositivo_mac character varying(17),
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ultima_sincronizacion timestamp with time zone,
    CONSTRAINT check_cobertura_sensor CHECK ((superficie_ha <= 15.00))
);

--
-- Name: TABLE lotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lotes IS 'Subdivisiones de la parcela donde se vinculan los nodos sensores NPK.';

--
-- Name: parcelas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parcelas (
    parcela_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    ubicacion_nombre character varying(255),
    geometria public.geometry(Polygon,4326) NOT NULL,
    area_hectareas numeric(10,2) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_cultivo_id integer,
    CONSTRAINT limite_superficie CHECK ((public.st_area((geometria)::public.geography) <= (500000)::double precision))
);

--
-- Name: COLUMN parcelas.geometria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parcelas.geometria IS 'Almacena el polígono georreferenciado de la parcela dibujada por el agrónomo.';

--
-- Name: reportes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reportes (
    reporte_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lote_id uuid NOT NULL,
    lectura_id uuid NOT NULL,
    calificacion_global character varying(50),
    recomendacion text,
    fecha_generacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    codigo_verificacion character varying(20)
);

--
-- Name: TABLE reportes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reportes IS 'Certificados de suelo emitidos a partir de una lectura y del motor de reglas del CIAT.';

--
-- Name: tipos_cultivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_cultivo (
    tipo_cultivo_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: tipos_cultivo_id_secuencia; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_cultivo_id_secuencia
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: tipos_cultivo_id_secuencia; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_cultivo_id_secuencia OWNED BY public.tipos_cultivo.tipo_cultivo_id;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    usuario_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    correo character varying(100) NOT NULL,
    contrasena_hash text NOT NULL,
    rol public.rol_usuario DEFAULT 'productor'::public.rol_usuario NOT NULL,
    telefono character varying(20),
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    activo boolean DEFAULT true,
    ci_nit character varying(20)
);

--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'Almacena la información de identidad y roles para el control de acceso al sistema Agro Control.';

--
-- Name: tipos_cultivo tipo_cultivo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_cultivo ALTER COLUMN tipo_cultivo_id SET DEFAULT nextval('public.tipos_cultivo_id_secuencia'::regclass);

--
-- Name: lecturas_suelo lecturas_suelo_clave_primaria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturas_suelo
    ADD CONSTRAINT lecturas_suelo_clave_primaria PRIMARY KEY (lectura_id);

--
-- Name: lotes lotes_dispositivo_mac_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_dispositivo_mac_unico UNIQUE (dispositivo_mac);

--
-- Name: lotes lotes_clave_primaria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_clave_primaria PRIMARY KEY (lote_id);

--
-- Name: parcelas parcelas_clave_primaria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_clave_primaria PRIMARY KEY (parcela_id);

--
-- Name: reportes reportes_codigo_verificacion_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_codigo_verificacion_unico UNIQUE (codigo_verificacion);

--
-- Name: reportes reportes_clave_primaria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_clave_primaria PRIMARY KEY (reporte_id);

--
-- Name: tipos_cultivo tipos_cultivo_nombre_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_cultivo
    ADD CONSTRAINT tipos_cultivo_nombre_unico UNIQUE (nombre);

--
-- Name: tipos_cultivo tipos_cultivo_clave_primaria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_cultivo
    ADD CONSTRAINT tipos_cultivo_clave_primaria PRIMARY KEY (tipo_cultivo_id);

--
-- Name: usuarios usuarios_ci_nit_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_ci_nit_unico UNIQUE (ci_nit);

--
-- Name: usuarios usuarios_correo_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_unico UNIQUE (correo);

--
-- Name: usuarios usuarios_clave_primaria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_clave_primaria PRIMARY KEY (usuario_id);

--
-- Name: indice_lecturas_lote_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indice_lecturas_lote_fecha ON public.lecturas_suelo USING btree (lote_id, fecha_captura DESC);

--
-- Name: indice_parcelas_geometria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indice_parcelas_geometria ON public.parcelas USING gist (geometria);

--
-- Name: reportes referencia_lectura_reporte; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT referencia_lectura_reporte FOREIGN KEY (lectura_id) REFERENCES public.lecturas_suelo(lectura_id);

--
-- Name: lecturas_suelo referencia_lote_lectura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturas_suelo
    ADD CONSTRAINT referencia_lote_lectura FOREIGN KEY (lote_id) REFERENCES public.lotes(lote_id) ON DELETE CASCADE;

--
-- Name: reportes referencia_lote_reporte; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT referencia_lote_reporte FOREIGN KEY (lote_id) REFERENCES public.lotes(lote_id) ON DELETE CASCADE;

--
-- Name: lotes referencia_parcela; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT referencia_parcela FOREIGN KEY (parcela_id) REFERENCES public.parcelas(parcela_id) ON DELETE CASCADE;

--
-- Name: parcelas referencia_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT referencia_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id) ON DELETE CASCADE;

--
-- Name: parcelas parcelas_tipo_cultivo_id_referencia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_tipo_cultivo_id_referencia FOREIGN KEY (tipo_cultivo_id) REFERENCES public.tipos_cultivo(tipo_cultivo_id);

--
