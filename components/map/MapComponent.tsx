'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L, { LeafletMouseEvent } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from './map-view'
import { getCropColor, getCropNameById } from '@/lib/crops'

interface MarcadorConNota extends MapPoint {
  nota?: string
}

interface Cultivo {
  tipo_cultivo_id: number
  nombre: string
}

interface MapComponentProps {
  mode: 'view' | 'polygon' | 'marker'
  currentPoints: MapPoint[]
  setCurrentPoints: React.Dispatch<React.SetStateAction<MapPoint[]>>
  markers: MarcadorConNota[]
  onAddMarker: (coords: MapPoint) => void
  parcels: any[]
  cultivos: Cultivo[]
  /** Parcela a encuadrar y resaltar (desde "Ver en Mapa") */
  focusId?: string | null
  onSelectParcel?: (parcelId: string) => void
}

/**
 * Encuadra el mapa en las parcelas del usuario la primera vez que cargan,
 * o en la parcela enfocada abriendo su ficha.
 */
function EncuadreParcelas({ parcels, focusId, capas }: { parcels: any[]; focusId?: string | null; capas: React.MutableRefObject<Record<string, L.Polygon>> }) {
  const map = useMap()
  const encuadreInicial = useRef(false)

  useEffect(() => {
    const conGeometria = parcels.filter((p) => p.coordinates?.length >= 3)
    if (conGeometria.length === 0) return

    const enfocada = focusId ? conGeometria.find((p) => p.id === focusId) : null
    if (enfocada) {
      map.flyToBounds(L.latLngBounds(enfocada.coordinates.map((c: MapPoint) => [c.lat, c.lng])), { padding: [60, 60], maxZoom: 17, duration: 0.8 })
      map.once('moveend', () => capas.current[enfocada.id]?.openPopup())
      encuadreInicial.current = true
      return
    }

    if (!encuadreInicial.current) {
      const todos = conGeometria.flatMap((p) => p.coordinates.map((c: MapPoint) => [c.lat, c.lng] as [number, number]))
      map.fitBounds(L.latLngBounds(todos), { padding: [40, 40], maxZoom: 15 })
      encuadreInicial.current = true
    }
  }, [parcels, focusId, map, capas])

  return null
}

export function MapComponent({ 
  mode, 
  currentPoints, 
  setCurrentPoints, 
  markers, 
  onAddMarker, 
  parcels,
  cultivos,
  focusId,
  onSelectParcel
}: MapComponentProps) {
  const capas = useRef<Record<string, L.Polygon>>({})
  
  // Rastrear el zoom actual para ocultar/mostrar las etiquetas
  const [zoomLevel, setZoomLevel] = useState(12)

  function MapEvents() {
    const map = useMapEvents({
      click(e: LeafletMouseEvent) {
        if (mode === 'polygon') {
          setCurrentPoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }])
        } else if (mode === 'marker') {
          onAddMarker({ lat: e.latlng.lat, lng: e.latlng.lng })
        }
      },
      zoomend() {
        // Actualizamos el estado cada vez que el usuario hace scroll con la rueda
        setZoomLevel(map.getZoom())
      }
    })
    return null
  }

  return (
    <MapContainer 
      id="mapa-satelital-agro-control"
      center={[-17.789, -63.197]} 
      zoom={12} 
      style={{ width: '100%', height: '70vh' }}
    >
      <TileLayer
        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        attribution="&copy; Google Maps"
      />
      
      <MapEvents />
      <EncuadreParcelas parcels={parcels} focusId={focusId} capas={capas} />

      {currentPoints.length >= 3 && (
        <Polygon 
          positions={currentPoints.map(p => [p.lat, p.lng])} 
          pathOptions={{ color: '#8dc63f', dashArray: '5, 5', fillColor: 'rgba(141, 198, 63, 0.25)' }} 
        />
      )}

      {currentPoints.map((p, idx) => (
        <CircleMarker 
          key={`vertex-${idx}`} 
          center={[p.lat, p.lng]} 
          radius={6}
          pathOptions={{ color: '#002147', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
        />
      ))}

      {markers.map((m, idx) => (
        <CircleMarker
          key={`marker-${idx}`}
          center={[m.lat, m.lng]}
          radius={8}
          pathOptions={{ color: '#ffffff', fillColor: '#dc2626', fillOpacity: 1, weight: 2 }}
        >
          {m.nota && (
            <Popup>
              <div className="text-sm font-sans p-1">
                <p className="font-semibold text-gray-800 flex items-center mb-1">
                  <span className="material-symbols-outlined text-[18px] mr-1 text-red-600">push_pin</span>
                  Referencia
                </p>
                <p className="text-gray-600 ml-5">{m.nota}</p>
              </div>
            </Popup>
          )}
        </CircleMarker>
      ))}

      {/* Con zoom lejano los polígonos son demasiado pequeños: se muestra un marcador por parcela */}
      {zoomLevel < 13 && parcels.filter((p) => p.coordinates?.length >= 3).map((parcel) => {
        const lat = parcel.coordinates.reduce((s: number, c: MapPoint) => s + c.lat, 0) / parcel.coordinates.length
        const lng = parcel.coordinates.reduce((s: number, c: MapPoint) => s + c.lng, 0) / parcel.coordinates.length
        return (
          <CircleMarker
            key={`centro-${parcel.id}`}
            center={[lat, lng]}
            radius={8}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: getCropColor(parcel.cropType), fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelectParcel?.(parcel.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>{parcel.name}</Tooltip>
          </CircleMarker>
        )
      })}

      {parcels.map((parcel) => {
        if (!parcel.coordinates || parcel.coordinates.length < 3) {
          return null
        }

        const cultivoEncontrado = cultivos.find(
          (c) => c.tipo_cultivo_id.toString() === parcel.cropType?.toString()
        )
        const nombreCultivo = cultivoEncontrado ? cultivoEncontrado.nombre : getCropNameById(parcel.cropType)
        const colorCultivo = getCropColor(parcel.cropType)
        const enfocada = parcel.id === focusId

        return (
          <Polygon 
            key={parcel.id}
            ref={(capa) => {
              if (capa) capas.current[parcel.id] = capa
            }}
            positions={parcel.coordinates.map((p: MapPoint) => [p.lat, p.lng])}
            pathOptions={{
              color: enfocada ? '#ffffff' : colorCultivo,
              fillColor: colorCultivo,
              fillOpacity: enfocada ? 0.5 : 0.35,
              weight: enfocada ? 3.5 : 2.5
            }}
          >
            {/* Solo mostramos la etiqueta flotante si el zoom es 13 o más cercano */}
            {zoomLevel >= 13 && (
              <Tooltip 
                direction="center" 
                permanent 
                className="bg-transparent border-0 shadow-none text-center"
              >
                <div className="bg-white/90 px-2 py-1 rounded shadow-sm inline-block">
                  <span className="font-bold text-gray-800 text-xs block">{parcel.name}</span>
                  <span className="text-[10px] text-gray-600">{parcel.area} ha</span>
                </div>
              </Tooltip>
            )}

            <Popup>
              <div className="text-sm font-sans min-w-[180px] p-1">
                <h3 className="font-bold text-base text-[var(--primary)] border-b pb-2 mb-2 flex items-center">
                  <span className="material-symbols-outlined mr-1">landscape</span>
                  {parcel.name}
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="flex items-start">
                    <span className="material-symbols-outlined text-[18px] mr-2 text-gray-400">location_on</span>
                    <span className="leading-tight"><strong>Ubicación:</strong><br/>{parcel.ubicacion_nombre}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="material-symbols-outlined text-[18px] mr-2 text-[var(--tertiary)]">eco</span>
                    <span><strong>Cultivo:</strong> {nombreCultivo}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="material-symbols-outlined text-[18px] mr-2 text-[var(--primary-container)]">aspect_ratio</span>
                    <span><strong>Superficie:</strong> {parcel.area} ha</span>
                  </p>
                </div>
              </div>
            </Popup>
          </Polygon>
        )
      })}
    </MapContainer>
  )
}