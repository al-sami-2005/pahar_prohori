import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps extends Omit<ComponentProps<'section'>, 'title'> {
  eyebrow?: ReactNode
  title?: ReactNode
  actions?: ReactNode
  floating?: boolean
  bodyClassName?: string
}

/**
 * One calm “map card” surface: generous radius, almost no visible chrome,
 * and a soft shadow. Content creates hierarchy; the box should disappear.
 */
export function Panel({
  eyebrow,
  title,
  actions,
  floating = false,
  className,
  bodyClassName,
  children,
  ...rest
}: PanelProps) {
  const hasHeader = eyebrow != null || title != null || actions != null
  return (
    <section
      className={cn(
        'rounded-[18px] bg-surface/97 ring-1 ring-line',
        floating ? 'shadow-overlay backdrop-blur-md' : 'shadow-panel',
        className,
      )}
      {...rest}
    >
      {hasHeader ? (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0">
            {eyebrow != null ? <div className="label-micro text-muted">{eyebrow}</div> : null}
            {title != null ? <h2 className="mt-0.5 truncate text-base font-semibold text-fg">{title}</h2> : null}
          </div>
          {actions != null ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(hasHeader ? 'px-4 pt-1 pb-4' : 'p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
