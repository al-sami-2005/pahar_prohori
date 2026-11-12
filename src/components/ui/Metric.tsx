import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { DataProvenance } from '@/types/domain'
import { cn } from '@/lib/cn'
import { toneText, type Tone } from '@/lib/tones'
import { ProvenanceTags } from './ProvenanceTag'

type Size = 'sm' | 'md' | 'lg'

interface MetricProps {
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  icon?: LucideIcon
  /** Colours the value only; the label always stays neutral. */
  tone?: Tone
  size?: Size
  provenance?: DataProvenance
  className?: string
}

const valueSize: Record<Size, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
}

/**
 * Label → value → provenance. Provenance sits under the value so it never
 * truncates the label in narrow grid cells.
 */
export function Metric({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  provenance,
  className,
}: MetricProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="label-micro flex min-w-0 items-center gap-1.5 text-muted">
        {Icon ? <Icon size={12} strokeWidth={2} aria-hidden className="shrink-0" /> : null}
        <span className="truncate">{label}</span>
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('numeric font-medium', valueSize[size], toneText[tone])}>{value}</span>
        {unit ? <span className="text-xs text-muted">{unit}</span> : null}
      </div>
      {provenance != null || hint != null ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {provenance ? <ProvenanceTags provenance={provenance} /> : null}
          {hint != null ? <span className="text-xs text-muted">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
