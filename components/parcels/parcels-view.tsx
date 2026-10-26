'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/app-context'
import type { Parcel } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { MOTIVOS_BAJA, type MotivoBaja } from '@/lib/actividades'
import { ParcelShape } from '@/components/parcels/parcel-shape'
import { ParcelHistory } from '@/components/parcels/parcel-history'
import { CULTIVOS_CIAT_SANTA_CRUZ, getCropColor, getCropNameById } from '@/lib/crops'
import { apiFetch } from '@/lib/api-client'
import { useParcels } from '@/lib/hooks/use-parcels'
import { useSensors } from '@/lib/hooks/use-sensors'
import { STATUS_CHIP, STATUS_LABEL, estadosPorParcela } from '@/lib/sensor-theme'

export function ParcelsView() {
  const { state, navigate, focusParcelOnMap } = useApp()
  const { parcels, setParcels, loading, error } = useParcels()
  const { readings } = useSensors()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCrop, setFilterCrop] = useState<string>('all')
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [parcelaBaja, setParcelaBaja] = useState<Parcel | null>(null)
  const [baja, setBaja] = useState<{ motivo: MotivoBaja | ''; observacion: string; guardando: boolean; error: string | null }>({ motivo: '', observacion: '', guardando: false, error: null })
  const [editData, setEditData] = useState({ name: '', cropType: '' })
  const [accionError, setAccionError] = useState<string | null>(null)
  const [parcelaBitacora, setParcelaBitacora] = useState<Parcel | null>(null)
  const [parcelaSensor, setParcelaSensor] = useState<Parcel | null>(null)
  const [sensor, setSensor] = useState<{ mac: string; guardando: boolean; error: string | null; token: string | null; copiado: boolean }>({ mac: '', guardando: false, error: null, token: null, copiado: false })
  // Matriz de permisos (Cuadro 3.36): el productor consulta la bitácora, no registra labores
  const puedeRegistrarLabores = state.user?.userType !== 'productor'

  // El estado del suelo se deriva de las lecturas actuales de cada parcela
  const estados = useMemo(() => estadosPorParcela(readings), [readings])
  const parcelasConEstado = parcels.map((p) => ({ ...p, soilStatus: estados[p.id] ?? p.soilStatus }))

  const filteredParcels = parcelasConEstado.filter((parcel) => {
    const termino = searchTerm.toLowerCase()
    const matchesSearch =
      parcel.name.toLowerCase().includes(termino) ||
      getCropNameById(parcel.cropType).toLowerCase().includes(termino) ||
      (parcel.ubicacion_nombre ?? '').toLowerCase().includes(termino)
    const matchesCrop = filterCrop === 'all' || parcel.cropType === filterCrop
    return matchesSearch && matchesCrop
  })

  const handleEditParcel = (parcel: Parcel) => {
    setSelectedParcel(parcel)
    setEditData({ name: parcel.name, cropType: parcel.cropType })
    setAccionError(null)
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedParcel) return
    try {
      await apiFetch(`/parcelas/${selectedParcel.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editData.name, cropType: editData.cropType }),
      })
      setParcels(parcels.map((p) => (p.id === selectedParcel.id ? { ...p, name: editData.name, cropType: editData.cropType } : p)))
      setShowEditDialog(false)
      setSelectedParcel(null)
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : 'No se pudo actualizar la parcela.')
    }
  }

  const abrirBaja = (parcel: Parcel) => {
    setBaja({ motivo: '', observacion: '', guardando: false, error: null })
    setParcelaBaja(parcel)
  }

  // Baja lógica: la parcela sale de las vistas operativas, pero su historial se conserva
  const confirmarBaja = async () => {
    if (!parcelaBaja || !baja.motivo) return
    setBaja((b) => ({ ...b, guardando: true, error: null }))
    try {
      await apiFetch(`/parcelas/${parcelaBaja.id}/baja`, {
        method: 'PATCH',
        body: JSON.stringify({ motivo: baja.motivo, observacion: baja.observacion || null }),
      })
      setParcels(parcels.filter((p) => p.id !== parcelaBaja.id))
      setParcelaBaja(null)
    } catch (err) {
      setBaja((b) => ({ ...b, guardando: false, error: err instanceof Error ? err.message : 'No se pudo dar de baja la parcela.' }))
    }
  }

  const abrirSensor = (parcel: Parcel) => {
    setSensor({ mac: parcel.sensorMac ?? '', guardando: false, error: null, token: null, copiado: false })
    setParcelaSensor(parcel)
  }

  // Vincula el nodo ESP32 por su MAC; la API devuelve la clave del dispositivo una sola vez
  const vincularSensor = async () => {
    if (!parcelaSensor) return
    setSensor((s) => ({ ...s, guardando: true, error: null }))
    try {
      const r = await apiFetch<{ data: { mac: string; token: string } }>(`/parcelas/${parcelaSensor.id}/dispositivo`, {
        method: 'POST',
        body: JSON.stringify({ mac: sensor.mac }),
      })
      setParcels(parcels.map((p) => (p.id === parcelaSensor.id ? { ...p, sensorMac: r.data.mac, sensorUltimaLectura: null } : p)))
      setParcelaSensor({ ...parcelaSensor, sensorMac: r.data.mac, sensorUltimaLectura: null })
      setSensor((s) => ({ ...s, guardando: false, token: r.data.token, mac: r.data.mac }))
    } catch (err) {
      setSensor((s) => ({ ...s, guardando: false, error: err instanceof Error ? err.message : 'No se pudo vincular el sensor.' }))
    }
  }

  const desvincularSensor = async () => {
    if (!parcelaSensor) return
    setSensor((s) => ({ ...s, guardando: true, error: null }))
    try {
      await apiFetch(`/parcelas/${parcelaSensor.id}/dispositivo`, { method: 'DELETE' })
      setParcels(parcels.map((p) => (p.id === parcelaSensor.id ? { ...p, sensorMac: null, sensorUltimaLectura: null } : p)))
      setParcelaSensor(null)
    } catch (err) {
      setSensor((s) => ({ ...s, guardando: false, error: err instanceof Error ? err.message : 'No se pudo desvincular el sensor.' }))
    }
  }

  const copiarToken = async () => {
    if (!sensor.token) return
    try {
      await navigator.clipboard.writeText(sensor.token)
      setSensor((s) => ({ ...s, copiado: true }))
    } catch {
      // Sin permiso de portapapeles: la clave sigue visible para copiarla a mano
    }
  }

  const totalArea = parcels.reduce((sum, p) => sum + p.area, 0)
  const optimas = parcelasConEstado.filter((p) => p.soilStatus === 'optimo').length

  const tarjetasResumen = [
    { label: 'Total Parcelas', value: parcels.length.toString(), icon: 'grid_view', fondo: 'bg-[#e3eef8]', color: 'text-[var(--primary-container)]' },
    { label: 'Hectáreas Totales', value: totalArea.toFixed(1), icon: 'landscape', fondo: 'bg-success-container', color: 'text-[var(--success)]' },
    { label: 'Estado Óptimo', value: optimas.toString(), icon: 'check_circle', fondo: 'bg-success-container', color: 'text-[var(--success)]' },
    { label: 'Requieren Atención', value: (parcels.length - optimas).toString(), icon: 'warning', fondo: 'bg-warning-container', color: 'text-[var(--warning)]' },
  ]

  return (
    <div className="space-y-8">
      <header className="pt-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider mb-2">Administración</p>
            <h1 className="text-display-md text-on-surface">Parcelas</h1>
          </div>
          <Button
            onClick={() => navigate('map')}
            className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] h-12 px-6 rounded-xl font-semibold shadow-ambient hover:shadow-elevated transition-smooth border-0"
          >
            <span className="material-symbols-outlined text-lg mr-2">add</span>
            Nueva Parcela
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {tarjetasResumen.map((t) => (
          <Card key={t.label} className="bg-surface-lowest shadow-ambient border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 flex-none rounded-xl flex items-center justify-center ${t.fondo}`}>
                  <span className={`material-symbols-outlined text-2xl ${t.color}`}>{t.icon}</span>
                </div>
                <div>
                  {loading ? <Skeleton className="w-12 h-9" /> : <p className="text-display-md text-on-surface leading-none">{t.value}</p>}
                  <p className="text-sm text-on-surface-variant font-medium mt-1">{t.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="bg-surface-lowest shadow-ambient border-0">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <Input
                placeholder="Buscar por nombre, cultivo o municipio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface-high border-0 h-11 rounded-lg"
              />
            </div>
            <Select value={filterCrop} onValueChange={setFilterCrop}>
              <SelectTrigger className="w-full md:w-56 bg-surface-high border-0 h-11 rounded-lg">
                <SelectValue placeholder="Filtrar por cultivo" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="all">Todos los cultivos</SelectItem>
                {CULTIVOS_CIAT_SANTA_CRUZ.map((c) => (
                  <SelectItem key={c.tipo_cultivo_id} value={c.tipo_cultivo_id.toString()}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {(error || accionError) && (
        <p className="text-sm text-[var(--error)] flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>{accionError || error}
        </p>
      )}

      {loading ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
        </section>
      ) : filteredParcels.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredParcels.map((parcel) => {
            const color = getCropColor(parcel.cropType)
            return (
              <Card key={parcel.id} className="bg-surface-lowest shadow-ambient border-0 hover:shadow-elevated transition-smooth group overflow-hidden p-0 gap-0">
                <button
                  type="button"
                  onClick={() => focusParcelOnMap(parcel.id)}
                  className="relative block w-full aspect-[5/3] overflow-hidden"
                  aria-label={`Ver ${parcel.name} en el mapa`}
                >
                  <ParcelShape coordinates={parcel.coordinates} color={color} className="w-full h-full transition-smooth group-hover:scale-[1.03]" />
                  <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-sm shadow-sm ${STATUS_CHIP[parcel.soilStatus]}`}>
                    {STATUS_LABEL[parcel.soilStatus]}
                  </span>
                  <span className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-surface-lowest/90 rounded-full pl-1.5 pr-2.5 py-1 text-xs font-semibold text-on-surface shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {getCropNameById(parcel.cropType)}
                  </span>
                </button>

                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-on-surface leading-snug">{parcel.name}</h3>
                    <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {parcel.ubicacion_nombre || 'Ubicación no registrada'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant font-medium">Superficie</p>
                      <p className="text-lg font-bold text-on-surface mt-0.5">{parcel.area.toFixed(2)} ha</p>
                    </div>
                    <div className="bg-surface-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant font-medium">Registrada</p>
                      <p className="text-lg font-bold text-on-surface mt-0.5">
                        {parcel.createdAt ? new Date(parcel.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setParcelaBitacora(parcel)}
                      className="flex-1 bg-[var(--tertiary-container)] text-[var(--tertiary)] hover:bg-[var(--tertiary)] hover:text-[var(--on-tertiary-fixed)] border-0 font-semibold"
                    >
                      <span className="material-symbols-outlined text-base mr-1">history</span>
                      Bitácora
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => focusParcelOnMap(parcel.id)}
                      className="bg-surface-high border-0 hover:bg-surface-container"
                      aria-label="Ver en el mapa"
                      title="Ver en el mapa"
                    >
                      <span className="material-symbols-outlined text-base">map</span>
                    </Button>
                    {puedeRegistrarLabores && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirSensor(parcel)}
                        className={`border-0 ${parcel.sensorMac ? 'bg-success-container text-[var(--success)] hover:bg-success-container/80' : 'bg-surface-high hover:bg-surface-container'}`}
                        aria-label={parcel.sensorMac ? 'Sensor vinculado' : 'Vincular sensor'}
                        title={parcel.sensorMac ? `Sensor ${parcel.sensorMac}` : 'Vincular sensor'}
                      >
                        <span className="material-symbols-outlined text-base">sensors</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditParcel(parcel)}
                      className="bg-surface-high border-0 hover:bg-surface-container"
                      aria-label="Editar parcela"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirBaja(parcel)}
                      className="bg-surface-high border-0 hover:bg-error-container hover:text-[var(--error)]"
                      aria-label="Dar de baja la parcela"
                      title="Dar de baja"
                    >
                      <span className="material-symbols-outlined text-base">block</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      ) : (
        <Card className="bg-surface-lowest shadow-ambient border-0">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-on-surface-variant text-4xl">landscape</span>
              </div>
              <h3 className="text-headline text-on-surface mb-2">
                {searchTerm || filterCrop !== 'all' ? 'No se encontraron parcelas' : 'Sin parcelas registradas'}
              </h3>
              <p className="text-on-surface-variant mb-6">
                {searchTerm || filterCrop !== 'all' ? 'Intenta con otros filtros de búsqueda' : 'Comienza creando tu primera parcela en el mapa'}
              </p>
              {!searchTerm && filterCrop === 'all' && (
                <Button
                  onClick={() => navigate('map')}
                  className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] h-12 px-6 rounded-xl font-semibold shadow-ambient hover:shadow-elevated transition-smooth border-0"
                >
                  <span className="material-symbols-outlined text-lg mr-2">add</span>
                  Crear Primera Parcela
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ParcelHistory
        parcel={parcelaBitacora}
        onOpenChange={(abierto) => { if (!abierto) setParcelaBitacora(null) }}
        puedeRegistrar={puedeRegistrarLabores}
      />

      {/* Editar */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md border-0 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-headline text-on-surface">Editar Parcela</DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              El estado del suelo se calcula automáticamente a partir de los sensores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">Nombre</label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="bg-surface-high border-0 h-11 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">Tipo de Cultivo</label>
              <Select value={editData.cropType} onValueChange={(value) => setEditData({ ...editData, cropType: value })}>
                <SelectTrigger className="bg-surface-high border-0 h-11 rounded-lg">
                  <SelectValue placeholder="Seleccione cultivo" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {CULTIVOS_CIAT_SANTA_CRUZ.map((c) => (
                    <SelectItem key={c.tipo_cultivo_id} value={c.tipo_cultivo_id.toString()}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {accionError && <p className="text-xs text-[var(--error)]">{accionError}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="bg-surface-high border-0">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editData.name.trim()}
              className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] rounded-xl border-0"
            >
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sensor ESP32 */}
      <Dialog open={!!parcelaSensor} onOpenChange={(abierto) => { if (!abierto) setParcelaSensor(null) }}>
        <DialogContent className="sm:max-w-md border-0 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-headline text-on-surface">Sensor de la parcela</DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Vincule el nodo ESP32 de «{parcelaSensor?.name}» con su dirección MAC. Desde entonces la parcela recibe lecturas reales
              y el simulador deja de escribir en ella.
            </DialogDescription>
          </DialogHeader>
          {sensor.token ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-on-surface">
                Sensor <span className="font-mono font-semibold">{sensor.mac}</span> vinculado. Copie esta clave en el firmware del nodo
                (<span className="font-mono">DEVICE_TOKEN</span>): <strong>no se volverá a mostrar</strong>.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={sensor.token} className="font-mono text-xs bg-surface-high border-0 h-11" onFocus={(e) => e.target.select()} />
                <Button onClick={copiarToken} className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] border-0 h-11">
                  <span className="material-symbols-outlined text-base mr-1">{sensor.copiado ? 'check' : 'content_copy'}</span>
                  {sensor.copiado ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {parcelaSensor?.sensorMac && (
                <div className="bg-success-container rounded-lg p-3 text-sm text-on-surface">
                  <p>Vinculado: <span className="font-mono font-semibold">{parcelaSensor.sensorMac}</span></p>
                  <p className="text-on-surface-variant mt-0.5">
                    Última lectura: {parcelaSensor.sensorUltimaLectura ? new Date(parcelaSensor.sensorUltimaLectura).toLocaleString('es-BO') : 'todavía no recibida'}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface">Dirección MAC del ESP32</label>
                <Input
                  value={sensor.mac}
                  onChange={(e) => setSensor({ ...sensor, mac: e.target.value })}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="font-mono bg-surface-high border-0 h-11 rounded-lg"
                />
                <p className="text-xs text-on-surface-variant">El firmware la muestra en el monitor serie al encender el nodo.</p>
              </div>
              {sensor.error && <p className="text-sm text-[var(--error)]">{sensor.error}</p>}
            </div>
          )}
          <div className="flex justify-end gap-3">
            {sensor.token ? (
              <Button onClick={() => setParcelaSensor(null)} className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] border-0">Listo</Button>
            ) : (
              <>
                {parcelaSensor?.sensorMac && (
                  <Button variant="outline" onClick={desvincularSensor} disabled={sensor.guardando} className="bg-surface-high border-0 hover:bg-error-container hover:text-[var(--error)] mr-auto">
                    Desvincular
                  </Button>
                )}
                <Button variant="outline" onClick={() => setParcelaSensor(null)} className="bg-surface-high border-0">Cancelar</Button>
                <Button
                  onClick={vincularSensor}
                  disabled={sensor.guardando || !sensor.mac.trim()}
                  className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] border-0"
                >
                  {sensor.guardando ? 'Guardando…' : parcelaSensor?.sensorMac ? 'Generar nueva clave' : 'Vincular'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dar de baja */}
      <Dialog open={!!parcelaBaja} onOpenChange={(abierto) => { if (!abierto) setParcelaBaja(null) }}>
        <DialogContent className="sm:max-w-md border-0 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-headline text-on-surface">Dar de baja la parcela</DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              «{parcelaBaja?.name}» dejará de aparecer en el mapa, el tablero y el monitoreo. No se elimina: su bitácora y lecturas
              se conservan en la vista Historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">Motivo</label>
              <Select value={baja.motivo || undefined} onValueChange={(v) => setBaja({ ...baja, motivo: v as MotivoBaja })}>
                <SelectTrigger className="bg-surface-high border-0 h-11 rounded-lg w-full">
                  <SelectValue placeholder="Seleccione el motivo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(MOTIVOS_BAJA) as [MotivoBaja, string][]).map(([valor, texto]) => (
                    <SelectItem key={valor} value={valor}>{texto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">
                Observación {baja.motivo === 'otro' ? '' : <span className="font-normal text-on-surface-variant">(opcional)</span>}
              </label>
              <Textarea
                rows={3}
                maxLength={500}
                value={baja.observacion}
                onChange={(e) => setBaja({ ...baja, observacion: e.target.value })}
                className="bg-surface-high border-0"
                placeholder="Ej.: El propietario cerró el terreno al finalizar la campaña de invierno."
              />
            </div>
            {baja.error && <p className="text-sm text-[var(--error)]">{baja.error}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setParcelaBaja(null)} className="bg-surface-high border-0">Cancelar</Button>
            <Button
              onClick={confirmarBaja}
              disabled={!baja.motivo || baja.guardando || (baja.motivo === 'otro' && baja.observacion.trim().length < 5)}
              className="bg-[var(--error)] hover:bg-[var(--error)]/90 text-white border-0"
            >
              {baja.guardando ? 'Dando de baja…' : 'Dar de baja'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
