import type { Metadata, Viewport } from 'next'
import { Manrope, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AGRO CONTROL - Plataforma de Gestión Agrícola Inteligente',
  description: 'Sistema integral de gestión agrícola con monitoreo IoT, mapeo de parcelas y análisis de cultivos en tiempo real.',
  // El ícono se toma de app/icon.svg (convención de archivos de Next.js)
}

export const viewport: Viewport = {
  themeColor: '#002147',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        />
      </head>
      <body className="font-sans antialiased bg-background">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="agro-control-tema">
          {children}
          {/* Avisos de éxito (✓) y error (✗); bajo la barra de estado en la app Android */}
          <Toaster position="top-center" richColors closeButton offset="calc(env(safe-area-inset-top) + 16px)" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
