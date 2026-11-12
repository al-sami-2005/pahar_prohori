import type { Confidence } from '@/types/domain'
import { cn } from '@/lib/cn'
import { CONFIDENCE_META } from '@/lib/alertLevels'
import { useLang } from '@/lib/i18n'

interface ConfidenceMeterProps {
  confidence: Confidence
  showLabel?: boolean
  className?: string
}

/** Three-bar uncertainty indicator; always paired with a text label. */
export function ConfidenceMeter({ confidence, showLabel = true, className }: ConfidenceMeterProps) {
  const meta = CONFIDENCE_META[confidence]
  const { t } = useLang()
  const label = t(`confidence.${confidence}`)
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden className="inline-flex items-end gap-0.5">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              'w-1 rounded-[1px]',
              bar === 1 ? 'h-1.5' : bar === 2 ? 'h-2.5' : 'h-3.5',
              bar <= meta.bars ? 'bg-fg' : 'bg-line-strong',
            )}
          />
        ))}
      </span>
      {showLabel ? <span className="text-xs text-muted">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  )
}
