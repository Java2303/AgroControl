'use client'

import { useApp } from '@/lib/app-context'
import type { ViewType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavItem {
  id: ViewType
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'map', label: 'Mapa', icon: 'map' },
  { id: 'parcels', label: 'Parcelas', icon: 'grid_view' },
  { id: 'sensors', label: 'Sensores', icon: 'sensors' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
]

export function Navigation() {
  const { state, navigate, logout } = useApp()

  return (
    <>
      {/* Desktop Sidebar - Dark surface with tonal sections */}
      <aside className="surface-dark hidden md:flex flex-col w-64 bg-[var(--primary)] text-[var(--on-primary)] h-screen fixed left-0 top-0 z-40">
        {/* Logo section */}
        <div className="p-6 bg-[var(--primary-container)]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--tertiary)] to-[var(--tertiary-fixed-dim)] flex items-center justify-center shadow-elevated">
              <span className="material-symbols-outlined text-[var(--on-tertiary-fixed)] text-xl">eco</span>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">AGRO CONTROL</h1>
              <p className="text-[var(--tertiary)]/70 text-xs font-medium">Gestión Inteligente</p>
            </div>
          </div>
        </div>

        {/* User Info - subtle tonal shift */}
        <div className="p-4 bg-[var(--primary-container)]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--tertiary)]/12 flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--tertiary)]">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{state.user?.name || 'Usuario'}</p>
              <p className="text-[var(--tertiary)]/70 text-xs font-medium">{state.user?.userType === 'productor' ? 'Productor' : 'Ingeniero Agrónomo'}</p>
            </div>
          </div>
        </div>

        {/* Navigation - no borders, use spacing */}
        <nav className="flex-1 p-4">
          <div className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-smooth font-medium',
                  state.currentView === item.id
                    ? 'bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] shadow-ambient'
                    : 'text-[var(--on-primary)]/70 hover:bg-[var(--tertiary)]/10 hover:text-[var(--on-primary)]'
                )}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Logout - subtle hover state */}
        <div className="p-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--on-primary)]/60 hover:bg-[var(--error)]/10 hover:text-[var(--error)] transition-smooth font-medium"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - glassmorphism */}
      <nav className="surface-dark md:hidden fixed bottom-0 left-0 right-0 glass-dark z-40 safe-area-pb">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-smooth',
                state.currentView === item.id
                  ? 'text-[var(--tertiary)]'
                  : 'text-[var(--on-primary)]/50'
              )}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[var(--on-primary)]/50 hover:text-[var(--error)] transition-smooth"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="text-xs font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </>
  )
}
