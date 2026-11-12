import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'

interface IllustrativeNoteProps {
  /** Defaults to the required CLAUDE.md wording. */
  title?: string
  children?: ReactNode
  className?: string
}

/** Callout attached to any invented demo threshold or rule. */
export function IllustrativeNote({
  title = 'Illustrative demo threshold — not operational',
  children,
  className,
}: IllustrativeNoteProps) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-md border border-dashed border-line-strong bg-canvas/40 px-3 py-2.5',
        className,
      )}
    >
      <Info size={14} strokeWidth={2} aria-hidden className="mt-px shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="label-micro text-fg">{title}</p>
        {children != null ? <div className="mt-1 text-xs text-muted">{children}</div> : null}
      </div>
    </div>
  )
}
