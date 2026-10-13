import { API_URL } from '@/lib/api-config'

// Evento global que AppProvider escucha para cerrar la sesión cuando la API responde 401
export const SESSION_EXPIRED_EVENT = 'agro-control:session-expired'

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

function obtenerToken(): string | null {
  try {
    const sessionData = localStorage.getItem('agro-control-user')
    return sessionData ? JSON.parse(sessionData).token ?? null : null
  } catch {
    return null
  }
}

/**
 * fetch autenticado contra la API REST de Agro Control.
 * Agrega el JWT, interpreta la respuesta JSON y lanza ApiError si falla.
 */
export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = obtenerToken()
  // Sin token no hay sesión que cerrar: solo se informa el error. El cierre de sesión
  // automático queda reservado para cuando la API rechaza un token (401).
  if (!token) {
    throw new ApiError('No hay una sesión activa.', 401)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    throw new ApiError('Tu sesión ha expirado. Inicia sesión nuevamente.', 401)
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(body.message || 'Error al comunicarse con el servidor.', response.status)
  }
  return body as T
}
