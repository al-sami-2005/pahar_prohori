import { CalendarClock, CircleCheck, Clock3, Hourglass, Lock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import type { KnowledgeState } from '@/data/replayEvidence'

const META: Record<KnowledgeState, { icon: typeof Lock; cls: string }> = {
  // Solid = conservatively usable by the replay date.
  available: { icon: CircleCheck, cls: 'border-solid border-fg/35 text-fg' },
  // Dashed + lock = it did not exist yet; details stay hidden.
  'not-yet': { icon: Lock, cls: 'border-dashed border-line-strong text-muted' },
  // Acquired, but the processed product certainly does not exist yet.
  processing: { icon: Hourglass, cls: 'border-dashed border-satellite/45 text-satellite/90' },
  // Inside the latency window: may exist, not counted as known.
  possible: { icon: Clock3, cls: 'border-dashed border-fg/35 text-fg/85' },
  // Dashed neutral = hindsight: exists now, never a pre-event input.
  'post-event': { icon: CalendarClock, cls: 'border-dashed border-fg/45 text-fg/90' },
}

/** NOT AVAILABLE YET · ACQUIRED — PROCESSING · POSSIBLY AVAILABLE · AVAILABLE BY THIS DATE · POST-EVENT EVIDENCE. */
export function KnowledgeChip({ state, className }: { state: KnowledgeState; className?: string }) {
  const { t, lang } = useLang()
  const m = META[state]
  const Icon = m.icon
  return (
    <span
      data-knowledge={state}
      className={cn(
        'label-micro inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-xs border bg-canvas/40 px-1.5',
        m.cls,
        // Bengali script is not uppercased or letter-spaced.
        lang === 'bn' && 'font-sans tracking-normal normal-case text-[11.5px]',
        className,
      )}
    >
      <Icon size={11} strokeWidth={2.25} aria-hidden className="shrink-0" />
      {t(`kstate.${state}`)}
    </span>
  )
}
