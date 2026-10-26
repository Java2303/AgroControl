export interface User {
  id: string
  name: string
  email: string
  ci_nit: string
  phone?: string
  userType: 'agronomo' | 'productor' | 'admin_ciat'
  token: string
}

export type SoilStatus = 'optimo' | 'alerta' | 'critico'

export interface Parcel {
  id: string
  name: string
  cropType: string
  area: number // Máximo 50 ha. según requerimiento del CIAT
  soilStatus: SoilStatus
  ubicacion_nombre?: string
  coordinates?: MapPoint[]
  createdAt?: string
  /** MAC del nodo ESP32 vinculado; null si la parcela usa el simulador */
  sensorMac?: string | null
  sensorUltimaLectura?: string | null
}

/** Lectura actual de un sensor tal como la entrega GET /api/sensores */
export interface SensorReading {
  id: string
  parcelId: string
  parcelName: string
  type: 'humidity' | 'temperature' | 'ph' | 'nitrogen'
  value: number
  unit: string
  status: SoilStatus
  lastUpdate: Date
  history: number[]
}

/** Promedio de macronutrientes de las últimas lecturas (ppm) */
export interface ResumenNPK {
  nitrogeno: number | null
  fosforo: number | null
  potasio: number | null
}

// Actualicemos los tipos para reflejar el hardware real[cite: 1]
export type SensorReadingType = 
  | 'nitrogen' | 'phosphorus' | 'potassium' 
  | 'ph' | 'humidity' | 'temperature' | 'conductivity'

export interface Sensor {
  id: string
  parcelId: string
  type: SensorReadingType
  value: number
  status: 'optimo' | 'alerta' | 'critico'
  lastUpdate: string
}

export interface SensorData {
  humidity: number
  temperature: number
  ph: number
  nitrogen: number
}

export interface MapPoint {
  lat: number
  lng: number
}

export type ViewType = 'login' | 'register' | 'dashboard' | 'map' | 'parcels' | 'sensors' | 'history' | 'settings'

/** Nombre visible de cada rol */
export const ROL_LABEL: Record<User['userType'], string> = {
  agronomo: 'Ingeniero Agrónomo',
  productor: 'Productor',
  admin_ciat: 'Administrador CIAT',
}

export interface AppState {
  currentView: ViewType
  user: User | null
  parcels: Parcel[]
  sensors: Sensor[]
  isAuthenticated: boolean
  /** Parcela a enfocar al abrir el mapa (desde "Ver en Mapa") */
  mapFocusId: string | null
}
