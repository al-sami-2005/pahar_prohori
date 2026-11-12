import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export interface SparkSeries {
  values: readonly number[]
  /** Tailwind stroke class, e.g. "stroke-satellite". */
  stroke: string
  /** Optional soft area under the line (Tailwind fill class). */
  fill?: string
  /** Resting value drawn as a flat dashed line when there is no history. */
  rest?: number
  strokeWidth?: number
}

interface SparklineProps {
  series: readonly SparkSeries[]
  /** Frames across the full width — the x axis is the whole scenario, so lines grow left → right. */
  total: number
  min: number
  max: number
  threshold?: { value: number; label: string }
  /** Text equivalent for assistive tech. */
  label: string
  height?: number
  className?: string
}

/** Measures its own width so lines and dots are drawn in real pixels (no stretched strokes). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)))
    ro.observe(el)
    setWidth(Math.round(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Compact live chart for the drawer. Restrained on purpose: no axes, one
 * optional illustrative threshold, the current value as a dot.
 */
export function Sparkline({ series, total, min, max, threshold, label, height = 40, className }: SparklineProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const pad = 3
  const h = height
  const x = (i: number) => pad + (i / Math.max(1, total - 1)) * (width - pad * 2)
  const y = (v: number) => pad + (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min)) * (h - pad * 2)

  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height: h }}>
      {width > 0 ? (
        <svg width={width} height={h} role="img" aria-label={label} className="block overflow-visible">
          <line x1={pad} x2={width - pad} y1={h - pad} y2={h - pad} className="stroke-white/[0.07]" strokeWidth={1} />
          {threshold ? (
            <g>
              <line
                x1={pad}
                x2={width - pad}
                y1={y(threshold.value)}
                y2={y(threshold.value)}
                className="stroke-muted/45"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={width - pad}
                y={y(threshold.value) - 3}
                textAnchor="end"
                className="fill-muted font-mono text-[9.5px]"
              >
                {threshold.label}
              </text>
            </g>
          ) : null}
          {series.map((s, si) => {
            const n = s.values.length
            if (n === 0) {
              if (s.rest === undefined) return null
              return (
                <line
                  key={si}
                  x1={pad}
                  x2={width - pad}
                  y1={y(s.rest)}
                  y2={y(s.rest)}
                  className={cn(s.stroke, 'opacity-45')}
                  strokeWidth={s.strokeWidth ?? 1.5}
                  strokeDasharray="2 4"
                />
              )
            }
            // Keep the path light: about one point every 2 px.
            const step = Math.max(1, Math.floor(total / Math.max(1, width / 2)))
            const pts: Array<[number, number]> = []
            for (let i = 0; i < n; i += step) pts.push([x(i), y(s.values[i]!)])
            pts.push([x(n - 1), y(s.values[n - 1]!)])
            const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('')
            const last = pts[pts.length - 1]!
            return (
              <g key={si}>
                {s.fill ? (
                  <path d={`${d}L${last[0].toFixed(1)} ${h - pad}L${pad} ${h - pad}Z`} className={s.fill} stroke="none" />
                ) : null}
                <path
                  d={d}
                  fill="none"
                  className={s.stroke}
                  strokeWidth={s.strokeWidth ?? 1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={last[0]} cy={last[1]} r={2.6} className={cn(s.stroke, 'fill-canvas')} strokeWidth={1.5} />
              </g>
            )
          })}
        </svg>
      ) : null}
    </div>
  )
}
