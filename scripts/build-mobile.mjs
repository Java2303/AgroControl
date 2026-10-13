// Compila la interfaz como sitio estático (/out) y la sincroniza con el proyecto Android de Capacitor.
// Uso: NEXT_PUBLIC_API_URL=http://<ip-del-servidor>:4000/api npm run build:mobile
import { execSync } from 'node:child_process'

const env = { ...process.env, BUILD_TARGET: 'mobile' }

if (!env.NEXT_PUBLIC_API_URL) {
  console.warn('[build:mobile] NEXT_PUBLIC_API_URL no definida: la app usará http://localhost:4000/api, que no es accesible desde el teléfono.')
}

execSync('npx next build', { stdio: 'inherit', env })
execSync('npx cap sync android', { stdio: 'inherit', env })
