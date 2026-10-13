/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.BUILD_TARGET === 'mobile'

const nextConfig = {
  // La app móvil (Capacitor) empaqueta archivos estáticos: se exporta a /out
  ...(isMobileBuild ? { output: 'export', trailingSlash: true } : {}),
  images: {
    unoptimized: true,
  },
  // Oculta el botón flotante "N" de Next.js en desarrollo (en producción nunca aparece)
  devIndicators: false,
}

export default nextConfig
