'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { SensorChart } from '@/components/sensors/sensor-chart'
import { RangeBar } from '@/components/sensors/range-bar'
import { useSensors } from '@/lib/hooks/use-sensors'
import { NPK_THEME, SENSOR_THEME, SENSOR_TYPES, STATUS_CHIP, STATUS_LABEL, peorEstado } from '@/lib/sensor-theme'
import type { SensorReading, SoilStatus } from '@/lib/types'

interface GrupoParcela {
  parcelId: string
  parcelName: string
  lecturas: SensorReading[]
  estado: SoilStatus
  ultimaLectura: Date
}

function SensorCard({ sensor }: { sensor: SensorReading }) {
  const tema = SENSOR_THEME[sensor.type]
  const decimales = sensor.type === 'ph' ? 1 : 0

  return (
    <div
      className={`rounded-xl bg-surface-lowest p-5 shadow-ambient transition-smooth hover:shadow-elevated ${
        sensor.status === 'critico' ? 'ring-2 ring-[var(--error)]/40' : sensor.status === 'alerta' ? 'ring-2 ring-[var(--warning)]/30' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 flex-none rounded-lg flex items-center justify-center" style={{ backgroundColor: tema.soft, color: tema.color }}>
            <span className="material-symbols-outlined text-xl">{tema.icon}</span>
          </div>
          <p className="text-sm font-semibold text-on-surface truncate">{tema.shortLabel}</p>
        </div>
        <span className={`flex-none text-[11px] font-bold px-2 py-0.5 rounded-sm ${STATUS_CHIP[sensor.status]}`}>
          {STATUS_LABEL[sensor.status]}
        </span>
      </div>

      <p className="mt-4 text-display-md text-on-surface leading-none">
        {sensor.value.toFixed(decimales)}
        <span className="text-base font-normal text-on-surface-variant ml-1">{tema.unit}</span>
      </p>

      <div className="mt-2 -mx-1">
        <SensorChart data={sensor.history} color={tema.color} unit={tema.unit} decimals={decimales} height={56} domain={[tema.optimal.min, tema.optimal.max]} />
      </div>

      <div className="mt-3">
        <RangeBar value={sensor.value} min={tema.min} max={tema.max} optimal={tema.optimal} color={tema.color} unit={tema.unit} />
      </div>
    </div>
  )
}

export function SensorsView() {
  const { readings, resumen, loading, error, actualizado } = useSensors()
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState<string>('all')
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('all')

  const grupos = useMemo<GrupoParcela[]>(() => {
    const porParcela = new Map<string, GrupoParcela>()
    for (const r of readings) {
      const grupo = porParcela.get(r.parcelId) ?? {
        parcelId: r.parcelId, parcelName: r.parcelName, lecturas: [], estado: 'optimo' as SoilStatus, ultimaLectura: r.lastUpdate,
      }
      grupo.lecturas.push(r)
      grupo.estado = peorEstado([grupo.estado, r.status])
      if (r.lastUpdate > grupo.ultimaLectura) grupo.ultimaLectura = r.lastUpdate
      porParcela.set(r.parcelId, grupo)
    }
    // Primero las parcelas que requieren atención
    const orden: Record<SoilStatus, number> = { critico: 0, alerta: 1, optimo: 2 }
    return [...porParcela.values()].sort((a, b) => orden[a.estado] - orden[b.estado] || a.parcelName.localeCompare(b.parcelName))
  }, [readings])

  const gruposVisibles = grupos
    .filter((g) => parcelaSeleccionada === 'all' || g.parcelId === parcelaSeleccionada)
    .map((g) => ({
      ...g,
      lecturas: g.lecturas
        .filter((l) => tipoSeleccionado === 'all' || l.type === tipoSeleccionado)
        .sort((a, b) => SENSOR_TYPES.indexOf(a.type) - SENSOR_TYPES.indexOf(b.type)),
    }))

  const stats = {
    total: readings.length,
    optimo: readings.filter((s) => s.status === 'optimo').length,
    alerta: readings.filter((s) => s.status === 'alerta').length,
    critico: readings.filter((s) => s.status === 'critico').length,
  }

  const tarjetasResumen = [
    { label: 'Total Sensores', value: stats.total, icon: 'sensors', fondo: 'bg-[#e3eef8]', texto: 'text-[var(--primary-container)]', numero: 'text-on-surface' },
    { label: 'Óptimos', value: stats.optimo, icon: 'check_circle', fondo: 'bg-success-container', texto: 'text-[var(--success)]', numero: 'text-[var(--success)]' },
    { label: 'En Alerta', value: stats.alerta, icon: 'warning', fondo: 'bg-warning-container', texto: 'text-[var(--warning)]', numero: 'text-[var(--warning)]' },
    { label: 'Críticos', value: stats.critico, icon: 'error', fondo: 'bg-error-container', texto: 'text-[var(--error)]', numero: 'text-[var(--error)]' },
  ]

  return (
    <div className="space-y-8">
      <header className="pt-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider mb-2">Monitoreo IoT</p>
            <h1 className="text-display-md text-on-surface">Sensores</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] sensor-pulse" />
            <span className="text-on-surface-variant font-medium">
              {actualizado ? `En vivo · ${actualizado.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}` : 'Conectando...'}
            </span>
          </div>
        </div>
      </header>

      {/* Resumen */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tarjetasResumen.map((t) => (
          <Card key={t.label} className="bg-surface-lowest shadow-ambient border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${t.fondo}`}>
                  <span className={`material-symbols-outlined ${t.texto}`}>{t.icon}</span>
                </div>
                <div>
                  {loading ? <Skeleton className="w-10 h-8" /> : <p className={`text-display-md leading-none ${t.numero}`}>{t.value}</p>}
                  <p className="text-xs text-on-surface-variant font-medium mt-1">{t.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Filtros: chips de parcela + tipo de sensor */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1">
          {[{ parcelId: 'all', parcelName: 'Todas las parcelas', estado: null as SoilStatus | null }, ...grupos].map((g) => {
            const activa = parcelaSeleccionada === g.parcelId
            return (
              <button
                key={g.parcelId}
                onClick={() => setParcelaSeleccionada(g.parcelId)}
                className={`flex-none flex items-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-smooth ${
                  activa ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-ambient' : 'bg-surface-lowest text-on-surface-variant hover:text-on-surface shadow-ambient'
                }`}
              >
                {g.estado && (
                  <span className={`w-2 h-2 rounded-full ${g.estado === 'optimo' ? 'bg-[var(--success)]' : g.estado === 'alerta' ? 'bg-[var(--warning)]' : 'bg-[var(--error)]'}`} />
                )}
                {g.parcelName}
              </button>
            )
          })}
        </div>
        <Select value={tipoSeleccionado} onValueChange={setTipoSeleccionado}>
          <SelectTrigger className="w-full lg:w-56 bg-surface-lowest shadow-ambient border-0 h-10 rounded-full">
            <SelectValue placeholder="Filtrar por variable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las variables</SelectItem>
            {SENSOR_TYPES.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>{SENSOR_THEME[tipo].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-[var(--error)] flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>{error}
        </p>
      )}

      {/* Sensores agrupados por parcela */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="w-64 h-7" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        </div>
      ) : gruposVisibles.length === 0 ? (
        <Card className="bg-surface-lowest shadow-ambient border-0">
          <CardContent className="py-14 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-3 block">sensors_off</span>
            No hay lecturas de sensores para mostrar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {gruposVisibles.map((grupo) => (
            <section key={grupo.parcelId}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                <h2 className="text-headline text-on-surface">{grupo.parcelName}</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-sm ${STATUS_CHIP[grupo.estado]}`}>{STATUS_LABEL[grupo.estado]}</span>
                <span className="text-xs text-on-surface-variant flex items-center gap-1 sm:ml-auto">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Última lectura {grupo.ultimaLectura.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {grupo.lecturas.map((sensor) => <SensorCard key={sensor.id} sensor={sensor} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Análisis NPK con datos reales del backend */}
      {resumen && (
        <Card className="bg-surface-lowest shadow-ambient border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-headline text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--tertiary)]">science</span>
              Análisis NPK General
            </CardTitle>
            <CardDescription className="text-on-surface-variant mt-1">Promedio de macronutrientes en la última lectura de cada parcela</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(Object.keys(NPK_THEME) as (keyof typeof NPK_THEME)[]).map((clave) => {
                const tema = NPK_THEME[clave]
                const valor = resumen[clave]
                return (
                  <div key={clave} className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-on-surface">{tema.label}</span>
                      <span className="text-display-md text-on-surface">
                        {valor ?? '—'} <span className="text-sm font-normal text-on-surface-variant">ppm</span>
                      </span>
                    </div>
                    {valor !== null && (
                      <RangeBar value={valor} min={0} max={tema.max} optimal={tema.optimal} color={tema.color} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
