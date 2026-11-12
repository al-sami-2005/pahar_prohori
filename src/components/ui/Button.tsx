import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  trailingIcon?: LucideIcon
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-white font-semibold shadow-sm hover:brightness-105 active:brightness-95',
  secondary: 'bg-surface text-fg shadow-sm ring-1 ring-line hover:bg-elevated',
  ghost: 'text-muted hover:bg-elevated hover:text-fg',
  danger: 'bg-evacuate/10 text-evacuate ring-1 ring-evacuate/30 hover:bg-evacuate/16',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 gap-1.5 text-xs rounded-full',
  md: 'h-10 px-4 gap-2 text-sm rounded-full',
  lg: 'h-12 px-5 gap-2.5 text-base rounded-full',
}

const iconSize: Record<Size, number> = { sm: 14, md: 16, lg: 18 }

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  trailingIcon: TrailingIcon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold',
        'transition-[background-color,color,filter,transform,box-shadow] duration-150 ease-out',
        'hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-45',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={iconSize[size]} strokeWidth={2} aria-hidden /> : null}
      {children}
      {TrailingIcon ? <TrailingIcon size={iconSize[size]} strokeWidth={2} aria-hidden /> : null}
    </button>
  )
}
