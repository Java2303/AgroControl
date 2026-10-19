-- Baja lógica de parcelas: en lugar de eliminarse, se marcan como dadas de baja con un motivo.
-- Su bitácora, lotes y lecturas se conservan para el historial del CIAT.
-- Idempotente: se puede ejecutar varias veces (npm run db:init).

ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true NOT NULL;
ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS fecha_baja timestamp with time zone;
ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS motivo_baja character varying(30);
ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS observacion_baja text;
ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS baja_por uuid REFERENCES public.usuarios(usuario_id);

ALTER TABLE public.parcelas DROP CONSTRAINT IF EXISTS parcela_baja_completa;
ALTER TABLE public.parcelas ADD CONSTRAINT parcela_baja_completa CHECK (
    activa = true OR (fecha_baja IS NOT NULL AND motivo_baja IS NOT NULL AND baja_por IS NOT NULL)
);

ALTER TABLE public.parcelas DROP CONSTRAINT IF EXISTS parcela_motivo_baja_valido;
ALTER TABLE public.parcelas ADD CONSTRAINT parcela_motivo_baja_valido CHECK (
    motivo_baja IS NULL OR motivo_baja IN ('terreno_cerrado', 'fin_campania', 'venta_cesion', 'error_registro', 'otro')
);

CREATE INDEX IF NOT EXISTS idx_parcelas_usuario_activa ON public.parcelas USING btree (usuario_id, activa);

-- Nuevo evento automático de la bitácora
ALTER TABLE public.actividades_parcela DROP CONSTRAINT IF EXISTS actividad_tipo_valido;
ALTER TABLE public.actividades_parcela ADD CONSTRAINT actividad_tipo_valido CHECK (tipo IN (
    'siembra', 'fertilizacion', 'encalado', 'riego', 'fitosanitario', 'muestreo', 'cosecha', 'otra',
    'registro_parcela', 'edicion_parcela', 'baja_parcela'
));

ALTER TABLE public.actividades_parcela DROP CONSTRAINT IF EXISTS actividad_evento_no_anulable;
ALTER TABLE public.actividades_parcela ADD CONSTRAINT actividad_evento_no_anulable CHECK (
    tipo NOT IN ('registro_parcela', 'edicion_parcela', 'baja_parcela') OR anulada = false
);
