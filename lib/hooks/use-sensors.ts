'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import type { ResumenNPK, SensorReading } from '@/lib/types'

const INTERVALO_MS = 15000

/** Lecturas actuales de los sensores del usuario, actualizadas cada 15 s (GET /api/sensores). */
export function useSensors() {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [resumen, setResumen] = useState<ResumenNPK | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizado, setActualizado] = useState<Date | null>(null)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      try {
        const resultado = await apiFetch<{ data: any[]; resumen?: ResumenNPK }>('/sensores')
        if (!activo) return
        setReadings((resultado.data || []).map((s) => ({ ...s, lastUpdate: new Date(s.lastUpdate) })))
        setResumen(resultado.resumen ?? null)
        setActualizado(new Date())
        setError(null)
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron cargar los sensores.')
      } finally {
        if (activo) setLoading(false)
      }
    }

    cargar()
    const intervalo = setInterval(cargar, INTERVALO_MS)
    return () => {
      activo = false
      clearInterval(intervalo)
    }
  }, [])

  return { readings, resumen, loading, error, actualizado }
}
