import type { EvidenceState } from '@/lib/alertEngine'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'

/**
 * Evidence state as text. Emphasis — not colour — carries the state, so the
 * layer colours (Space cyan, AI iris, Ground mint) keep their meaning and the
 * alert colours stay reserved for the decision.
 */
const STYLE: Record<EvidenceState, string> = {
  confirmed: 'bg-fg text-surface font-semibold',
  contributing: 'border border-fg/55 text-fg font-medium',
  observed: 'bg-fg/[0.07] text-fg/80',
  'not-triggered': 'text-muted',
  stale: 'border border-dashed border-watch/60 text-watch',
  unavailable: 'border border-dashed border-muted/50 text-muted',
}

export function StatePill({ state, className }: { state: EvidenceState; className?: string }) {
  const { t } = useLang()
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center rounded-md px-2 text-[10.5px] leading-none tracking-[0.06em] whitespace-nowrap uppercase',
        STYLE[state],
        className,
      )}
    >
      {t(`state.${state}`)}
    </span>
  )
}
