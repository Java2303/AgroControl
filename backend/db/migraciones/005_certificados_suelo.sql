-- Certificado de suelo (RF-18, RN-14): la tabla reportes guarda cada certificado emitido.
-- El campo detalle conserva la foto de la lectura, la interpretación y los datos de la parcela
-- al momento de emitirlo, para que el certificado no cambie si después se edita la parcela.
-- Idempotente: se puede ejecutar varias veces (npm run db:init).

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'reportes' AND column_name = 'recomendacion_ia') THEN
        ALTER TABLE public.reportes RENAME COLUMN recomendacion_ia TO recomendacion;
    END IF;
END $$;

ALTER TABLE public.reportes ADD COLUMN IF NOT EXISTS diagnostico text;
ALTER TABLE public.reportes ADD COLUMN IF NOT EXISTS detalle jsonb;
ALTER TABLE public.reportes ADD COLUMN IF NOT EXISTS emitido_por uuid REFERENCES public.usuarios(usuario_id);

CREATE INDEX IF NOT EXISTS idx_reportes_lote_fecha ON public.reportes USING btree (lote_id, fecha_generacion DESC);

COMMENT ON TABLE public.reportes IS 'Certificados de suelo emitidos a partir de una lectura y del motor de reglas del CIAT.';
