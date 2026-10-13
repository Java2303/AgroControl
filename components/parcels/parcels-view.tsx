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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ParcelShape } from '@/components/parcels/parcel-shape'
import { CULTIVOS_CIAT_SANTA_CRUZ, getCropColor, getCropNameById } from '@/lib/crops'
import { apiFetch } from '@/lib/api-client'
import { useParcels } from '@/lib/hooks/use-parcels'
import { useSensors } from '@/lib/hooks/use-sensors'
import { STATUS_CHIP, STATUS_LABEL, estadosPorParcela } from '@/lib/sensor-theme'

export function ParcelsView() {
  const { navigate, focusParcelOnMap } = useApp()
  const { parcels, setParcels, loading, error } = useParcels()
  const { readings } = useSensors()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCrop, setFilterCrop] = useState<string>('all')
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [parcelToDelete, setParcelToDelete] = useState<string | null>(null)
  const [editData, setEditData] = useState({ name: '', cropType: '' })
  const [accionError, setAccionError] = useState<string | null>(null)

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

  const handleDeleteConfirm = async () => {
    if (!parcelToDelete) return
    try {
      await apiFetch(`/parcelas/${parcelToDelete}`, { method: 'DELETE' })
      setParcels(parcels.filter((p) => p.id !== parcelToDelete))
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : 'No se pudo eliminar la parcela.')
    } finally {
      setParcelToDelete(null)
      setShowDeleteDialog(false)
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

                  {/* Siempre visibles en pantallas táctiles; en escritorio aparecen al pasar el cursor */}
                  <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-smooth">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => focusParcelOnMap(parcel.id)}
                      className="flex-1 bg-surface-high border-0 hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-base mr-1">map</span>
                      Ver en Mapa
                    </Button>
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
                      onClick={() => {
                        setParcelToDelete(parcel.id)
                        setShowDeleteDialog(true)
                      }}
                      className="bg-surface-high border-0 hover:bg-error-container hover:text-[var(--error)]"
                      aria-label="Eliminar parcela"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
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

      {/* Eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-0 shadow-elevated">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-headline text-on-surface">¿Eliminar parcela?</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              Esta acción no se puede deshacer. La parcela y todos sus datos serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface-high border-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-[var(--error)] hover:bg-[var(--error)]/90 border-0">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
