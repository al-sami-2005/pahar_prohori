import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp, Siren, Square, Volume2, VolumeX, Waypoints } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { usePrefs } from '@/hooks/usePrefs'
import { useBengaliVoice } from '@/hooks/useBengaliVoice'
import { useResidentWarning } from '@/hooks/useResidentWarning'
import { useViewport } from '@/hooks/useViewport'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { chromeTop, drawerWidth, sheetBottom, toolPanelRight, warningSheetHeight } from '@/lib/layout'
import { panelTransition } from '@/lib/motion'
import { getSlope, slopeName } from '@/data/slopes'

/** The warning text itself is content, shown in both languages regardless of UI language. */
const MESSAGE = {
  en: { title: 'EVACUATE', lines: ['Landslide danger has escalated.', 'Move immediately to the designated safe area.'] },
  bn: { title: 'জরুরি সরিয়ে নেওয়ার সতর্কতা', lines: ['ভূমিধসের ঝুঁকি বেড়েছে।', 'নির্ধারিত নিরাপদ স্থানে দ্রুত চলে যান।'] },
} as const

/**
 * Human action: the resident warning that EVACUATE issues. Not a blocking
 * modal — a compact, prominent surface (desktop) or a priority bottom sheet
 * above the tool bar (tablet/phone). It can be minimised to a banner.
 */
export function ResidentWarning() {
  const warning = useResidentWarning()
  const { state, dispatch } = useMission()
  const prefs = usePrefs()
  const { t, lang } = useLang()
  const { width, height, mode } = useViewport()
  const voice = useBengaliVoice()
  const slope = getSlope(warning.slopeId)

  const dw = drawerWidth(width)
  const desktop = dw > 0
  const selected = !!state.selectedSlopeId
  const left = Math.max(12 + 56 + 12, toolPanelRight(width, height, prefs.railExpanded, !!state.tool) + 12)
  const right = width - (selected && desktop ? dw + 24 : 12)
  const top = chromeTop(width) + 12
  const cardW = Math.min(580, right - left - 16)

  const collapse = (collapsed: boolean) => {
    if (collapsed) voice.stop()
    dispatch({ type: 'warningCollapsed', collapsed })
  }
  const viewEvidence = () => {
    collapse(true)
    if (state.selectedSlopeId !== warning.slopeId) dispatch({ type: 'select', id: warning.slopeId })
    dispatch({ type: 'drawerView', view: 'evidence' })
  }

  const playButton = voice.available ? (
    <button
      type="button"
      onClick={() => (voice.speaking ? voice.stop() : voice.speak([MESSAGE.bn.title, ...MESSAGE.bn.lines].join(' ')))}
      className="flex h-9 items-center gap-2 rounded-lg bg-evacuate px-3 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
    >
      {voice.speaking ? <Square size={13} fill="currentColor" aria-hidden /> : <Volume2 size={15} strokeWidth={2} aria-hidden />}
      {voice.speaking ? t('warn.stop') : t('warn.play')}
    </button>
  ) : (
    <button
      type="button"
      disabled
      aria-disabled
      title={t('warn.noVoice')}
      className="flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-muted/40 px-3 text-sm text-muted"
    >
      <VolumeX size={15} strokeWidth={1.9} aria-hidden />
      {t('warn.noVoice')}
    </button>
  )

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs tracking-[0.08em] text-evacuate/90 uppercase">{t('warn.label')}</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold tracking-[0.06em] text-evacuate">
            <Siren size={20} strokeWidth={2.2} aria-hidden />
            {MESSAGE.en.title}
            {slope ? (
              <span className="truncate text-sm font-medium tracking-normal text-fg/85">· {slopeName(slope, lang)}</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => collapse(true)}
          aria-label={t('warn.minimise')}
          className="-mt-1 -mr-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
        >
          <ChevronDown size={18} strokeWidth={1.9} aria-hidden />
        </button>
      </div>
      <div className={cn('mt-2 grid gap-x-5 gap-y-2', mode === 'mobile' ? 'grid-cols-1' : 'grid-cols-2')}>
        <div lang="en">
          {MESSAGE.en.lines.map((l) => (
            <p key={l} className="text-[15px] leading-snug font-medium text-fg">
              {l}
            </p>
          ))}
        </div>
        <div lang="bn" className="border-fg/10 sm:border-l sm:pl-5">
          <p className="text-sm font-semibold text-evacuate">{MESSAGE.bn.title}</p>
          {MESSAGE.bn.lines.map((l) => (
            <p key={l} className="text-[15px] leading-[1.55] font-medium text-fg">
              {l}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {playButton}
        <button
          type="button"
          onClick={viewEvidence}
          className="flex h-9 items-center gap-2 rounded-lg border border-hairline px-3 text-sm text-fg transition-colors hover:bg-fg/[0.06]"
        >
          <Waypoints size={15} strokeWidth={1.9} aria-hidden className="text-accent" />
          {t('warn.evidence')}
        </button>
      </div>
      <p className="mt-2.5 text-2xs text-muted">
        {t('warn.basis')} · {t('warn.sim')}
      </p>
    </>
  )

  return (
    <AnimatePresence>
      {warning.expanded ? (
        <motion.section
          key="warning"
          role="region"
          aria-labelledby="warning-title"
          initial={desktop ? { opacity: 0, y: -10 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: desktop ? -8 : 16, transition: { duration: 0.16 } }}
          transition={{ ...panelTransition, delay: 0.15 }}
          className={cn(
            'pointer-events-auto absolute z-30 overflow-y-auto rounded-[16px] border border-evacuate/55 bg-[rgb(255_247_248/0.98)] p-4 shadow-overlay backdrop-blur-md',
            'before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-evacuate',
            desktop ? '-translate-x-1/2' : 'inset-x-3',
          )}
          style={
            desktop
              ? { left: (left + right) / 2, top, width: cardW }
              : { bottom: sheetBottom(width), maxHeight: warningSheetHeight(width, height) }
          }
        >
          <span id="warning-title" className="sr-only">
            {MESSAGE.en.title} — {MESSAGE.en.lines.join(' ')}
          </span>
          {body}
        </motion.section>
      ) : warning.active ? (
        <motion.button
          key="warning-pill"
          type="button"
          onClick={() => collapse(false)}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={panelTransition}
          className="pointer-events-auto absolute z-30 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full border border-evacuate/60 bg-[rgb(255_247_248/0.98)] pr-2 pl-3 text-sm font-semibold text-evacuate shadow-overlay backdrop-blur-md"
          style={{ left: desktop ? (left + right) / 2 : '50%', top }}
          aria-label={t('warn.show')}
        >
          <Siren size={16} strokeWidth={2.2} aria-hidden />
          <span className="tracking-[0.06em]">{MESSAGE.en.title}</span>
          <span className="hidden text-xs font-normal text-fg/80 sm:inline">· {t('warn.show')}</span>
          <ChevronUp size={16} strokeWidth={1.9} aria-hidden className="text-muted" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
