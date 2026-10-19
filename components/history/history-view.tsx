'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ParcelHistory, type ParcelaConHistorial } from '@/components/parcels/parcel-history'
import { apiFetch } from '@/lib/api-client'
import { getCropColor, getCropNameById } from '@/lib/crops'
import { fechaLocal } from '@/lib/actividades'

interface ParcelaHistorial {
  id: string
  nombre: string
  ubicacion_nombre: string | null
  cropType: number | null
  area: number
  createdAt: string
  activa: boolean
  propia: boolean
  fechaBaja: string | null
  motivoBaja: string | null
  motivoBajaTexto: string | null
  observacionBaja: string | null
  bajaPor: string | null
  responsable: string
  labores: number
  ultimaLabor: string | null
}

type Filtro = 'todas' | 'activas' | 'baja'

const fmt = (fecha: string) => new Date(fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })

export function HistoryView() {
  const { state } = useApp()
  const esAdmin = state.user?.userType === 'admin_ciat'
  const [parcelas, setParcelas] = useState<ParcelaHistorial[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [abierta, setAbierta] = useState<ParcelaHistorial | null>(null)

  useEffect(() => {
    apiFetch<{ data: ParcelaHistorial[] }>('/historial/parcelas')
      .then((r) => setParcelas(r.data))
      .catch((e) => { setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); setParcelas([]) })
  }, [])

  const lista = parcelas ?? []
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return lista.filter((p) => {
      if (filtro === 'activas' && !p.activa) return false
      if (filtro === 'baja' && p.activa) return false
      if (!termino) return true
      return [p.nombre, getCropNameById(p.cropType), p.ubicacion_nombre, p.responsable, p.motivoBajaTexto]
        .some((v) => (v ?? '').toLowerCase().includes(termino))
    })
  }, [lista, filtro, busqueda])

  const activas = lista.filter((p) => p.activa).length
  const resumen = [
    { label: 'Parcelas en el historial', value: lista.length, icon: 'inventory_2', fondo: 'bg-[#e3eef8]', color: 'text-[var(--primary-container)]' },
    { label: 'Activas', value: activas, icon: 'check_circle', fondo: 'bg-success-container', color: 'text-[var(--success)]' },
    { label: 'Dadas de baja', value: lista.length - activas, icon: 'block', fondo: 'bg-error-container', color: 'text-[var(--error)]' },
    { label: 'Labores registradas', value: lista.reduce((s, p) => s + p.labores, 0), icon: 'history', fondo: 'bg-[#e0f1f4]', color: 'text-[#0b7285]' },
  ]

  const parcelaPanel: ParcelaConHistorial | null = abierta && {
    id: abierta.id,
    name: abierta.nombre,
    cropType: abierta.cropType != null ? String(abierta.cropType) : '1',
    area: abierta.area,
    soilStatus: 'optimo',
    ubicacion_nombre: abierta.ubicacion_nombre ?? undefined,
    createdAt: abierta.createdAt,
    activa: abierta.activa,
    fechaBaja: abierta.fechaBaja,
    motivoBajaTexto: abierta.motivoBajaTexto,
    observacionBaja: abierta.observacionBaja,
    bajaPor: abierta.bajaPor,
    responsable: esAdmin ? abierta.responsable : undefined,
  }

  return (
    <div className="space-y-8">
      <header className="pt-4">
        <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider mb-2">Trazabilidad</p>
        <h1 className="text-display-md text-on-surface">{esAdmin ? 'Historial del CIAT' : 'Historial de parcelas'}</h1>
        <p className="text-on-surface-variant mt-2">
          {esAdmin
            ? 'Todas las parcelas de la institución, activas y dadas de baja, con su bitácora completa.'
            : 'Tus parcelas activas y dadas de baja, con su bitácora completa.'}
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {resumen.map((t) => (
          <Card key={t.label} className="bg-surface-lowest shadow-ambient border-0">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className={`w-11 h-11 flex-none rounded-lg flex items-center justify-center ${t.fondo}`}>
                <span className={`material-symbols-outlined ${t.color}`}>{t.icon}</span>
              </div>
              <div>
                {parcelas === null ? <Skeleton className="w-10 h-8" /> : <p className="text-display-md text-on-surface leading-none">{t.value}</p>}
                <p className="text-xs text-on-surface-variant font-medium mt-1">{t.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-2">
          {([['todas', 'Todas'], ['activas', 'Activas'], ['baja', 'Dadas de baja']] as [Filtro, string][]).map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={`px-4 h-10 rounded-full text-sm font-medium transition-smooth shadow-ambient ${
                filtro === valor ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-surface-lowest text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={esAdmin ? 'Buscar por parcela, cultivo, municipio o responsable…' : 'Buscar por parcela, cultivo o municipio…'}
            className="pl-10 bg-surface-lowest shadow-ambient border-0 h-10 rounded-full"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--error)] flex items-center gap-2"><span className="material-symbols-outlined text-base">error</span>{error}</p>
      )}

      {parcelas === null ? (
        <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : visibles.length === 0 ? (
        <Card className="bg-surface-lowest shadow-ambient border-0">
          <CardContent className="py-14 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
            No hay parcelas que coincidan con el filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibles.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl bg-surface-lowest shadow-ambient p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${p.activa ? '' : 'border-l-4 border-[var(--error)]/60'}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="mt-1.5 w-3 h-3 flex-none rounded-full" style={{ backgroundColor: getCropColor(p.cropType), opacity: p.activa ? 1 : 0.5 }} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold text-on-surface ${p.activa ? '' : 'text-on-surface-variant'}`}>{p.nombre}</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${p.activa ? 'bg-[var(--tertiary-container)] text-[var(--tertiary)]' : 'bg-error-container text-[var(--error)]'}`}>
                      {p.activa ? 'Activa' : 'Dada de baja'}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant truncate">
                    {getCropNameById(p.cropType)} · {p.area.toLocaleString('es-BO', { maximumFractionDigits: 2 })} ha
                    {p.ubicacion_nombre ? ` · ${p.ubicacion_nombre}` : ''}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {esAdmin && <>Responsable: <span className="text-on-surface">{p.responsable}</span> · </>}
                    Registrada el {fmt(p.createdAt)}
                    {!p.activa && p.fechaBaja && (
                      <> · <span className="text-[var(--error)]">Baja el {fmt(p.fechaBaja)}: {p.motivoBajaTexto}</span></>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:flex-none">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-semibold text-on-surface">{p.labores} {p.labores === 1 ? 'labor' : 'labores'}</p>
                  <p className="text-xs text-on-surface-variant">
                    {p.ultimaLabor ? `Última: ${fechaLocal(p.ultimaLabor).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Sin labores'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAbierta(p)}
                  className="ml-auto sm:ml-0 bg-[var(--tertiary-container)] text-[var(--tertiary)] hover:bg-[var(--tertiary)] hover:text-[var(--on-tertiary-fixed)] border-0 font-semibold"
                >
                  <span className="material-symbols-outlined text-base mr-1">history</span>
                  Bitácora
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ParcelHistory
        parcel={parcelaPanel}
        onOpenChange={(a) => { if (!a) setAbierta(null) }}
        puedeRegistrar={!!abierta?.propia && state.user?.userType !== 'productor'}
      />
    </div>
  )
}
