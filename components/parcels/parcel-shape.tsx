import type { MapPoint } from '@/lib/types'

interface ParcelShapeProps {
  coordinates?: MapPoint[]
  color: string
  className?: string
}

const ANCHO = 160
const ALTO = 96
const MARGEN = 12

/**
 * Miniatura del polígono de la parcela. Proyecta lat/lng a un plano local
 * (corrigiendo la longitud por cos(lat)) y lo escala para llenar el recuadro.
 */
export function ParcelShape({ coordinates, color, className }: ParcelShapeProps) {
  const patternId = `grid-${color.replace('#', '')}`

  let puntos = ''
  if (coordinates && coordinates.length >= 3) {
    const latMedia = coordinates.reduce((s, p) => s + p.lat, 0) / coordinates.length
    const k = Math.cos((latMedia * Math.PI) / 180)
    const xs = coordinates.map((p) => p.lng * k)
    const ys = coordinates.map((p) => -p.lat)
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const escala = Math.min((ANCHO - MARGEN * 2) / (maxX - minX || 1), (ALTO - MARGEN * 2) / (maxY - minY || 1))
    const offX = (ANCHO - (maxX - minX) * escala) / 2
    const offY = (ALTO - (maxY - minY) * escala) / 2
    puntos = xs.map((x, i) => `${(offX + (x - minX) * escala).toFixed(1)},${(offY + (ys[i] - minY) * escala).toFixed(1)}`).join(' ')
  }

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className={className} role="img" aria-label="Forma de la parcela">
      <defs>
        <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="var(--outline)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="var(--surface-container-low)" />
      <rect width={ANCHO} height={ALTO} fill={`url(#${patternId})`} />
      {puntos ? (
        <polygon points={puntos} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      ) : (
        <text x={ANCHO / 2} y={ALTO / 2} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--on-surface-variant)">
          Sin geometría
        </text>
      )}
      {/* Indicador de norte */}
      <g transform={`translate(${ANCHO - 14} 14)`} fill="var(--on-surface-variant)">
        <path d="M0 -7 L4 4 L0 1.5 L-4 4 Z" />
      </g>
    </svg>
  )
}
