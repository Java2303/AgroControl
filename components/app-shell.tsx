'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useTheme } from 'next-themes'
import { useApp } from '@/lib/app-context'
import { Navigation } from '@/components/layout/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { MapView } from '@/components/map/map-view'
import { ParcelsView } from '@/components/parcels/parcels-view'
import { SensorsView } from '@/components/sensors/sensors-view'
import { SettingsView } from '@/components/settings/settings-view'
import { HistoryView } from '@/components/history/history-view'

export function AppShell() {
  const { state } = useApp()
  const { resolvedTheme } = useTheme()
  const [desplazado, setDesplazado] = useState(false)

  // App Android: la web se dibuja debajo de la barra de estado (hora, batería) para que tome el color de la app
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
    // Íconos claros sobre el login azul y en modo oscuro; oscuros sobre el fondo claro de la app
    StatusBar.setStyle({ style: state.isAuthenticated && resolvedTheme !== 'dark' ? Style.Light : Style.Dark }).catch(() => {})
  }, [state.isAuthenticated, resolvedTheme])

  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > 8)
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => window.removeEventListener('scroll', alDesplazar)
  }, [])

  // Auth screens
  if (!state.isAuthenticated) {
    if (state.currentView === 'register') {
      return <RegisterForm />
    }
    return <LoginForm />
  }

  // Main app with navigation - Surface container low as main canvas
  return (
    <div className="min-h-screen bg-surface-low">
      <Navigation />
      {/* Franja detrás de la barra de estado: del color del fondo y translúcida al desplazarse */}
      <div
        aria-hidden
        className={`md:hidden fixed top-0 inset-x-0 z-50 h-[env(safe-area-inset-top)] transition-colors duration-300 ${desplazado ? 'bg-surface-low/70 backdrop-blur-md' : 'bg-surface-low'}`}
      />
      
      {/* Main Content - Editorial spacing */}
      <main className="md:ml-64 min-h-screen pt-[env(safe-area-inset-top)] md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
          {state.currentView === 'dashboard' && <DashboardView />}
          {state.currentView === 'map' && <MapView />}
          {state.currentView === 'parcels' && <ParcelsView />}
          {state.currentView === 'sensors' && <SensorsView />}
          {state.currentView === 'history' && <HistoryView />}
          {state.currentView === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  )
}
