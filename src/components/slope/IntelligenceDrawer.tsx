import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Crosshair, Info, Waypoints, X } from 'lucide-react'
import type { Slope } from '@/types/domain'
import { useMission } from '@/hooks/useMission'
import { useSlopeLive } from '@/hooks/useLive'
import { useResidentWarning } from '@/hooks/useResidentWarning'
import { useViewport } from '@/hooks/useViewport'
import { ALERT_META, RISK_BAND_META } from '@/lib/alertLevels'
import { cn } from '@/lib/cn'
import { formatCoord, formatIndex } from '@/lib/formatters'
import { useLang } from '@/lib/i18n'
import { fastTransition, panelTransition } from '@/lib/motion'
import { chromeTop, drawerWidth, sheetBottom, sheetHeight } from '@/lib/layout'
import { toneBorder, toneSoft, toneText } from '@/lib/tones'
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter'
import { Tooltip } from '@/components/ui/Tooltip'
import { EvidenceChain } from '@/components/evidence/EvidenceChain'
import { reasonText } from '@/components/evidence/evidenceText'
import { getSlope, slopeCount, slopeName } from '@/data/slopes'
import { SlopeOverview } from './SlopeOverview'

function DrawerBody({ slope, sheet }: { slope: Slope; sheet: boolean }) {
  const { state, dispatch } = useMission()
  const { t, lang } = useLang()
  const live = useSlopeLive(slope.id)
  const evidence = state.drawerView === 'evidence'
  // Switching between overview and evidence starts each view from its top.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [evidence])
  if (!live) return null
  const { decision } = live
  const level = decision.alertLevel
  const alert = ALERT_META[level]
  const AlertIcon = alert.icon
  const confirming = decision.decisionExplanation === 'warning.confirming'

  return (
    <div className={cn('flex flex-col', sheet ? 'min-h-full' : 'h-full')}>
      {sheet ? <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full bg-fg/15" /> : null}
      {/* Identity */}
      <div className="px-5 pt-4 max-sm:px-4 max-sm:pt-3">
        <div className="flex items-center justify-between">
          <span className="numeric text-xs text-muted">{slope.id}</span>
          <div className="-mr-2 flex items-center gap-1">
            <Tooltip content={t('rail.focus.hint')} side="bottom">
              <button
                type="button"
                aria-pressed={state.focus}
                onClick={() => dispatch({ type: 'focus', on: !state.focus })}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                  state.focus
                    ? 'border-accent/50 bg-accent/12 text-accent'
                    : 'border-hairline text-fg hover:border-accent/40 hover:bg-fg/[0.05]',
                )}
              >
                <Crosshair size={15} strokeWidth={1.9} aria-hidden />
                {t('drawer.focusLabel')}
              </button>
            </Tooltip>
            <button
              type="button"
              aria-label={t('drawer.close')}
              onClick={() => dispatch({ type: 'select', id: null })}
              className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
            >
              <X size={17} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-fg">{slopeName(slope, lang)}</h2>
        <p className="numeric mt-1 text-2xs text-muted">
          {t(`site.short.${slope.site}`)} · {formatCoord(slope.center[1], slope.center[0])}
        </p>
      </div>

      {/* Status — what current conditions justify right now (the chain's DECISION link replaces it in evidence view) */}
      {evidence ? null : (
      <div className="px-5 pt-4 max-sm:px-4 max-sm:pt-3 [@media(max-height:820px)]:pt-3">
        <motion.div
          key={level}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className={cn('rounded-r-lg border-l-[3px] px-3 py-2.5 transition-colors duration-500', level === 'normal' ? 'bg-transparent' : toneSoft[alert.tone], toneBorder[alert.tone])}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xs text-muted">{t('drawer.status')}</p>
            {decision.capped ? <span className="text-2xs text-muted">{t('state.unavailable')}</span> : null}
          </div>
          <p className={cn('mt-0.5 flex items-center gap-2 text-xl font-semibold', toneText[alert.tone])}>
            <AlertIcon size={20} strokeWidth={2.1} aria-hidden />
            <span>{lang === 'bn' ? alert.labelBn : alert.label}</span>
          </p>
          <p className="mt-1 text-sm text-fg/85">{lang === 'bn' ? alert.actionBn : alert.action}</p>
          {confirming ? (
            <motion.p
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 inline-flex rounded-md border border-evacuate/55 bg-evacuate/10 px-2 py-1 text-2xs font-semibold tracking-[0.08em] text-evacuate uppercase"
            >
              {t('basis.revealed')}
            </motion.p>
          ) : null}
          <p className="mt-1.5 text-xs leading-snug text-fg/75">
            <span className="text-muted">{t('drawer.because')}: </span>
            {reasonText(t, lang, decision)}
          </p>
        </motion.div>
      </div>
      )}

      {evidence ? null : (
        <>
          {/* Relative risk — susceptibility, not status */}
          <div className="px-5 pt-4 max-sm:px-4 max-sm:pt-3 [@media(max-height:820px)]:pt-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{t('drawer.relativeRisk')}</p>
                <p className="numeric mt-0.5 text-[26px] leading-8 font-medium text-ai">
                  {formatIndex(slope.relativeRiskIndex)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 pb-1">
                <span className="flex items-center gap-1.5 text-sm text-fg">
                  <span aria-hidden className={cn('size-2.5 rounded-[3px]', RISK_BAND_META[slope.riskBand].swatch)} />
                  {t(`band.${slope.riskBand}`)}
                  <span className="text-muted">· {t('drawer.rank', { r: slope.rank, n: slopeCount })}</span>
                </span>
                <ConfidenceMeter confidence={slope.confidence} />
              </div>
            </div>
            <p className="mt-1 text-xs text-muted">{t('drawer.riskHelp', { n: slopeCount - 1 })}</p>
            <p className="mt-1.5 flex gap-1.5 text-xs leading-snug text-fg/80">
              <Info size={13} strokeWidth={2} aria-hidden className="mt-px shrink-0 text-muted" />
              {t('drawer.riskVsStatus')}
            </p>
          </div>

          {/* Signature entry point */}
          <div className="px-5 pt-3 max-sm:px-4">
            <button
              type="button"
              aria-expanded={false}
              onClick={() => dispatch({ type: 'drawerView', view: 'evidence' })}
              className="group flex min-h-12 w-full items-center gap-3 border-y border-line px-1 text-left transition-colors duration-150 hover:bg-elevated/55"
            >
              <span className="grid size-8 shrink-0 place-items-center text-accent">
                <Waypoints size={16} strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">{t('drawer.why')}</span>
                <span className="block truncate text-2xs text-muted">{t('drawer.whyHint')}</span>
              </span>
              <ChevronRight size={17} strokeWidth={1.9} aria-hidden className="shrink-0 text-accent" />
            </button>
          </div>
        </>
      )}

      {evidence ? (
        <div className="mx-5 mt-3 flex max-sm:mx-4 items-center justify-between gap-3 border-b border-hairline pb-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'drawerView', view: 'overview' })}
            className="-ml-2 flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
          >
            <ChevronLeft size={16} strokeWidth={1.9} aria-hidden />
            {t('evidence.back')}
          </button>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Waypoints size={15} strokeWidth={1.9} aria-hidden className="text-accent" />
            {t('evidence.title')}
          </h3>
        </div>
      ) : null}

      {/* Live detail — scrolls under the fixed status */}
      <div ref={scrollRef} className={cn('px-5 pt-2 max-sm:px-4', sheet ? '' : 'min-h-0 flex-1 overflow-y-auto')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={evidence ? 'evidence' : 'overview'}
            initial={{ opacity: 0, x: evidence ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={fastTransition}
            className={evidence ? 'pt-2 pb-2' : ''}
          >
            {evidence ? <EvidenceChain slope={slope} live={live} /> : <SlopeOverview slope={slope} live={live} />}
          </motion.div>
        </AnimatePresence>
        <p className="pt-2 pb-4 text-2xs leading-relaxed text-muted">{t('drawer.footnote')}</p>
      </div>
    </div>
  )
}

/** Right-side inspection drawer. Only exists while a slope is selected. */
export function IntelligenceDrawer() {
  const { state, dispatch } = useMission()
  const { t } = useLang()
  const { width, height, mode } = useViewport()
  const slope = getSlope(state.selectedSlopeId)
  const dw = drawerWidth(width)
  const sheet = dw === 0
  const warning = useResidentWarning()
  // On tablet/phone the resident warning takes the sheet slot while it is open.
  const hidden = sheet && (!!state.tool || warning.expanded)

  // Tablet/phone: picking a slope (from search, the risk list or the map) closes the
  // tool sheet so the slope sheet can take its place.
  const selectedId = state.selectedSlopeId
  const toolRef = useRef(state.tool)
  useEffect(() => {
    toolRef.current = state.tool
  })
  useEffect(() => {
    if (selectedId && sheet && toolRef.current) dispatch({ type: 'setTool', tool: null })
  }, [selectedId, sheet, dispatch])

  return (
    <AnimatePresence>
      {slope && !hidden ? (
        <motion.aside
          key="drawer"
          aria-label={sheet ? t('drawer.sheet') : t('drawer.label')}
          initial={sheet ? { opacity: 0, y: 32 } : { opacity: 0, x: 24 }}
          animate={sheet ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
          exit={sheet ? { opacity: 0, y: 24, transition: { duration: 0.16 } } : { opacity: 0, x: 16, transition: { duration: 0.16 } }}
          transition={panelTransition}
          className={cn(
            'absolute z-30 overflow-hidden bg-overlay shadow-overlay',
            sheet
              ? mode === 'mobile'
                ? 'inset-x-0 overflow-y-auto rounded-t-[22px] border-t border-line'
                : 'inset-x-3 overflow-y-auto rounded-[16px] border border-hairline'
              : 'rounded-[14px] border border-hairline',
          )}
          style={
            sheet
              ? { bottom: sheetBottom(width), maxHeight: sheetHeight(width, height) }
              : { top: chromeTop(width) + 12, right: 12, bottom: 12, width: dw }
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slope.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="h-full"
            >
              <DrawerBody slope={slope} sheet={sheet} />
            </motion.div>
          </AnimatePresence>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
