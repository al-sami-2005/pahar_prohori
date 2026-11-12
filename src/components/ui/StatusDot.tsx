import { cn } from '@/lib/cn'
import { toneBg, type Tone } from '@/lib/tones'

interface StatusDotProps {
  tone: Tone
  /** Slow radar-like pulse (2.8 s). Disabled under reduced motion. */
  pulse?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/** Decorative only — meaning must always be carried by adjacent text. */
export function StatusDot({ tone, pulse = false, size = 'sm', className }: StatusDotProps) {
  const dim = size === 'sm' ? 'size-1.5' : 'size-2'
  return (
    <span aria-hidden className={cn('relative inline-flex shrink-0', dim, className)}>
      {pulse ? (
        <span className={cn('absolute inset-0 rounded-full animate-sensor-pulse', toneBg[tone])} />
      ) : null}
      <span className={cn('relative inline-flex rounded-full', dim, toneBg[tone])} />
    </span>
  )
}
