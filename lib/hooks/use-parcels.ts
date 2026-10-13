'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useApp } from '@/lib/app-context'
import type { MapPoint, Parcel } from '@/lib/types'

interface ParcelaApi {
  id: string
  nombre: string
  ubicacion_nombre?: string
  cropType: number | string | null
  area: string | number
  createdAt?: string
  geom?: string | { coordinates?: number[][][] }
}

/** Convierte el GeoJSON (Polygon) de PostGIS en vértices lat/lng sin el punto de cierre. */
function geomACoordenadas(geom: ParcelaApi['geom']): MapPoint[] {
  if (!geom) return []
  try {
    const geomObj = typeof geom === 'string' ? JSON.parse(geom) : geom
    const anillo: number[][] | undefined = geomObj?.coordinates?.[0]
    if (!anillo) return []
    const coords = anillo.map(([lng, lat]) => ({ lat, lng }))
    const primero = coords[0]
    const ultimo = coords[coords.length - 1]
    if (coords.length > 1 && primero.lat === ultimo.lat && primero.lng === ultimo.lng) coords.pop()
    return coords
  } catch {
    return []
  }
}

function mapearParcela(p: ParcelaApi): Parcel {
  return {
    id: p.id,
    name: p.nombre,
    cropType: p.cropType != null ? p.cropType.toString() : '1',
    ubicacion_nombre: p.ubicacion_nombre,
    area: parseFloat(String(p.area)),
    soilStatus: 'optimo',
    coordinates: geomACoordenadas(p.geom),
    createdAt: p.createdAt,
  }
}

/** Parcelas del usuario autenticado (GET /api/parcelas). */
export function useParcels() {
  const { setParcels: setParcelasGlobal } = useApp()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      const resultado = await apiFetch<{ data: ParcelaApi[] }>('/parcelas')
      const parcelas = (resultado.data || []).map(mapearParcela)
      setParcels(parcelas)
      setParcelasGlobal(parcelas) // usado por la exportación de respaldo en Ajustes
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las parcelas.')
    } finally {
      setLoading(false)
    }
  }, [setParcelasGlobal])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { parcels, setParcels, loading, error, recargar }
}
