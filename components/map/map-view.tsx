'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { CULTIVOS_CIAT_SANTA_CRUZ, getCropColor, getCropNameById } from '@/lib/crops'
import { apiFetch, ApiError } from '@/lib/api-client'
import { useParcels } from '@/lib/hooks/use-parcels'

const MapComponent = dynamic(
  () => import('./MapComponent').then((mod) => mod.MapComponent),
  { ssr: false, loading: () => <div className="h-[70vh] bg-surface-high flex items-center justify-center text-on-surface">Cargando mapa satelital...</div> }
)

export interface MapPoint {
  lat: number
  lng: number
  nota?: string // Permitimos que el punto guarde una nota de texto
}

interface Cultivo {
  tipo_cultivo_id: number
  nombre: string
}

export function MapView() {
  const { state, focusParcelOnMap } = useApp()
  const { parcels, setParcels } = useParcels()
  const [currentPoints, setCurrentPoints] = useState<MapPoint[]>([])
  const [markers, setMarkers] = useState<MapPoint[]>([])
  const [mode, setMode] = useState<'view' | 'polygon' | 'marker'>('view')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [cultivos, setCultivos] = useState<Cultivo[]>(CULTIVOS_CIAT_SANTA_CRUZ)
  const [newParcelData, setNewParcelData] = useState({ name: '', cropType: '1', ubicacion_nombre: '' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showMarkerDialog, setShowMarkerDialog] = useState(false)
  const [tempMarkerCoords, setTempMarkerCoords] = useState<MapPoint | null>(null)
  const [markerDescription, setMarkerDescription] = useState('')

  // Catálogo de cultivos desde el backend (o el estático del CIAT si falla)
  useEffect(() => {
    apiFetch<{ data: Cultivo[] }>('/cultivos')
      .then((resultado) => {
        if (resultado.data?.length) setCultivos(resultado.data)
      })
      .catch(() => {})
  }, [])

  // Leyenda: solo los cultivos presentes en las parcelas del usuario
  const cultivosEnMapa = [...new Set(parcels.map((p) => p.cropType))]

  const calculateArea = (points: MapPoint[]): number => {
    if (points.length < 3) return 0
    let area = 0
    const factorMetros = 111320
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      const x1 = points[i].lng * factorMetros * Math.cos(points[i].lat * (Math.PI / 180))
      const y1 = points[i].lat * factorMetros
      const x2 = points[j].lng * factorMetros * Math.cos(points[j].lat * (Math.PI / 180))
      const y2 = points[j].lat * factorMetros
      area += x1 * y2 - x2 * y1
    }
    return Math.abs(area / 2) / 10000
  }

  const handleCreateParcel = async () => {
    setCreateError(null)

    if (!newParcelData.name.trim()) {
      setCreateError('Por favor ingrese un nombre para el lote / parcela.')
      return
    }

    if (!newParcelData.ubicacion_nombre.trim()) {
      setCreateError('Por favor ingrese el municipio o ubicación (ej: Montero, San Pedro).')
      return
    }

    if (currentPoints.length < 3) {
      setCreateError('Debe trazar al menos 3 vértices en el mapa para formar un polígono.')
      return
    }

    const area = calculateArea(currentPoints)
    if (area > 50) {
      setCreateError(`La superficie (${area.toFixed(2)} ha) excede el límite permitido por el CIAT de 50 ha.`)
      return
    }

    setIsSaving(true)

    try {
      const coordenadasGeoJSON = [
        ...currentPoints.map(p => [p.lng, p.lat]),
        [currentPoints[0].lng, currentPoints[0].lat]
      ]

      const resultado = await apiFetch<{ data: { parcela_id: string } }>('/parcelas', {
        method: 'POST',
        body: JSON.stringify({
          nombre: newParcelData.name.trim(),
          ubicacion_nombre: newParcelData.ubicacion_nombre.trim(),
          tipo_cultivo_id: parseInt(newParcelData.cropType || '1', 10),
          area_hectareas: parseFloat(area.toFixed(2)),
          geometria: { type: 'Polygon', coordinates: [coordenadasGeoJSON] }
        })
      })

      setParcels([...parcels, {
        id: resultado.data.parcela_id,
        name: newParcelData.name.trim(),
        cropType: newParcelData.cropType || '1',
        ubicacion_nombre: newParcelData.ubicacion_nombre.trim(),
        area: parseFloat(area.toFixed(2)),
        soilStatus: 'optimo',
        coordinates: currentPoints,
        createdAt: new Date().toISOString()
      }])
      setCurrentPoints([])
      setNewParcelData({ name: '', cropType: '1', ubicacion_nombre: '' })
      setShowCreateDialog(false)
      setMode('view')
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setCreateError('Tu rol no tiene permisos para registrar parcelas.')
      } else {
        setCreateError(error instanceof Error ? error.message : 'Error de red al comunicarse con el servidor.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleMapClickForMarker = (coords: MapPoint) => {
    setTempMarkerCoords(coords)
    setShowMarkerDialog(true)
  }

  return (
    <div className="space-y-6">
      <header className="pt-4">
        <div>
          <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider mb-2">
            Herramienta Satelital CIAT
          </p>
          <h1 className="text-display-md text-on-surface">Mapa de Parcelas</h1>
        </div>
      </header>

      {/* Barra de herramientas responsiva */}
      <Card className="bg-surface-lowest shadow-ambient border-0">
        <CardContent className="p-4 grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center">
          <Button
            variant={mode === 'view' ? 'default' : 'outline'} size="sm" onClick={() => setMode('view')}
            className={mode === 'view' ? 'bg-[var(--primary)] text-[var(--on-primary)] border-0 w-full md:w-auto' : 'bg-surface-high border-0 w-full md:w-auto'}
          >
            <span className="material-symbols-outlined text-lg mr-1">pan_tool</span> Ver Mapa
          </Button>
          
          <Button
            variant={mode === 'polygon' ? 'default' : 'outline'} size="sm" onClick={() => setMode('polygon')}
            className={mode === 'polygon' ? 'bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] border-0 w-full md:w-auto' : 'bg-surface-high border-0 w-full md:w-auto'}
          >
            <span className="material-symbols-outlined text-lg mr-1">polyline</span> Dibujar Parcela
          </Button>

          <Button
            variant={mode === 'marker' ? 'default' : 'outline'} size="sm" onClick={() => setMode('marker')}
            className={mode === 'marker' ? 'bg-[var(--warning)] text-white border-0 w-full md:w-auto' : 'bg-surface-high border-0 w-full md:w-auto'}
          >
            <span className="material-symbols-outlined text-lg mr-1">location_on</span> Punto Referencia
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => { setCurrentPoints([]); setMarkers([]); }} className="bg-surface-high border-0 w-full md:w-auto">
            <span className="material-symbols-outlined text-lg mr-1">delete</span> Limpiar Todo
          </Button>

          {currentPoints.length >= 3 && (
            <Button
              size="sm" onClick={() => setShowCreateDialog(true)}
              className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] border-0 col-span-2 md:ml-auto md:w-auto"
            >
              <span className="material-symbols-outlined text-lg mr-1">check</span> Guardar Parcela
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contenedor del Mapa */}
      <Card className="bg-surface-lowest shadow-ambient border-0 overflow-hidden relative">
        <MapComponent 
          mode={mode} 
          currentPoints={currentPoints} 
          setCurrentPoints={setCurrentPoints} 
          markers={markers}
          onAddMarker={handleMapClickForMarker} // 📝 Conectado a la función de control
          parcels={parcels}
          cultivos={cultivos}
          focusId={state.mapFocusId}
          onSelectParcel={focusParcelOnMap}
        />

        {/* Leyenda de cultivos */}
        {cultivosEnMapa.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[500] max-w-[calc(100%-2rem)] rounded-xl bg-surface-lowest/95 backdrop-blur px-4 py-3 shadow-elevated">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Cultivos</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
              {cultivosEnMapa.map((id) => (
                <li key={id} className="flex items-center gap-1.5 text-xs font-medium text-on-surface">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: getCropColor(id) }} />
                  {getCropNameById(id)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* 🌾 Diálogo 1: Registrar Parcela */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md border-0 shadow-elevated z-[10000]">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Parcela</DialogTitle>
            <DialogDescription>
              Superficie estimada: <span className="font-bold text-[var(--tertiary)]">{calculateArea(currentPoints).toFixed(2)} ha</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Nombre del Lote</FieldLabel>
                <Input placeholder="Ej: Lote Soya Norte" value={newParcelData.name} onChange={(e) => setNewParcelData({ ...newParcelData, name: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Municipio / Ubicación</FieldLabel>
                <Input placeholder="Ej: Montero, San Pedro" value={newParcelData.ubicacion_nombre} onChange={(e) => setNewParcelData({ ...newParcelData, ubicacion_nombre: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Tipo de Cultivo</FieldLabel>
                <Select value={newParcelData.cropType} onValueChange={(val) => setNewParcelData({ ...newParcelData, cropType: val })}>
                  <SelectTrigger><SelectValue placeholder="Seleccione cultivo" /></SelectTrigger>
                  <SelectContent className="z-[10005] max-h-60 overflow-y-auto">
                    {cultivos.map((c) => (
                      <SelectItem key={c.tipo_cultivo_id} value={c.tipo_cultivo_id.toString()}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {createError && (
              <div className="p-3 rounded-lg bg-error-container text-[var(--error)] text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{createError}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleCreateParcel} disabled={isSaving} className="bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] border-0">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 📍 Diálogo 2: Registrar Nota del Punto de Referencia */}
      <Dialog open={showMarkerDialog} onOpenChange={setShowMarkerDialog}>
        <DialogContent className="sm:max-w-xs border-0 shadow-elevated z-[10000]">
          <DialogHeader>
            <DialogTitle>Nota del Punto</DialogTitle>
            <DialogDescription>Asigna una etiqueta rápida para este lugar.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Field>
              <FieldLabel>Descripción</FieldLabel>
              <Input 
                placeholder="Ej: Entrada, Pozo, Maquinaria..." 
                value={markerDescription} 
                onChange={(e) => setMarkerDescription(e.target.value)} 
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowMarkerDialog(false); setMarkerDescription(''); }}>Cancelar</Button>
            <Button 
              size="sm" className="bg-[var(--warning)] text-white border-0"
              onClick={() => {
                if (tempMarkerCoords && markerDescription.trim()) {
                  setMarkers(prev => [...prev, { ...tempMarkerCoords, nota: markerDescription }])
                  setShowMarkerDialog(false)
                  setTempMarkerCoords(null)
                  setMarkerDescription('')
                }
              }}
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}