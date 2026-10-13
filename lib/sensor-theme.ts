import type { SensorReading, SoilStatus } from '@/lib/types'

export type SensorType = SensorReading['type']

interface SensorTheme {
  label: string
  shortLabel: string
  icon: string
  unit: string
  min: number
  max: number
  optimal: { min: number; max: number }
  /** Color principal (icono, gráfico) y fondo suave. En hex porque Recharts los usa como atributos SVG. */
  color: string
  soft: string
}

// Rangos alineados con sensoresController.js (backend)
export const SENSOR_THEME: Record<SensorType, SensorTheme> = {
  humidity: {
    label: 'Humedad del Suelo', shortLabel: 'Humedad', icon: 'water_drop', unit: '%',
    min: 0, max: 100, optimal: { min: 40, max: 70 },
    color: '#005293', soft: '#e3eef8',
  },
  temperature: {
    label: 'Temperatura', shortLabel: 'Temperatura', icon: 'thermostat', unit: '°C',
    min: 0, max: 50, optimal: { min: 18, max: 28 },
    color: '#d9480f', soft: '#fdebe1',
  },
  ph: {
    label: 'pH del Suelo', shortLabel: 'pH', icon: 'science', unit: '',
    min: 0, max: 14, optimal: { min: 6, max: 7.5 },
    color: '#6741d9', soft: '#eee9fb',
  },
  nitrogen: {
    label: 'Nitrógeno (N)', shortLabel: 'Nitrógeno', icon: 'eco', unit: 'ppm',
    min: 0, max: 200, optimal: { min: 80, max: 150 },
    color: '#2b8412', soft: '#e9f5e4',
  },
}

// Azul CIAT para agua, naranja para calor, violeta para química del suelo, verde CIAT para nutrientes
export const SENSOR_TYPES = Object.keys(SENSOR_THEME) as SensorType[]

export const STATUS_LABEL: Record<SoilStatus, string> = {
  optimo: 'Óptimo',
  alerta: 'Alerta',
  critico: 'Crítico',
}

export const STATUS_CHIP: Record<SoilStatus, string> = {
  optimo: 'bg-[var(--tertiary-container)] text-[var(--tertiary)]',
  alerta: 'bg-warning-container text-[var(--warning)]',
  critico: 'bg-error-container text-[var(--error)]',
}

const PRIORIDAD: Record<SoilStatus, number> = { optimo: 0, alerta: 1, critico: 2 }

/** Devuelve el estado más grave de una lista (crítico > alerta > óptimo). */
export function peorEstado(estados: SoilStatus[]): SoilStatus {
  return estados.reduce<SoilStatus>((peor, e) => (PRIORIDAD[e] > PRIORIDAD[peor] ? e : peor), 'optimo')
}

/** Estado del suelo de cada parcela según la peor de sus lecturas actuales. */
export function estadosPorParcela(readings: SensorReading[]): Record<string, SoilStatus> {
  const resultado: Record<string, SoilStatus> = {}
  for (const r of readings) {
    resultado[r.parcelId] = peorEstado([resultado[r.parcelId] ?? 'optimo', r.status])
  }
  return resultado
}

/** Colores de los macronutrientes en el análisis NPK */
export const NPK_THEME = {
  nitrogeno: { label: 'Nitrógeno (N)', color: '#2b8412', optimal: { min: 80, max: 150 }, max: 200 },
  fosforo: { label: 'Fósforo (P)', color: '#c2255c', optimal: { min: 40, max: 80 }, max: 120 },
  potasio: { label: 'Potasio (K)', color: '#0b7285', optimal: { min: 100, max: 200 }, max: 250 },
} as const
