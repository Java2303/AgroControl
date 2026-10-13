'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'

export function SettingsView() {
  const { state, logout } = useApp()
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    darkMode: false,
    autoRefresh: true,
    refreshInterval: 30,
  })

  const handleExportData = () => {
    const data = {
      user: state.user,
      parcels: state.parcels,
      sensors: state.sensors,
      exportDate: new Date().toISOString(),
    }
    const dataStr = JSON.stringify(data, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', 'agro-control-backup.json')
    linkElement.click()
  }

  const handleClearData = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todos los datos? Esta acción no se puede deshacer.')) {
      localStorage.clear()
      logout()
    }
  }

  return (
    <div className="space-y-8">
      {/* Header - Editorial typography */}
      <header className="pt-4">
        <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider mb-2">
          Configuración
        </p>
        <h1 className="text-display-md text-on-surface">Ajustes</h1>
      </header>

      {/* Profile Card - Tonal layering, no borders */}
      <Card className="bg-surface-lowest shadow-ambient border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--tertiary)]">person</span>
            Perfil de Usuario
          </CardTitle>
          <CardDescription className="text-on-surface-variant mt-1">Información de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--tertiary)] to-[var(--tertiary-fixed-dim)] flex items-center justify-center shadow-elevated">
                <span className="material-symbols-outlined text-[var(--on-tertiary-fixed)] text-4xl">person</span>
              </div>
            </div>
            <div className="flex-1 space-y-5">
              <FieldGroup>
                <Field>
                  <FieldLabel className="text-on-surface font-semibold">Nombre</FieldLabel>
                  <Input value={state.user?.name || ''} disabled className="bg-surface-high border-0 h-11 rounded-lg" />
                </Field>
                <Field>
                  <FieldLabel className="text-on-surface font-semibold">Correo Electrónico</FieldLabel>
                  <Input value={state.user?.email || ''} disabled className="bg-surface-high border-0 h-11 rounded-lg" />
                </Field>
                <Field>
                  <FieldLabel className="text-on-surface font-semibold">Tipo de Usuario</FieldLabel>
                  <Input value={state.user?.userType === 'productor' ? 'Productor' : 'Ingeniero Agrónomo'} disabled className="bg-surface-high border-0 h-11 rounded-lg capitalize" />
                </Field>
              </FieldGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications - No dividers, use spacing */}
      <Card className="bg-surface-lowest shadow-ambient border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--tertiary)]">notifications</span>
            Notificaciones
          </CardTitle>
          <CardDescription className="text-on-surface-variant mt-1">Configura cómo recibir alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface-low">
            <div className="space-y-0.5">
              <p className="font-semibold text-on-surface">Notificaciones Push</p>
              <p className="text-sm text-on-surface-variant">Recibe alertas en tu dispositivo</p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface-low">
            <div className="space-y-0.5">
              <p className="font-semibold text-on-surface">Alertas por Email</p>
              <p className="text-sm text-on-surface-variant">Recibe resúmenes diarios por correo</p>
            </div>
            <Switch
              checked={settings.emailAlerts}
              onCheckedChange={(checked) => setSettings({ ...settings, emailAlerts: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card className="bg-surface-lowest shadow-ambient border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--tertiary)]">display_settings</span>
            Visualización
          </CardTitle>
          <CardDescription className="text-on-surface-variant mt-1">Personaliza la interfaz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface-low">
            <div className="space-y-0.5">
              <p className="font-semibold text-on-surface">Modo Oscuro</p>
              <p className="text-sm text-on-surface-variant">Cambia el tema de la aplicación</p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(checked) => setSettings({ ...settings, darkMode: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface-low">
            <div className="space-y-0.5">
              <p className="font-semibold text-on-surface">Actualización Automática</p>
              <p className="text-sm text-on-surface-variant">Actualizar datos de sensores automáticamente</p>
            </div>
            <Switch
              checked={settings.autoRefresh}
              onCheckedChange={(checked) => setSettings({ ...settings, autoRefresh: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-surface-lowest shadow-ambient border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--tertiary)]">database</span>
            Gestión de Datos
          </CardTitle>
          <CardDescription className="text-on-surface-variant mt-1">Exporta o elimina tus datos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Button onClick={handleExportData} variant="outline" className="flex-1 bg-surface-high border-0 h-11 rounded-lg hover:bg-surface-container">
              <span className="material-symbols-outlined text-lg mr-2">download</span>
              Exportar Datos
            </Button>
            <Button
              onClick={handleClearData}
              variant="outline"
              className="flex-1 bg-surface-high border-0 h-11 rounded-lg text-[var(--error)] hover:bg-error-container"
            >
              <span className="material-symbols-outlined text-lg mr-2">delete_forever</span>
              Eliminar Todos los Datos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-surface-lowest shadow-ambient border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-headline text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--tertiary)]">info</span>
            Acerca de
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--tertiary)] to-[var(--tertiary-fixed-dim)] flex items-center justify-center shadow-elevated">
              <span className="material-symbols-outlined text-[var(--on-tertiary-fixed)] text-3xl">eco</span>
            </div>
            <div>
              <h3 className="font-bold text-xl text-on-surface">AGRO CONTROL</h3>
              <p className="text-on-surface-variant">Versión 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Sistema de gestión y trazabilidad de suelos del CIAT. Monitorea tus parcelas con sensores IoT,
            conserva el historial químico de cada lote y recibe recomendaciones de un motor de reglas
            basado en los umbrales agronómicos del CIAT.
          </p>
          <div className="mt-5 pt-5 border-t border-[var(--outline-variant)]">
            <p className="text-xs text-on-surface-variant">
              © 2026 AGRO CONTROL · Centro de Investigación Agrícola Tropical
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logout - xl roundedness */}
      <Button
        onClick={logout}
        variant="outline"
        className="w-full bg-surface-lowest border-0 h-12 rounded-xl text-[var(--error)] hover:bg-error-container shadow-ambient font-semibold"
      >
        <span className="material-symbols-outlined text-lg mr-2">logout</span>
        Cerrar Sesión
      </Button>
    </div>
  )
}
