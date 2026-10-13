'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api-client'
import { useParcels } from '@/lib/hooks/use-parcels'
import { useSensors } from '@/lib/hooks/use-sensors'
import { getCropColor, getCropNameById } from '@/lib/crops'
import { SENSOR_THEME, SENSOR_TYPES, STATUS_CHIP, STATUS_LABEL, estadosPorParcela, peorEstado } from '@/lib/sensor-theme'
import type { SoilStatus } from '@/lib/types'

interface Recomendacion {
  text: string
  icon: string
  priority: 'success' | 'warning' | 'info'
}

// Un sensor se considera en línea si reportó en los últimos 2 minutos (el nodo envía cada 15 s)
const UMBRAL_EN_LINEA_MS = 2 * 60 * 1000

/** "Ing. José Pérez" -> "Ing. José"; "María López" -> "María" */
function nombreParaSaludo(nombre?: string) {
  const palabras = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return 'Usuario'
  return palabras[0].endsWith('.') && palabras[1] ? `${palabras[0]} ${palabras[1]}` : palabras[0]
}

function saludoSegunHora() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const estadoPorRango = (valor: number, optimo: { min: number; max: number }, alerta: { min: number; max: number }): SoilStatus => {
  if (valor < alerta.min || valor > alerta.max) return 'critico'
  if (valor < optimo.min || valor > optimo.max) return 'alerta'
  return 'optimo'
}

export function DashboardView() {
  const { state, navigate } = useApp()
  const { parcels, loading: cargandoParcelas, error: errorParcelas } = useParcels()
  const { readings, loading: cargandoSensores, actualizado } = useSensors()
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[] | null>(null)

  // Recomendaciones del motor de reglas agronómicas (cada 15 s)
  useEffect(() => {
    let activo = true
    const cargar = async () => {
      try {
        const resultado = await apiFetch<{ data: Recomendacion[] }>('/reglas/recomendaciones')
        if (activo) setRecomendaciones(resultado.data)
      } catch {
        if (activo) setRecomendaciones((prev) => prev ?? [])
      }
    }
    cargar()
    const intervalo = setInterval(cargar, 15000)
    return () => {
      activo = false
      clearInterval(intervalo)
    }
  }, [])

  const estados = useMemo(() => estadosPorParcela(readings), [readings])

  const metricas = useMemo(() => {
    if (readings.length === 0) return null
    const promedio = (tipo: string) => {
      const valores = readings.filter((r) => r.type === tipo).map((r) => r.value)
      return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
    }
    const humedad = promedio('humidity')
    const temperatura = promedio('temperature')
    const salud = (readings.filter((r) => r.status === 'optimo').length / readings.length) * 100
    const enLinea = readings.filter((r) => Date.now() - r.lastUpdate.getTime() < UMBRAL_EN_LINEA_MS).length
    const porcentajeEnLinea = (enLinea / readings.length) * 100

    return [
      {
        label: 'Humedad del Suelo', value: Math.round(humedad), unit: '%', icon: 'water_drop',
        color: SENSOR_THEME.humidity.color, soft: SENSOR_THEME.humidity.soft, progreso: humedad,
        status: estadoPorRango(humedad, { min: 40, max: 70 }, { min: 30, max: 80 }),
      },
      {
        label: 'Temperatura', value: Math.round(temperatura), unit: '°C', icon: 'thermostat',
        color: SENSOR_THEME.temperature.color, soft: SENSOR_THEME.temperature.soft, progreso: (temperatura / 50) * 100,
        status: estadoPorRango(temperatura, { min: 18, max: 28 }, { min: 12, max: 35 }),
      },
      {
        label: 'Índice de Salud', value: Math.round(salud), unit: '%', icon: 'local_florist',
        color: '#2b8412', soft: '#e9f5e4', progreso: salud,
        status: (salud < 50 ? 'critico' : salud < 75 ? 'alerta' : 'optimo') as SoilStatus,
      },
      {
        label: 'Sensores en Línea', value: enLinea, unit: `de ${readings.length}`, icon: 'router',
        color: '#005293', soft: '#e3eef8', progreso: porcentajeEnLinea,
        status: (porcentajeEnLinea < 50 ? 'critico' : porcentajeEnLinea < 100 ? 'alerta' : 'optimo') as SoilStatus,
      },
    ]
  }, [readings])

  const resumenPorTipo = useMemo(
    () =>
      SENSOR_TYPES.map((tipo) => {
        const delTipo = readings.filter((r) => r.type === tipo)
        const promedio = delTipo.length ? delTipo.reduce((s, r) => s + r.value, 0) / delTipo.length : null
        return { tipo, cantidad: delTipo.length, promedio, estado: peorEstado(delTipo.map((r) => r.status)) }
      }),
    [readings]
  )

  return (
    <div className="space-y-8">
      <header className="pt-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider mb-2">
              Panel de Control
            </p>
            <h1 className="text-display-md text-on-surface">
              {saludoSegunHora()}, {nombreParaSaludo(state.user?.name)}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] sensor-pulse" />
            <span>
              {actualizado
                ? `Actualizado a las ${actualizado.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}`
                : 'Conectando con los sensores...'}
            </span>
          </div>
        </div>
      </header>

      {/* Métricas */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {cargandoSensores
          ? Array.from({ length: 4 }, (_, i) => (
              <Card key={i} className="bg-surface-lowest shadow-ambient border-0">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between"><Skeleton className="w-12 h-12 rounded-lg" /><Skeleton className="w-16 h-6" /></div>
                  <Skeleton className="w-28 h-4" />
                  <Skeleton className="w-20 h-10" />
                  <Skeleton className="w-full h-1.5" />
                </CardContent>
              </Card>
            ))
          : metricas
          ? metricas.map((m) => (
              <Card key={m.label} className="bg-surface-lowest shadow-ambient border-0 hover:shadow-elevated transition-smooth">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4 sm:mb-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.soft, color: m.color }}>
                      <span className="material-symbols-outlined text-2xl">{m.icon}</span>
                    </div>
                    <span className={`text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-sm ${STATUS_CHIP[m.status]}`}>
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm font-medium">{m.label}</p>
                  <p className="text-[2rem] sm:text-[2.5rem] font-display font-bold tracking-tight leading-tight text-on-surface mt-1">
                    {m.value}
                    <span className="text-sm sm:text-lg font-normal text-on-surface-variant ml-1">{m.unit}</span>
                  </p>
                  <div className="mt-5 h-1.5 rounded-full bg-surface-container overflow-hidden">
                    <div className="h-full rounded-full transition-smooth" style={{ width: `${Math.min(100, Math.max(0, m.progreso))}%`, backgroundColor: m.color }} />
                  </div>
                </CardContent>
              </Card>
            ))
          : (
              <Card className="col-span-2 lg:col-span-4 bg-surface-lowest shadow-ambient border-0">
                <CardContent className="p-6 flex items-center gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined">sensors_off</span>
                  Aún no hay lecturas de sensores. Registra una parcela para comenzar el monitoreo.
                </CardContent>
              </Card>
            )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parcelas */}
        <Card className="lg:col-span-2 bg-surface-lowest shadow-ambient border-0">
          <CardHeader className="pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-headline text-on-surface">Parcelas Registradas</CardTitle>
                <CardDescription className="text-on-surface-variant mt-1">Estado del suelo según las últimas lecturas</CardDescription>
              </div>
              <button
                onClick={() => navigate('parcels')}
                className="flex-none whitespace-nowrap text-[var(--tertiary)] hover:text-[var(--tertiary-fixed-dim)] font-medium text-sm flex items-center gap-1 transition-smooth"
              >
                Ver todas
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {cargandoParcelas ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[76px] w-full rounded-lg" />)}
              </div>
            ) : errorParcelas ? (
              <p className="text-sm text-[var(--error)] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>{errorParcelas}
              </p>
            ) : parcels.length > 0 ? (
              <div className="space-y-3">
                {parcels.slice(0, 4).map((parcel) => {
                  const estado = estados[parcel.id] ?? 'optimo'
                  const color = getCropColor(parcel.cropType)
                  return (
                    <div key={parcel.id} className="flex items-center gap-4 p-4 rounded-lg bg-surface-low hover:bg-surface-container transition-smooth">
                      <div className="relative w-12 h-12 rounded-lg bg-surface-lowest flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface">grass</span>
                        <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--surface-container-lowest)]" style={{ backgroundColor: color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface truncate">{parcel.name}</p>
                        <p className="text-sm text-on-surface-variant truncate">
                          {getCropNameById(parcel.cropType)} · {parcel.area.toFixed(2)} ha
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-sm ${STATUS_CHIP[estado]}`}>{STATUS_LABEL[estado]}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">landscape</span>
                </div>
                <p className="text-on-surface-variant mb-5">No tienes parcelas registradas</p>
                <button
                  onClick={() => navigate('map')}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] rounded-xl font-semibold hover:bg-[var(--tertiary-fixed-dim)] transition-smooth shadow-ambient"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Crear primera parcela
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recomendaciones */}
        <Card className="bg-surface-lowest shadow-ambient border-0">
          <CardHeader className="pb-5">
            <CardTitle className="text-headline text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--tertiary)]">fact_check</span>
              Recomendaciones Agronómicas
            </CardTitle>
            <CardDescription className="text-on-surface-variant mt-1">Motor de reglas según umbrales del CIAT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recomendaciones === null
                ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                : recomendaciones.length === 0
                ? <p className="text-sm text-on-surface-variant">No hay recomendaciones disponibles por ahora.</p>
                : recomendaciones.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-4 rounded-lg ${
                        rec.priority === 'success' ? 'bg-success-container' : rec.priority === 'warning' ? 'bg-warning-container' : 'bg-surface-low'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg mt-0.5 ${
                          rec.priority === 'success' ? 'text-[var(--success)]' : rec.priority === 'warning' ? 'text-[var(--warning)]' : 'text-[var(--primary-container)]'
                        }`}
                      >
                        {rec.icon}
                      </span>
                      <p className="text-sm text-on-surface leading-relaxed">{rec.text}</p>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Resumen de sensores por variable */}
      <section>
        <Card className="bg-surface-lowest shadow-ambient border-0">
          <CardHeader className="pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-headline text-on-surface">Sensores Activos</CardTitle>
                <CardDescription className="text-on-surface-variant mt-1">Promedio actual por variable en todas tus parcelas</CardDescription>
              </div>
              <button
                onClick={() => navigate('sensors')}
                className="flex-none whitespace-nowrap text-[var(--tertiary)] hover:text-[var(--tertiary-fixed-dim)] font-medium text-sm flex items-center gap-1 transition-smooth"
              >
                Ver detalles
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {resumenPorTipo.map(({ tipo, cantidad, promedio, estado }) => {
                const tema = SENSOR_THEME[tipo]
                return (
                  <div key={tipo} className="flex items-center gap-3 p-4 rounded-lg bg-surface-low">
                    <div className="relative flex-none">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: tema.soft, color: tema.color }}>
                        <span className="material-symbols-outlined">{tema.icon}</span>
                      </div>
                      {cantidad > 0 && (
                        <span
                          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-[var(--surface-container-low)] ${
                            estado === 'optimo' ? 'bg-[var(--success)]' : estado === 'alerta' ? 'bg-[var(--warning)]' : 'bg-[var(--error)]'
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{tema.shortLabel}</p>
                      {cargandoSensores ? (
                        <Skeleton className="w-16 h-3 mt-1" />
                      ) : (
                        <p className="text-xs text-on-surface-variant">
                          {promedio !== null ? `${promedio.toFixed(tipo === 'ph' ? 1 : 0)}${tema.unit ? ' ' + tema.unit : ''} · ` : ''}
                          {cantidad} {cantidad === 1 ? 'activo' : 'activos'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
