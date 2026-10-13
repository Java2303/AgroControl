import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'bo.ciat.agrocontrol',
  appName: 'Agro Control',
  // Salida de "next build" con BUILD_TARGET=mobile (output: 'export')
  webDir: 'out',
  server: {
    // La API se publica con HTTPS (Render), así que la app no necesita tráfico sin cifrar.
    // El origen de la app es https://localhost, que debe figurar en CORS_ORIGINS del backend.
    androidScheme: 'https',
  },
}

export default config
