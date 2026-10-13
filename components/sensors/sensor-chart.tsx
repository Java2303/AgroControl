'use client'

import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

interface SensorChartProps {
  data: number[]
  color: string
  unit: string
  decimals?: number
  height?: number
  /** Rango mínimo visible (p. ej. el óptimo) para no exagerar variaciones pequeñas */
  domain?: [number, number]
}

/** Mini gráfico de área con el historial reciente de un sensor. */
export function SensorChart({ data, color, unit, decimals = 0, height = 64, domain }: SensorChartProps) {
  const gradientId = `grad-${useId().replace(/:/g, '')}`
  const puntos = data.map((valor, i) => ({ i, valor }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={puntos} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis
          hide
          domain={domain ? [(min: number) => Math.min(min, domain[0]), (max: number) => Math.max(max, domain[1])] : ['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.3 }}
          contentStyle={{
            border: 'none',
            borderRadius: 8,
            boxShadow: 'var(--shadow-elevated)',
            fontSize: 12,
            padding: '4px 8px',
          }}
          labelFormatter={() => ''}
          formatter={(valor: number) => [`${valor.toFixed(decimals)} ${unit}`.trim(), 'Lectura']}
        />
        <Area
          type="monotone"
          dataKey="valor"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
