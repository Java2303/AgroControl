'use client'
import { toast } from 'sonner'
import { ROL_LABEL } from '@/lib/types'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { apiFetch } from '@/lib/api-client'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'

export function SettingsView() {
  const { state, logout, dispatch } = useApp()
  const [nombre, setNombre] = useState(state.user?.name ?? '')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const nombreCambiado = nombre.trim().replace(/\s+/g, ' ') !== (state.user?.name ?? '') && nombre.trim().length >= 3

  // Cualquier rol puede cambiar su nombre; correo, CI y rol identifican la cuenta y no se editan
  const guardarNombre = async () => {
    setGuardandoNombre(true)
    try {
      const r = await apiFetch<{ data: { nombre: string } }>('/auth/perfil', { method: 'PATCH', body: JSON.stringify({ nombre }) })
      dispatch({ type: 'UPDATE_USER', payload: { name: r.data.nombre } })
      setNombre(r.data.nombre)
      toast.success('Nombre Actualizado')
    } catch (err) {
      toast.error('No se Pudo Actualizar el Nombre', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setGuardandoNombre(false)
    }
  }
  const { resolvedTheme, setTheme } = useTheme()

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
    toast.success('Datos Exportados')
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
                  <FieldLabel htmlFor="nombre-perfil" className="text-on-surface font-semibold">Nombre</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="nombre-perfil"
                      value={nombre}
                      maxLength={150}
                      onChange={(e) => setNombre(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && nombreCambiado && !guardandoNombre) guardarNombre() }}
                      className="bg-surface-high border-0 h-11 rounded-lg"
                    />
                    <Button
                      onClick={guardarNombre}
                      disabled={!nombreCambiado || guardandoNombre}
                      className="h-11 px-5 rounded-lg bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] border-0 font-semibold"
                    >
                      {guardandoNombre ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel className="text-on-surface font-semibold">Correo Electrónico</FieldLabel>
                  <Input value={state.user?.email || ''} disabled className="bg-surface-high border-0 h-11 rounded-lg" />
                </Field>
                <Field>
                  <FieldLabel className="text-on-surface font-semibold">Tipo de Usuario</FieldLabel>
                  <Input value={ROL_LABEL[state.user?.userType ?? 'agronomo'] ?? 'Ingeniero Agrónomo'} disabled className="bg-surface-high border-0 h-11 rounded-lg capitalize" />
                </Field>
              </FieldGroup>
            </div>
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
              <p className="text-sm text-on-surface-variant">Colores oscuros para trabajar de noche</p>
            </div>
            <Switch
              checked={resolvedTheme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
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
          <CardDescription className="text-on-surface-variant mt-1">Descarga una copia de tus parcelas en formato JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex">
            <Button onClick={handleExportData} variant="outline" className="w-full md:w-auto md:px-6 bg-surface-high border-0 h-11 rounded-lg hover:bg-surface-container">
              <span className="material-symbols-outlined text-lg mr-2">download</span>
              Exportar Datos
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
