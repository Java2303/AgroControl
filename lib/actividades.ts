// Catálogo de labores agrícolas de la bitácora de cada parcela.
// Los tipos y unidades coinciden con backend/src/utils/actividades.js y con la tabla actividades_parcela.

/** Labores que el agrónomo registra a mano */
export type TipoLabor =
  | 'siembra' | 'fertilizacion' | 'encalado' | 'riego' | 'fitosanitario' | 'muestreo' | 'cosecha' | 'otra'

/** Eventos que el sistema registra solo al crear o editar la parcela (no se anulan) */
export type TipoEventoSistema = 'registro_parcela' | 'edicion_parcela'

export type TipoActividad = TipoLabor | TipoEventoSistema

export const EVENTOS_SISTEMA: TipoEventoSistema[] = ['registro_parcela', 'edicion_parcela']
export const esEventoSistema = (tipo: TipoActividad): tipo is TipoEventoSistema =>
  (EVENTOS_SISTEMA as TipoActividad[]).includes(tipo)

export const UNIDADES = ['kg/ha', 'L/ha', 't/ha', 'qq/ha', 'mm', 'kg', 'L', 't', 'qq', 'unidades'] as const
export type Unidad = (typeof UNIDADES)[number]

interface TemaActividad {
  label: string
  icon: string
  /** Color del ícono (hex) y fondo suave */
  color: string
  soft: string
  /** Etiqueta del campo producto; null si la labor no usa producto */
  producto: string | null
  /** Unidad sugerida al elegir el tipo; null si no se registra cantidad */
  unidad: Unidad | null
  /** Etiqueta del campo cantidad */
  cantidad: string
}

export const TIPOS_ACTIVIDAD: Record<TipoActividad, TemaActividad> = {
  siembra:       { label: 'Siembra',        icon: 'psychiatry',   color: '#2b8412', soft: '#e9f5e4', producto: 'Variedad o semilla',   unidad: 'kg/ha', cantidad: 'Densidad de siembra' },
  fertilizacion: { label: 'Fertilización',  icon: 'compost',      color: '#0b7285', soft: '#e0f1f4', producto: 'Fertilizante',          unidad: 'kg/ha', cantidad: 'Dosis' },
  encalado:      { label: 'Encalado',       icon: 'layers',       color: '#6741d9', soft: '#eee9fb', producto: 'Enmienda',              unidad: 't/ha',  cantidad: 'Dosis' },
  riego:         { label: 'Riego',          icon: 'water_drop',   color: '#005293', soft: '#e3eef8', producto: null,                    unidad: 'mm',    cantidad: 'Lámina aplicada' },
  fitosanitario: { label: 'Control fitosanitario', icon: 'pest_control', color: '#d9480f', soft: '#fdebe1', producto: 'Producto aplicado', unidad: 'L/ha', cantidad: 'Dosis' },
  muestreo:      { label: 'Muestreo de suelo', icon: 'labs',      color: '#46607a', soft: '#e6edf3', producto: null,                    unidad: null,    cantidad: 'Cantidad' },
  cosecha:       { label: 'Cosecha',        icon: 'agriculture',  color: '#b35c00', soft: '#fff1e0', producto: null,                    unidad: 't/ha',  cantidad: 'Rendimiento' },
  otra:          { label: 'Otra labor',     icon: 'more_horiz',   color: '#495057', soft: '#eef0f2', producto: null,                    unidad: null,    cantidad: 'Cantidad' },
  registro_parcela: { label: 'Parcela registrada', icon: 'add_location_alt', color: '#002147', soft: '#e3eef8', producto: null, unidad: null, cantidad: 'Cantidad' },
  edicion_parcela:  { label: 'Parcela editada',    icon: 'edit_note',        color: '#46607a', soft: '#e6edf3', producto: null, unidad: null, cantidad: 'Cantidad' },
}

/** Tipos que se ofrecen en el formulario (las labores manuales) */
export const ORDEN_TIPOS: TipoLabor[] = ['siembra', 'fertilizacion', 'encalado', 'riego', 'fitosanitario', 'muestreo', 'cosecha', 'otra']

export interface CambioParcela {
  campo: string
  etiqueta: string
  antes: string | null
  despues: string | null
}

/** Datos guardados con los eventos del sistema */
export interface DetalleEvento {
  // registro_parcela: foto de la parcela al registrarse
  nombre?: string
  cultivo?: string | null
  area_ha?: number
  ubicacion?: string | null
  lote_ha?: number
  reconstruido?: boolean
  // edicion_parcela: cambios realizados
  cambios?: CambioParcela[]
}

export interface Actividad {
  id: string
  parcelId: string
  tipo: TipoActividad
  fecha: string // AAAA-MM-DD
  producto: string | null
  cantidad: number | null
  unidad: Unidad | null
  descripcion: string | null
  detalle: DetalleEvento | null
  anulada: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
  fechaRegistro: string
  registradoPor: string
  anuladaPor: string | null
}

/** Convierte AAAA-MM-DD a una fecha local (sin desfase de zona horaria). */
export function fechaLocal(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** Fecha de hoy en formato AAAA-MM-DD según el reloj del dispositivo. */
export function hoyISO(): string {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
}

export type EstadoCiclo =
  | { tipo: 'sin-siembra' }
  | { tipo: 'en-cultivo'; siembra: Actividad; dias: number }
  | { tipo: 'cosechado'; siembra: Actividad | null; cosecha: Actividad; dias: number | null }

/** Estado del ciclo del cultivo según la última siembra y la última cosecha vigentes. */
export function estadoCiclo(actividades: Actividad[]): EstadoCiclo {
  const vigentes = actividades.filter((a) => !a.anulada)
  const ultima = (tipo: TipoActividad) =>
    vigentes.filter((a) => a.tipo === tipo).sort((x, y) => y.fecha.localeCompare(x.fecha))[0] ?? null
  const siembra = ultima('siembra')
  const cosecha = ultima('cosecha')
  const dias = (desde: string, hasta: Date) => Math.round((hasta.getTime() - fechaLocal(desde).getTime()) / 86400000)

  if (cosecha && (!siembra || cosecha.fecha >= siembra.fecha)) {
    return { tipo: 'cosechado', siembra, cosecha, dias: siembra ? dias(siembra.fecha, fechaLocal(cosecha.fecha)) : null }
  }
  if (siembra) return { tipo: 'en-cultivo', siembra, dias: dias(siembra.fecha, new Date()) }
  return { tipo: 'sin-siembra' }
}
