import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  icon: LucideIcon
  label: string
  size?: 'sm' | 'md'
  active?: boolean
}

export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  active = false,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-all duration-150',
        size === 'sm' ? 'size-8' : 'size-10',
        active
          ? 'bg-accent text-white shadow-sm'
          : 'bg-surface text-muted shadow-sm ring-1 ring-line hover:-translate-y-px hover:bg-elevated hover:text-fg',
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      {...rest}
    >
      <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} aria-hidden />
    </button>
  )
}
