import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneBg, type Tone } from '@/lib/tones'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  /** Plain-text accessible name when `label` is not plain text. */
  ariaLabel?: string
  hint?: ReactNode
  /** Leading visual, e.g. a layer swatch. */
  leading?: ReactNode
  /** Track colour when on. */
  tone?: Tone
  disabled?: boolean
  className?: string
}

/** Whole row is the hit target; exposes role="switch" + aria-checked. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  ariaLabel,
  hint,
  leading,
  tone = 'satellite',
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150',
        'hover:bg-elevated disabled:opacity-45',
        className,
      )}
    >
      {leading != null ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm', checked ? 'text-fg' : 'text-muted')}>
          {label}
        </span>
        {hint != null ? <span className="block truncate text-xs text-muted">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors duration-150',
          checked ? cn(toneBg[tone], 'border-transparent') : 'border-line-strong bg-canvas',
        )}
      >
        <span
          className={cn(
            'absolute size-2.5 rounded-full transition-transform duration-150 ease-out',
            checked ? 'translate-x-[14px] bg-canvas' : 'translate-x-[2px] bg-muted',
          )}
        />
      </span>
    </button>
  )
}
