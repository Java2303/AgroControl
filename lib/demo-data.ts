import type { Parcel } from './types'

export interface DemoParcel {
  id: string
  name: string
  cropType: string
  ubicacion_nombre: string
  area: number
  soilStatus: 'optimo' | 'alerta' | 'critico'
  coordinates: { lat: number; lng: number }[]
  createdAt: string
}

export const DEMO_PARCELS: DemoParcel[] = [
  {
    id: 'p-1',
    name: 'Lote Soya Norte CIAT',
    cropType: '1', // Soya
    ubicacion_nombre: 'Estación Saavedra (Montero)',
    area: 8.50,
    soilStatus: 'optimo',
    coordinates: [
      { lat: -17.2350, lng: -63.2150 },
      { lat: -17.2350, lng: -63.2120 },
      { lat: -17.2380, lng: -63.2120 },
      { lat: -17.2380, lng: -63.2150 },
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-2',
    name: 'Parcela Maíz Híbrido CIAT',
    cropType: '2', // Maíz
    ubicacion_nombre: 'Warnes - Zona Norte Integrada',
    area: 6.20,
    soilStatus: 'optimo',
    coordinates: [
      { lat: -17.5130, lng: -63.1620 },
      { lat: -17.5130, lng: -63.1590 },
      { lat: -17.5160, lng: -63.1590 },
      { lat: -17.5160, lng: -63.1620 },
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-3',
    name: 'Campo Trigo Motacú',
    cropType: '3', // Trigo
    ubicacion_nombre: 'Colonia Okinawa / San Pedro',
    area: 11.40,
    soilStatus: 'alerta',
    coordinates: [
      { lat: -17.2120, lng: -62.8880 },
      { lat: -17.2120, lng: -62.8840 },
      { lat: -17.2160, lng: -62.8840 },
      { lat: -17.2160, lng: -62.8880 },
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-4',
    name: 'Cañaveral Guabirá Lote 4',
    cropType: '7', // Caña
    ubicacion_nombre: 'Mineros - Portachuelo',
    area: 14.80,
    soilStatus: 'optimo',
    coordinates: [
      { lat: -17.1180, lng: -63.2280 },
      { lat: -17.1180, lng: -63.2230 },
      { lat: -17.1230, lng: -63.2230 },
      { lat: -17.1230, lng: -63.2280 },
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-5',
    name: 'Girasol Invierno Sector Este',
    cropType: '5', // Girasol
    ubicacion_nombre: 'Cuatro Cañadas - Pailón',
    area: 7.60,
    soilStatus: 'optimo',
    coordinates: [
      { lat: -17.2720, lng: -62.5580 },
      { lat: -17.2720, lng: -62.5550 },
      { lat: -17.2760, lng: -62.5550 },
      { lat: -17.2760, lng: -62.5580 },
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-6',
    name: 'Finca Sorgo Granífero',
    cropType: '6', // Sorgo
    ubicacion_nombre: 'Cotoca - Santa Cruz',
    area: 9.30,
    soilStatus: 'optimo',
    coordinates: [
      { lat: -17.7570, lng: -63.0580 },
      { lat: -17.7570, lng: -63.0540 },
      { lat: -17.7610, lng: -63.0540 },
      { lat: -17.7610, lng: -63.0580 },
    ],
    createdAt: new Date().toISOString()
  }
]

export const DEMO_SENSORS = [
  {
    id: 's-1',
    parcelId: 'p-1',
    parcelName: 'Lote Soya Norte CIAT',
    type: 'humidity' as const,
    value: 68.4,
    unit: '%',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [62, 64, 65, 66, 68, 67, 69, 68.4]
  },
  {
    id: 's-2',
    parcelId: 'p-1',
    parcelName: 'Lote Soya Norte CIAT',
    type: 'temperature' as const,
    value: 24.5,
    unit: '°C',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [21, 22, 23, 25, 26, 25, 24, 24.5]
  },
  {
    id: 's-3',
    parcelId: 'p-1',
    parcelName: 'Lote Soya Norte CIAT',
    type: 'ph' as const,
    value: 6.8,
    unit: '',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [6.7, 6.7, 6.8, 6.8, 6.9, 6.8, 6.8]
  },
  {
    id: 's-4',
    parcelId: 'p-1',
    parcelName: 'Lote Soya Norte CIAT',
    type: 'nitrogen' as const,
    value: 125,
    unit: 'ppm',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [110, 115, 118, 120, 122, 124, 125]
  },
  {
    id: 's-5',
    parcelId: 'p-2',
    parcelName: 'Parcela Maíz Híbrido CIAT',
    type: 'humidity' as const,
    value: 58.2,
    unit: '%',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [52, 54, 55, 56, 57, 58, 58.2]
  },
  {
    id: 's-6',
    parcelId: 'p-2',
    parcelName: 'Parcela Maíz Híbrido CIAT',
    type: 'temperature' as const,
    value: 26.1,
    unit: '°C',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [23, 24, 25, 26, 27, 26.5, 26.1]
  },
  {
    id: 's-7',
    parcelId: 'p-3',
    parcelName: 'Campo Trigo Motacú',
    type: 'humidity' as const,
    value: 36.8,
    unit: '%',
    status: 'alerta' as const,
    lastUpdate: new Date(),
    history: [45, 42, 40, 38, 37, 36.8]
  },
  {
    id: 's-8',
    parcelId: 'p-3',
    parcelName: 'Campo Trigo Motacú',
    type: 'ph' as const,
    value: 5.9,
    unit: '',
    status: 'alerta' as const,
    lastUpdate: new Date(),
    history: [6.1, 6.0, 5.9, 5.9, 5.9]
  },
  {
    id: 's-9',
    parcelId: 'p-4',
    parcelName: 'Cañaveral Guabirá Lote 4',
    type: 'humidity' as const,
    value: 72.0,
    unit: '%',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [65, 68, 70, 71, 72, 72]
  },
  {
    id: 's-10',
    parcelId: 'p-4',
    parcelName: 'Cañaveral Guabirá Lote 4',
    type: 'nitrogen' as const,
    value: 140,
    unit: 'ppm',
    status: 'optimo' as const,
    lastUpdate: new Date(),
    history: [130, 132, 135, 138, 140]
  }
]

export const DEMO_RECOMMENDATIONS = [
  {
    text: 'Humedad óptima en Lote Soya Norte y Cañaveral Guabirá. Mantener programa de riego actual.',
    icon: 'water',
    priority: 'success'
  },
  {
    text: 'Humedad baja detectada en Campo Trigo Motacú (36.8%). Programar riego suplementario.',
    icon: 'warning',
    priority: 'warning'
  },
  {
    text: 'Recomendación CIAT: Planificar rotación con Sorgo o Girasol para la campaña de invierno.',
    icon: 'eco',
    priority: 'info'
  }
]
