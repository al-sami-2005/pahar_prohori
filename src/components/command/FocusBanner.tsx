import { AnimatePresence, motion } from 'motion/react'
import { Crosshair } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useResidentWarning } from '@/hooks/useResidentWarning'
import { useLang } from '@/lib/i18n'
import { useViewport } from '@/hooks/useViewport'
import { chromeTop, drawerWidth } from '@/lib/layout'
import { getSlope, slopeName } from '@/data/slopes'

/** Quiet indicator that the view is in Focus Mode, with an obvious way out. */
export function FocusBanner() {
  const { state, dispatch } = useMission()
  const { t, lang } = useLang()
  const warning = useResidentWarning()
  // The resident warning owns the top-centre slot while it exists (Esc still exits Focus).
  const slope = state.focus && !warning.active ? getSlope(state.selectedSlopeId) : undefined
  const { width } = useViewport()
  const dw = drawerWidth(width)
  const offset = dw > 0 ? dw + 16 : 0

  return (
    <AnimatePresence>
      {slope ? (
        <motion.div
          key="focus"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto absolute z-20 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-3 rounded-full border border-accent/30 bg-overlay py-1.5 pr-1.5 pl-3.5 shadow-overlay backdrop-blur-md"
          style={{ left: `calc((100% - ${offset}px) / 2)`, top: chromeTop(width) + 12 }}
        >
          <Crosshair size={15} strokeWidth={1.9} className="shrink-0 text-accent" aria-hidden />
          <span className="truncate text-sm text-fg">
            <span className="text-muted">{t('focus.label')} · </span>
            {slopeName(slope, lang)}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'focus', on: false })}
            className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-fg/[0.06] px-3 text-xs text-fg transition-colors hover:bg-fg/[0.08]"
          >
            {t('focus.exit')}
            <kbd className="numeric hidden rounded-[3px] border border-hairline px-1 text-[10px] text-muted sm:inline">Esc</kbd>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
