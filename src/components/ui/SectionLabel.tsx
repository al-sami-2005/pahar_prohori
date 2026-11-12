import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionLabelProps {
  children: ReactNode
  /** Optional step index, rendered as "01". */
  index?: number
  className?: string
  as?: 'p' | 'h2' | 'h3'
}

export function SectionLabel({ children, index, className, as: Tag = 'p' }: SectionLabelProps) {
  return (
    <Tag className={cn('label-micro flex items-center gap-2 text-muted', className)}>
      {index != null ? (
        <span className="text-faint">{String(index).padStart(2, '0')}</span>
      ) : null}
      <span>{children}</span>
    </Tag>
  )
}
