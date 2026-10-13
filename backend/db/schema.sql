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
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
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
    geom public.geometry(Polygon,4326) NOT NULL,
    area_hectareas numeric(10,2) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_cultivo_id integer,
    CONSTRAINT limite_superficie CHECK ((public.st_area((geom)::public.geography) <= (500000)::double precision))
);

--
-- Name: COLUMN parcelas.geom; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parcelas.geom IS 'Almacena el polígono georreferenciado de la parcela dibujada por el agrónomo.';

--
-- Name: reportes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reportes (
    reporte_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lote_id uuid NOT NULL,
    lectura_id uuid NOT NULL,
    calificacion_global character varying(50),
    nivel_confianza numeric(5,2),
    recomendacion_ia text,
    fecha_generacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    codigo_verificacion character varying(20)
);

--
-- Name: TABLE reportes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reportes IS 'Almacena los informes técnicos generados tras procesar los datos IoT con el Motor de Reglas y la IA.';

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
-- Name: tipos_cultivo_tipo_cultivo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_cultivo_tipo_cultivo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: tipos_cultivo_tipo_cultivo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_cultivo_tipo_cultivo_id_seq OWNED BY public.tipos_cultivo.tipo_cultivo_id;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    usuario_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash text NOT NULL,
    rol public.user_role DEFAULT 'productor'::public.user_role NOT NULL,
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

ALTER TABLE ONLY public.tipos_cultivo ALTER COLUMN tipo_cultivo_id SET DEFAULT nextval('public.tipos_cultivo_tipo_cultivo_id_seq'::regclass);

--
-- Name: lecturas_suelo lecturas_suelo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturas_suelo
    ADD CONSTRAINT lecturas_suelo_pkey PRIMARY KEY (lectura_id);

--
-- Name: lotes lotes_dispositivo_mac_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_dispositivo_mac_key UNIQUE (dispositivo_mac);

--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (lote_id);

--
-- Name: parcelas parcelas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_pkey PRIMARY KEY (parcela_id);

--
-- Name: reportes reportes_codigo_verificacion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_codigo_verificacion_key UNIQUE (codigo_verificacion);

--
-- Name: reportes reportes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_pkey PRIMARY KEY (reporte_id);

--
-- Name: tipos_cultivo tipos_cultivo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_cultivo
    ADD CONSTRAINT tipos_cultivo_nombre_key UNIQUE (nombre);

--
-- Name: tipos_cultivo tipos_cultivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_cultivo
    ADD CONSTRAINT tipos_cultivo_pkey PRIMARY KEY (tipo_cultivo_id);

--
-- Name: usuarios usuarios_ci_nit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_ci_nit_key UNIQUE (ci_nit);

--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);

--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (usuario_id);

--
-- Name: idx_lecturas_lote_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lecturas_lote_fecha ON public.lecturas_suelo USING btree (lote_id, fecha_captura DESC);

--
-- Name: idx_parcelas_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parcelas_geom ON public.parcelas USING gist (geom);

--
-- Name: reportes fk_lectura_reporte; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT fk_lectura_reporte FOREIGN KEY (lectura_id) REFERENCES public.lecturas_suelo(lectura_id);

--
-- Name: lecturas_suelo fk_lote_lectura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturas_suelo
    ADD CONSTRAINT fk_lote_lectura FOREIGN KEY (lote_id) REFERENCES public.lotes(lote_id) ON DELETE CASCADE;

--
-- Name: reportes fk_lote_reporte; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT fk_lote_reporte FOREIGN KEY (lote_id) REFERENCES public.lotes(lote_id) ON DELETE CASCADE;

--
-- Name: lotes fk_parcela; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT fk_parcela FOREIGN KEY (parcela_id) REFERENCES public.parcelas(parcela_id) ON DELETE CASCADE;

--
-- Name: parcelas fk_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT fk_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id) ON DELETE CASCADE;

--
-- Name: parcelas parcelas_tipo_cultivo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_tipo_cultivo_id_fkey FOREIGN KEY (tipo_cultivo_id) REFERENCES public.tipos_cultivo(tipo_cultivo_id);

--
