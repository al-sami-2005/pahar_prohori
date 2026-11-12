import { useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'

type Side = 'right' | 'bottom' | 'top' | 'left'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: Side
  /** ms before showing on hover (focus shows immediately). */
  delay?: number
  className?: string
  /** Rich tooltips get a little more room. */
  wide?: boolean
}

const place: Record<Side, string> = {
  right: 'left-full top-1/2 ml-2.5 -translate-y-1/2',
  left: 'right-full top-1/2 mr-2.5 -translate-y-1/2',
  bottom: 'top-full right-0 mt-2.5',
  top: 'bottom-full left-1/2 mb-2.5 -translate-x-1/2',
}

const enter: Record<Side, { x?: number; y?: number }> = {
  right: { x: -4 },
  left: { x: 4 },
  bottom: { y: -4 },
  top: { y: 4 },
}

/** Hover/focus tooltip. The trigger stays the accessible control; content is described-by. */
export function Tooltip({ content, children, side = 'right', delay = 280, className, wide = false }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const show = (immediate: boolean) => {
    window.clearTimeout(timer.current)
    if (immediate) setOpen(true)
    else timer.current = window.setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setOpen(false)
  }

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => show(false)}
      onMouseLeave={hide}
      // Keyboard focus only — a mouse click shouldn't leave a tooltip behind.
      onFocus={(e) => {
        if ((e.target as HTMLElement).matches(':focus-visible')) show(true)
      }}
      onBlur={hide}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, ...enter[side] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'pointer-events-none absolute z-50 rounded-md border border-hairline bg-overlay px-2.5 py-1.5 text-xs text-fg shadow-overlay',
              wide ? 'w-64 whitespace-normal' : 'whitespace-nowrap',
              place[side],
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
