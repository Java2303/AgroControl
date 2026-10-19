'use client'

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
      
      {/* Main Content - Editorial spacing */}
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
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
