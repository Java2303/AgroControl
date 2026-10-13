interface RangeBarProps {
  value: number
  min: number
  max: number
  optimal: { min: number; max: number }
  color: string
  unit?: string
}

const porcentaje = (v: number, min: number, max: number) =>
  Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))

/** Barra de escala con la franja del rango óptimo y un marcador en el valor actual. */
export function RangeBar({ value, min, max, optimal, color, unit = '' }: RangeBarProps) {
  const inicioOptimo = porcentaje(optimal.min, min, max)
  const finOptimo = porcentaje(optimal.max, min, max)
  const posicion = porcentaje(value, min, max)

  return (
    <div>
      <div className="relative h-2 rounded-full bg-surface-container">
        <div
          className="absolute inset-y-0 rounded-full"
          style={{ left: `${inicioOptimo}%`, width: `${finOptimo - inicioOptimo}%`, backgroundColor: color, opacity: 0.22 }}
        />
        <div
          className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
          style={{ left: `${posicion}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] text-on-surface-variant">
        <span>{min}{unit}</span>
        <span className="font-medium">Óptimo {optimal.min}–{optimal.max}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
