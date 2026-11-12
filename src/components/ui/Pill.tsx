import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'pending' | 'nasa' | 'simulated' | 'accent' | 'neutral'

const variantClass: Record<Variant, string> = {
  // Dashed = not a measurement / not yet computed.
  pending: 'border-dashed border-line-strong text-fg/85',
  simulated: 'border-dashed border-line-strong text-fg/85',
  nasa: 'border-satellite/40 bg-satellite/[0.07] text-satellite',
  accent: 'border-accent/40 bg-accent/[0.08] text-accent',
  neutral: 'border-hairline bg-fg/[0.04] text-muted',
}

/** Sentence-case status pill (the product UI avoids uppercase micro-labels). */
export function Pill({
  variant = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  variant?: Variant
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs whitespace-nowrap',
        variantClass[variant],
        className,
      )}
    >
      {Icon ? <Icon size={12} strokeWidth={2} aria-hidden className="shrink-0" /> : null}
      {children}
    </span>
  )
}
