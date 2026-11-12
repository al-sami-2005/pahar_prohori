import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { fastTransition } from '@/lib/motion'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  /** Accessible name when the label is not plain text. */
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Required accessible name for the group. */
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** Radio-group semantics with roving tabindex and arrow-key navigation. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const indicatorId = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = options.length - 1
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    const option = options[next]
    if (!option) return
    onChange(option.value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-line bg-canvas/60 p-0.5',
        className,
      )}
    >
      {options.map((option, i) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative inline-flex items-center justify-center rounded-sm font-medium transition-colors duration-150',
              size === 'sm' ? 'h-6 min-w-8 px-2 text-xs' : 'h-8 min-w-10 px-3 text-sm',
              selected ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={indicatorId}
                transition={fastTransition}
                aria-hidden
                className="absolute inset-0 rounded-sm border border-line-strong bg-elevated"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
