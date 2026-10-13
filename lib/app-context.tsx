'use client'

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import type { User, Parcel, Sensor, ViewType, AppState } from './types'
import { SESSION_EXPIRED_EVENT } from './api-client'

type Action =
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_PARCELS'; payload: Parcel[] }
  | { type: 'SET_SENSORS'; payload: Sensor[] }
  | { type: 'LOAD_SESSION'; payload: { user: User } }
  | { type: 'FOCUS_PARCEL_ON_MAP'; payload: string | null }

const initialState: AppState = {
  currentView: 'login',
  user: null,
  parcels: [],
  sensors: [],
  isAuthenticated: false,
  mapFocusId: null,
}

// Lee la fecha de expiración (exp, en segundos) del JWT. La firma la valida el backend.
function obtenerExpiracionToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      // Al salir del mapa se olvida la parcela enfocada
      return { ...state, currentView: action.payload, mapFocusId: action.payload === 'map' ? state.mapFocusId : null }
    case 'LOGIN':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: true, 
        currentView: 'dashboard' 
      }
    case 'LOGOUT':
      return { ...initialState, user: null, isAuthenticated: false, currentView: 'login' }
    case 'SET_PARCELS':
      return { ...state, parcels: action.payload }
    case 'SET_SENSORS':
      return { ...state, sensors: action.payload }
    case 'FOCUS_PARCEL_ON_MAP':
      return { ...state, mapFocusId: action.payload, currentView: action.payload ? 'map' : state.currentView }
    case 'LOAD_SESSION':
      return { 
        ...state, 
        user: action.payload.user, 
        isAuthenticated: true,
        currentView: 'dashboard'
      }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  navigate: (view: ViewType) => void
  login: (user: User) => void
  logout: () => void
  setParcels: (parcels: Parcel[]) => void
  setSensors: (sensors: Sensor[]) => void
  focusParcelOnMap: (parcelId: string | null) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // 🔐 Recuperar Sesión: Al arrancar, buscamos solo el Token/Usuario
  useEffect(() => {
    const savedUser = localStorage.getItem('agro-control-user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        const expiracion = user?.token ? obtenerExpiracionToken(user.token) : null
        // Se descartan sesiones sin token, sin fecha de expiración (p. ej. el antiguo token demo) o vencidas
        if (expiracion && expiracion > Date.now()) {
          dispatch({ type: 'LOAD_SESSION', payload: { user } })
        } else {
          localStorage.removeItem('agro-control-user')
        }
      } catch (e) {
        localStorage.removeItem('agro-control-user')
      }
    }
  }, [])

  // 🚪 La API respondió 401 (token vencido o inválido): volver al login
  useEffect(() => {
    const alExpirar = () => {
      localStorage.removeItem('agro-control-user')
      dispatch({ type: 'LOGOUT' })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, alExpirar)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, alExpirar)
  }, [])

  // ⏱️ Cierre automático de sesión cuando el JWT expira (8 h)
  useEffect(() => {
    if (!state.isAuthenticated || !state.user?.token) return
    const expiracion = obtenerExpiracionToken(state.user.token)
    if (!expiracion) return
    const timer = setTimeout(() => {
      localStorage.removeItem('agro-control-user')
      dispatch({ type: 'LOGOUT' })
    }, Math.max(expiracion - Date.now(), 0))
    return () => clearTimeout(timer)
  }, [state.isAuthenticated, state.user])

  // 💾 Persistencia Selectiva: Solo guardamos la sesión del usuario/token
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      localStorage.setItem('agro-control-user', JSON.stringify(state.user))
    }
  }, [state.isAuthenticated, state.user])

  const navigate = (view: ViewType) => dispatch({ type: 'SET_VIEW', payload: view })
  const login = (user: User) => {
    // Se guarda antes de cambiar de vista: los efectos de las vistas (hijas) corren antes que los
    // de este proveedor, y sus primeras peticiones ya necesitan leer el token de localStorage
    localStorage.setItem('agro-control-user', JSON.stringify(user))
    dispatch({ type: 'LOGIN', payload: user })
  }
  
  const logout = () => {
    localStorage.removeItem('agro-control-user')
    dispatch({ type: 'LOGOUT' })
  }

  const setParcels = useCallback((parcels: Parcel[]) => dispatch({ type: 'SET_PARCELS', payload: parcels }), [])
  const setSensors = (sensors: Sensor[]) => dispatch({ type: 'SET_SENSORS', payload: sensors })
  const focusParcelOnMap = useCallback(
    (parcelId: string | null) => dispatch({ type: 'FOCUS_PARCEL_ON_MAP', payload: parcelId }),
    []
  )

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        navigate,
        login,
        logout,
        setParcels,
        setSensors,
        focusParcelOnMap,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within an AppProvider')
  return context
}