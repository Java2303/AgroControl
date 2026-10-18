'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch } from '@/lib/api-client'
import { getCropColor, getCropNameById } from '@/lib/crops'
import {
  ORDEN_TIPOS, TIPOS_ACTIVIDAD, UNIDADES, estadoCiclo, fechaLocal, hoyISO,
  type Actividad, type TipoActividad, type Unidad,
} from '@/lib/actividades'
import type { Parcel } from '@/lib/types'

interface ParcelHistoryProps {
  parcel: Parcel | null
  onOpenChange: (abierto: boolean) => void
  /** El agrónomo y el administrador registran labores; el productor solo consulta */
  puedeRegistrar: boolean
}

const fmtFecha = (iso: string, opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  fechaLocal(iso).toLocaleDateString('es-BO', opciones)

const fmtCantidad = (a: Pick<Actividad, 'cantidad' | 'unidad'>) =>
  a.cantidad !== null && a.unidad ? `${a.cantidad.toLocaleString('es-BO', { maximumFractionDigits: 2 })} ${a.unidad}` : null

const FORM_VACIO = { tipo: 'siembra' as TipoActividad, fecha: hoyISO(), producto: '', cantidad: '', unidad: 'kg/ha' as Unidad | '', descripcion: '' }

export function ParcelHistory({ parcel, onOpenChange, puedeRegistrar }: ParcelHistoryProps) {
  const [actividades, setActividades] = useState<Actividad[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  const cargar = useCallback(async () => {
    if (!parcel) return
    try {
      const r = await apiFetch<{ data: Actividad[] }>(`/parcelas/${parcel.id}/actividades`)
      setActividades(r.data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la bitácora.')
      setActividades([])
    }
  }, [parcel])

  useEffect(() => {
    setActividades(null)
    setMostrarFormulario(false)
    setAnulando(null)
    setForm({ ...FORM_VACIO, fecha: hoyISO() })
    cargar()
  }, [cargar])

  const elegirTipo = (tipo: TipoActividad) => {
    const tema = TIPOS_ACTIVIDAD[tipo]
    setForm((f) => ({ ...f, tipo, unidad: tema.unidad ?? '', producto: tema.producto ? f.producto : '' }))
  }

  const guardar = async () => {
    if (!parcel) return
    setErrorForm(null)
    setGuardando(true)
    try {
      await apiFetch(`/parcelas/${parcel.id}/actividades`, {
        method: 'POST',
        body: JSON.stringify({
          tipo: form.tipo,
          fecha: form.fecha,
          producto: form.producto || null,
          cantidad: form.cantidad === '' ? null : Number(form.cantidad),
          unidad: form.cantidad === '' ? null : form.unidad || null,
          descripcion: form.descripcion || null,
        }),
      })
      setMostrarFormulario(false)
      setForm({ ...FORM_VACIO, fecha: hoyISO() })
      await cargar()
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo registrar la labor.')
    } finally {
      setGuardando(false)
    }
  }

  const confirmarAnulacion = async (id: string) => {
    try {
      await apiFetch(`/actividades/${id}/anular`, { method: 'PATCH', body: JSON.stringify({ motivo }) })
      setAnulando(null)
      setMotivo('')
      await cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular la labor.')
    }
  }

  const ciclo = useMemo(() => estadoCiclo(actividades ?? []), [actividades])

  // Agrupar por mes (la API ya las entrega de la más reciente a la más antigua)
  const porMes = useMemo(() => {
    const grupos: { mes: string; items: Actividad[] }[] = []
    for (const a of actividades ?? []) {
      const mes = fmtFecha(a.fecha, { month: 'long', year: 'numeric' })
      const ultimo = grupos[grupos.length - 1]
      if (ultimo?.mes === mes) ultimo.items.push(a)
      else grupos.push({ mes, items: [a] })
    }
    return grupos
  }, [actividades])

  const vigentes = (actividades ?? []).filter((a) => !a.anulada).length
  const tema = TIPOS_ACTIVIDAD[form.tipo]

  return (
    <Sheet open={!!parcel} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 gap-0 overflow-y-auto bg-surface-low border-0">
        {parcel && (
          <>
            <SheetHeader className="bg-surface-lowest p-6 pb-5 shadow-ambient">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Bitácora de labores</p>
              <SheetTitle className="text-headline text-on-surface flex items-center gap-2 pr-6">
                <span className="w-3 h-3 flex-none rounded-full" style={{ backgroundColor: getCropColor(parcel.cropType) }} />
                {parcel.name}
              </SheetTitle>
              <SheetDescription className="text-on-surface-variant">
                {getCropNameById(parcel.cropType)} · {parcel.area.toFixed(2)} ha{parcel.ubicacion_nombre ? ` · ${parcel.ubicacion_nombre}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="p-6 space-y-6">
              {/* Estado del ciclo */}
              {actividades === null ? (
                <Skeleton className="h-24 rounded-xl" />
              ) : (
                <div className="rounded-xl bg-surface-lowest p-5 shadow-ambient flex items-center gap-4">
                  <div
                    className="w-12 h-12 flex-none rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: ciclo.tipo === 'en-cultivo' ? '#e9f5e4' : ciclo.tipo === 'cosechado' ? '#fff1e0' : 'var(--surface-container)',
                      color: ciclo.tipo === 'en-cultivo' ? '#2b8412' : ciclo.tipo === 'cosechado' ? '#b35c00' : 'var(--on-surface-variant)',
                    }}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {ciclo.tipo === 'en-cultivo' ? 'psychiatry' : ciclo.tipo === 'cosechado' ? 'agriculture' : 'hourglass_empty'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Ciclo actual</p>
                    {ciclo.tipo === 'en-cultivo' && (
                      <>
                        <p className="font-semibold text-on-surface">En cultivo · {ciclo.dias} {ciclo.dias === 1 ? 'día' : 'días'} desde la siembra</p>
                        <p className="text-sm text-on-surface-variant">Sembrado el {fmtFecha(ciclo.siembra.fecha)}{ciclo.siembra.producto ? ` · ${ciclo.siembra.producto}` : ''}</p>
                      </>
                    )}
                    {ciclo.tipo === 'cosechado' && (
                      <>
                        <p className="font-semibold text-on-surface">
                          Cosechado el {fmtFecha(ciclo.cosecha.fecha)}{fmtCantidad(ciclo.cosecha) ? ` · ${fmtCantidad(ciclo.cosecha)}` : ''}
                        </p>
                        <p className="text-sm text-on-surface-variant">
                          {ciclo.dias !== null ? `Ciclo de ${ciclo.dias} días desde la siembra` : 'Sin siembra registrada para este ciclo'}
                        </p>
                      </>
                    )}
                    {ciclo.tipo === 'sin-siembra' && (
                      <>
                        <p className="font-semibold text-on-surface">Sin siembra registrada</p>
                        <p className="text-sm text-on-surface-variant">Registre la siembra para seguir el ciclo del cultivo.</p>
                      </>
                    )}
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-display-md text-on-surface leading-none">{vigentes}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{vigentes === 1 ? 'labor' : 'labores'}</p>
                  </div>
                </div>
              )}

              {/* Registrar labor */}
              {puedeRegistrar ? (
                mostrarFormulario ? (
                  <div className="rounded-xl bg-surface-lowest p-5 shadow-ambient space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-on-surface">Registrar labor</p>
                      <button onClick={() => setMostrarFormulario(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Cerrar formulario">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Tipo de labor">
                      {ORDEN_TIPOS.map((t) => {
                        const tt = TIPOS_ACTIVIDAD[t]
                        const activo = form.tipo === t
                        return (
                          <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            onClick={() => elegirTipo(t)}
                            className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[11px] font-medium leading-tight text-center transition-smooth ${
                              activo ? 'ring-2 shadow-ambient' : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
                            }`}
                            style={activo ? { backgroundColor: tt.soft, color: tt.color, ['--tw-ring-color' as string]: tt.color } : undefined}
                          >
                            <span className="material-symbols-outlined text-xl">{tt.icon}</span>
                            {tt.label}
                          </button>
                        )
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1.5 col-span-2 sm:col-span-1">
                        <span className="text-sm font-semibold text-on-surface">Fecha</span>
                        <Input type="date" max={hoyISO()} min="2000-01-01" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="bg-surface-high border-0 h-11" />
                      </label>
                      {tema.producto && (
                        <label className="space-y-1.5 col-span-2 sm:col-span-1">
                          <span className="text-sm font-semibold text-on-surface">{tema.producto}</span>
                          <Input value={form.producto} maxLength={120} onChange={(e) => setForm({ ...form, producto: e.target.value })} className="bg-surface-high border-0 h-11" placeholder={form.tipo === 'siembra' ? 'Ej.: Soya CIAT Motacú' : 'Ej.: Urea 46 %'} />
                        </label>
                      )}
                    </div>

                    {tema.unidad && (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1.5">
                          <span className="text-sm font-semibold text-on-surface">{tema.cantidad} <span className="font-normal text-on-surface-variant">(opcional)</span></span>
                          <Input type="number" inputMode="decimal" min="0" step="any" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="bg-surface-high border-0 h-11" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-sm font-semibold text-on-surface">Unidad</span>
                          <Select value={form.unidad || undefined} onValueChange={(v) => setForm({ ...form, unidad: v as Unidad })}>
                            <SelectTrigger className="bg-surface-high border-0 h-11 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </label>
                      </div>
                    )}

                    <label className="space-y-1.5 block">
                      <span className="text-sm font-semibold text-on-surface">
                        Observaciones {form.tipo === 'otra' ? '' : <span className="font-normal text-on-surface-variant">(opcional)</span>}
                      </span>
                      <Textarea value={form.descripcion} maxLength={500} rows={3} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="bg-surface-high border-0" placeholder={form.tipo === 'muestreo' ? 'Ej.: Muestra compuesta 0–20 cm, código de laboratorio…' : 'Ej.: Aplicación al voleo antes de la lluvia'} />
                    </label>

                    {errorForm && (
                      <p className="text-sm text-[var(--error)] flex items-center gap-2"><span className="material-symbols-outlined text-base">error</span>{errorForm}</p>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setMostrarFormulario(false)} className="bg-surface-high border-0">Cancelar</Button>
                      <Button onClick={guardar} disabled={guardando || !form.fecha} className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] border-0">
                        {guardando ? 'Guardando…' : 'Guardar en la bitácora'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setMostrarFormulario(true)} className="w-full h-12 rounded-xl bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] border-0 font-semibold shadow-ambient">
                    <span className="material-symbols-outlined text-lg mr-2">add</span>
                    Registrar labor
                  </Button>
                )
              ) : (
                <p className="text-sm text-on-surface-variant flex items-center gap-2 rounded-lg bg-surface-lowest px-4 py-3">
                  <span className="material-symbols-outlined text-base">info</span>
                  Las labores las registra el ingeniero agrónomo responsable de la parcela.
                </p>
              )}

              {error && (
                <p className="text-sm text-[var(--error)] flex items-center gap-2"><span className="material-symbols-outlined text-base">error</span>{error}</p>
              )}

              {/* Línea de tiempo */}
              {actividades === null ? (
                <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : actividades.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl block mb-2">history</span>
                  Aún no hay labores registradas en esta parcela.
                </div>
              ) : (
                <div className="space-y-6">
                  {porMes.map((grupo) => (
                    <section key={grupo.mes}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3 first-letter:uppercase">{grupo.mes}</h3>
                      <ol className="relative space-y-3 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-[var(--outline)]">
                        {grupo.items.map((a) => {
                          const t = TIPOS_ACTIVIDAD[a.tipo]
                          const cantidad = fmtCantidad(a)
                          return (
                            <li key={a.id} className="relative flex gap-3">
                              <div
                                className="relative z-10 w-10 h-10 flex-none rounded-full flex items-center justify-center ring-4 ring-[var(--surface-container-low)]"
                                style={{ backgroundColor: a.anulada ? 'var(--surface-container)' : t.soft, color: a.anulada ? 'var(--on-surface-variant)' : t.color }}
                              >
                                <span className="material-symbols-outlined text-lg">{t.icon}</span>
                              </div>
                              <div className={`flex-1 min-w-0 rounded-xl bg-surface-lowest p-4 shadow-ambient ${a.anulada ? 'opacity-70' : ''}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className={`font-semibold text-on-surface ${a.anulada ? 'line-through' : ''}`}>{t.label}</p>
                                    <p className="text-xs text-on-surface-variant">{fmtFecha(a.fecha, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                  {a.anulada ? (
                                    <span className="flex-none text-[11px] font-bold px-2 py-0.5 rounded-sm bg-error-container text-[var(--error)]">Anulada</span>
                                  ) : (
                                    puedeRegistrar && anulando !== a.id && (
                                      <button
                                        onClick={() => { setAnulando(a.id); setMotivo('') }}
                                        className="flex-none text-xs text-on-surface-variant hover:text-[var(--error)] flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-sm">block</span>Anular
                                      </button>
                                    )
                                  )}
                                </div>

                                {(a.producto || cantidad) && (
                                  <p className="mt-2 text-sm text-on-surface">
                                    {a.producto}{a.producto && cantidad ? ' · ' : ''}{cantidad && <span className="font-semibold">{cantidad}</span>}
                                  </p>
                                )}
                                {a.descripcion && <p className="mt-1 text-sm text-on-surface-variant">{a.descripcion}</p>}
                                <p className="mt-2 text-[11px] text-on-surface-variant">Registrado por {a.registradoPor}</p>

                                {a.anulada && (
                                  <p className="mt-2 text-xs text-[var(--error)]">
                                    Anulada por {a.anuladaPor}: {a.motivoAnulacion}
                                  </p>
                                )}

                                {anulando === a.id && (
                                  <div className="mt-3 space-y-2 rounded-lg bg-error-container/60 p-3">
                                    <p className="text-xs text-on-surface">La labor no se elimina: queda en la bitácora marcada como anulada.</p>
                                    <Input autoFocus placeholder="Motivo de la anulación" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="bg-surface-lowest border-0 h-10" />
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => setAnulando(null)} className="bg-surface-lowest border-0">Cancelar</Button>
                                      <Button size="sm" onClick={() => confirmarAnulacion(a.id)} disabled={motivo.trim().length < 5} className="bg-[var(--error)] hover:bg-[var(--error)]/90 text-white border-0">Anular labor</Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
