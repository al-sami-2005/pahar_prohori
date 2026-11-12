import type { AlertLevel } from '@/types/domain'
import { cn } from '@/lib/cn'
import { ALERT_META } from '@/lib/alertLevels'
import { toneBorder, toneSoft, toneText } from '@/lib/tones'

type Size = 'sm' | 'md' | 'lg'

interface AlertBadgeProps {
  level: AlertLevel
  size?: Size
  /** Append the Bengali level name. */
  bilingual?: boolean
  /** Solid fill — reserved for the top-level EVACUATE banner. */
  solid?: boolean
  className?: string
}

const sizeClass: Record<Size, string> = {
  sm: 'h-6 gap-1.5 px-2 text-[11px] rounded-sm',
  md: 'h-8 gap-2 px-2.5 text-xs rounded-md',
  lg: 'h-11 gap-2.5 px-3.5 text-base rounded-md',
}

const iconSize: Record<Size, number> = { sm: 12, md: 14, lg: 18 }

/**
 * Alert state is never colour-only: icon + state name (+ Bengali) always shown.
 */
export function AlertBadge({
  level,
  size = 'md',
  bilingual = false,
  solid = false,
  className,
}: AlertBadgeProps) {
  const meta = ALERT_META[level]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center border font-semibold uppercase tracking-[0.08em] whitespace-nowrap',
        sizeClass[size],
        solid
          ? 'border-transparent bg-evacuate text-white'
          : cn(toneSoft[meta.tone], toneBorder[meta.tone], toneText[meta.tone]),
        level === 'evacuate' && size === 'lg' && 'animate-evacuate-breathe',
        className,
      )}
    >
      <Icon size={iconSize[size]} strokeWidth={2.25} aria-hidden className="shrink-0" />
      <span>{meta.label}</span>
      {bilingual ? (
        <span
          lang="bn"
          className="translate-y-px border-l border-current/30 pl-2 leading-none font-medium normal-case tracking-normal"
        >
          {meta.labelBn}
        </span>
      ) : null}
    </span>
  )
}
