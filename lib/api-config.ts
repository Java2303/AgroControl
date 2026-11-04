// URL base de la API REST de Agro Control.
// En la web local se usa localhost; en la app móvil (Capacitor) el dispositivo
// no puede resolver "localhost" del servidor, por lo que se define
// NEXT_PUBLIC_API_URL al compilar (ej. http://192.168.1.50:4000/api o la URL del VPS).
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// Dirección pública de la web: la que se imprime en el certificado para verificarlo.
// En la app móvil el origen es https://localhost, que no sirve fuera del teléfono.
export const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://agro-control-theta.vercel.app'
