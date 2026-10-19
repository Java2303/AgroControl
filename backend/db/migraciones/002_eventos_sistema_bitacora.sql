-- Eventos automáticos en la bitácora: registro de la parcela y cada edición de sus datos.
-- Idempotente: se puede ejecutar varias veces (npm run db:init).

-- Datos del evento: foto de la parcela al registrarse o los cambios (antes / después) de una edición
ALTER TABLE public.actividades_parcela ADD COLUMN IF NOT EXISTS detalle jsonb;

ALTER TABLE public.actividades_parcela DROP CONSTRAINT IF EXISTS actividad_tipo_valido;
ALTER TABLE public.actividades_parcela ADD CONSTRAINT actividad_tipo_valido CHECK (tipo IN (
    'siembra', 'fertilizacion', 'encalado', 'riego', 'fitosanitario', 'muestreo', 'cosecha', 'otra',
    'registro_parcela', 'edicion_parcela'
));

-- Los eventos del sistema son hechos, no anotaciones: no se pueden anular
ALTER TABLE public.actividades_parcela DROP CONSTRAINT IF EXISTS actividad_evento_no_anulable;
ALTER TABLE public.actividades_parcela ADD CONSTRAINT actividad_evento_no_anulable CHECK (
    tipo NOT IN ('registro_parcela', 'edicion_parcela') OR anulada = false
);

-- Parcelas creadas antes de esta migración: se reconstruye su evento de registro con la fecha real de
-- creación y los datos actuales (se marca como reconstruido porque no se conocen ediciones previas)
INSERT INTO public.actividades_parcela (parcela_id, usuario_id, tipo, fecha, descripcion, detalle, fecha_registro)
SELECT
    p.parcela_id,
    p.usuario_id,
    'registro_parcela',
    GREATEST((COALESCE(p.fecha_creacion, CURRENT_TIMESTAMP) AT TIME ZONE 'America/La_Paz')::date, DATE '2000-01-01'),
    'Registro reconstruido con los datos de la parcela al habilitarse la bitácora.',
    jsonb_build_object(
        'nombre', p.nombre,
        'cultivo', tc.nombre,
        'tipo_cultivo_id', p.tipo_cultivo_id,
        'area_ha', p.area_hectareas,
        'ubicacion', p.ubicacion_nombre,
        'lote_ha', LEAST(p.area_hectareas, 15),
        'reconstruido', true
    ),
    COALESCE(p.fecha_creacion, CURRENT_TIMESTAMP)
FROM public.parcelas p
LEFT JOIN public.tipos_cultivo tc ON tc.tipo_cultivo_id = p.tipo_cultivo_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.actividades_parcela a
    WHERE a.parcela_id = p.parcela_id AND a.tipo = 'registro_parcela'
);
