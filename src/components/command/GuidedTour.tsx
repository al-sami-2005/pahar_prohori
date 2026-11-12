import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Loader, RotateCcw, Siren, X } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useScenarioControls } from '@/hooks/useScenarioControls'
import { useHeroLive } from '@/hooks/useLive'
import { TOUR_STEPS, useTour } from '@/hooks/useTour'
import { useViewport } from '@/hooks/useViewport'
import { ALERT_META } from '@/lib/alertLevels'
import { cn } from '@/lib/cn'
import { useLang, type I18nKey } from '@/lib/i18n'
import { usePrefs } from '@/hooks/usePrefs'
import { chromeTop, drawerWidth, sheetEdge, toolPanelRight } from '@/lib/layout'
import { SCENARIO_SCOPE } from '@/lib/scenarioConfig'
import { panelTransition } from '@/lib/motion'
import { shouldAutoAdvance, shouldStepBack, tourControls } from '@/lib/tour'
import { toneBg, toneText, type Tone } from '@/lib/tones'

/** Which layer of the thesis each step belongs to. */
const STEP_TAG: Array<{ label: I18nKey; tone: Tone } | null> = [
  null,
  { label: 'layer.nisar', tone: 'satellite' },
  { label: 'layer.risk', tone: 'ai' },
  { label: 'drawer.label', tone: 'accent' },
  { label: 'layer.sensors', tone: 'healthy' },
  { label: 'evidence.title', tone: 'accent' },
  { label: 'alerts.human', tone: 'evacuate' },
]

/**
 * Guided Demo. Every step dispatches to the real mission state and the real
 * scenario clock — there is no tour-only data and no tour-only timer. In the
 * last step the narration follows the engine's decisions as they happen.
 */
export function GuidedTour() {
  const tour = useTour()
  const { state, dispatch } = useMission()
  const controls = useScenarioControls()
  const hero = useHeroLive()
  const { t, lang } = useLang()
  const { width, height, mode } = useViewport()
  const prefs = usePrefs()

  const level = hero?.decision.alertLevel

  // Apply each step to the live UI. Coming back to the live step from Human action
  // (the run was restarted from the bar) must not start the run a second time.
  const prevStep = useRef(-1)
  useEffect(() => {
    if (!tour.active) {
      prevStep.current = -1
      return
    }
    const step = TOUR_STEPS[tour.step]
    const cameFromLater = prevStep.current > tour.step
    prevStep.current = tour.step
    if (!step) return
    if (tour.step === 0 && state.site !== SCENARIO_SCOPE.site) dispatch({ type: 'site', site: SCENARIO_SCOPE.site })
    if (step.layers) {
      for (const [id, on] of Object.entries(step.layers)) {
        if (on) dispatch({ type: 'layer', id: id as 'risk' | 'nisar' | 'sensors', on: true })
      }
    }
    if (step.tool !== undefined) dispatch({ type: 'setTool', tool: step.tool })
    if (step.select !== undefined) dispatch({ type: 'select', id: step.select })
    if (step.focus !== undefined) dispatch({ type: 'focus', on: step.focus })
    if (step.drawerView) dispatch({ type: 'drawerView', view: step.drawerView })
    // Same run path as the Run Monsoon Scenario CTA.
    if (step.scenario === 'start' && !cameFromLater) controls.run()
    if (step.scenario === 'exit' && controls.active) controls.exit()
    if (step.requires === 'evacuate') dispatch({ type: 'warningCollapsed', collapsed: false })
    // Only react to step changes; the steps are declarative.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.active, tour.step])

  // The real engine gates the last step: advance at EVACUATE, fall back if the run restarts.
  useEffect(() => {
    if (!tour.active) return
    if (shouldAutoAdvance(tour.step, level)) tour.next()
    else if (shouldStepBack(tour.step, level)) tour.back()
  }, [tour, level])

  // Live step: open the evidence chain at WARNING.
  const liveStep = tour.active && !!TOUR_STEPS[tour.step]?.live
  useEffect(() => {
    if (liveStep && level === 'warning') dispatch({ type: 'drawerView', view: 'evidence' })
  }, [liveStep, level, dispatch])

  const step = TOUR_STEPS[tour.step]
  const gate = tourControls(tour.step, level, controls.status)
  const human = step?.requires === 'evacuate'
  const tag = STEP_TAG[tour.step] ?? null
  const mobile = mode === 'mobile'
  const dw = drawerWidth(width)
  const leftInset = Math.max(12, toolPanelRight(width, height, prefs.railExpanded, !!state.tool) + 16)
  const bottom = state.selectedSlopeId && dw === 0 ? sheetEdge(width, height) + 16 : 104

  // Narration for the live step, derived from the same frame everything else shows.
  const decision = hero?.decision
  const liveKey: I18nKey | null = !step?.live
    ? null
    : controls.status === 'complete'
      ? 'tour.live.complete'
      : decision?.alertLevel === 'evacuate'
        ? 'tour.live.evacuate'
        : decision?.decisionExplanation === 'warning.confirming'
          ? 'tour.live.confirming'
          : decision?.alertLevel === 'warning'
            ? 'tour.live.warning'
            : decision?.alertLevel === 'watch'
              ? 'tour.live.watch'
              : controls.active
                ? 'tour.live.baseline'
                : null
  const levelMeta = ALERT_META[decision?.alertLevel ?? 'normal']
  const LevelIcon = levelMeta.icon

  return (
    <AnimatePresence>
      {tour.active && step ? (
        <motion.section
          key="tour"
          role="dialog"
          aria-modal="false"
          aria-labelledby="tour-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
          transition={panelTransition}
          className={cn(
            'pointer-events-auto absolute z-40 bg-surface shadow-overlay ring-1 ring-line',
            mobile ? 'inset-x-3 rounded-2xl p-3.5' : 'w-[370px] rounded-2xl p-4',
          )}
          style={mobile ? { top: chromeTop(width) + 10 } : { left: leftInset, bottom }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                {t('tour.step', { n: tour.step + 1, total: TOUR_STEPS.length })}
              </span>
              <span aria-hidden className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 rounded-full transition-all duration-300',
                      i === tour.step ? 'w-5 bg-accent' : i < tour.step ? 'w-2 bg-accent/50' : 'w-2 bg-fg/15',
                    )}
                  />
                ))}
              </span>
            </div>
            <button
              type="button"
              onClick={tour.exit}
              aria-label={t('tour.exit')}
              className="-mr-1.5 grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
            >
              <X size={17} strokeWidth={1.8} aria-hidden />
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tour.step}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              {tag && !(mobile && step.live) ? (
                <p className={cn('mt-2 flex items-center gap-2 text-xs font-medium', toneText[tag.tone])}>
                  <span aria-hidden className={cn('size-2 rounded-full', toneBg[tag.tone])} />
                  {t(tag.label)}
                </p>
              ) : null}
              <h2 id="tour-title" className={cn('mt-1.5 font-semibold tracking-[-0.01em] text-fg', mobile ? 'text-md' : 'text-lg')}>
                {t(step.title)}
              </h2>
              {liveKey ? (
                <div className="mt-2">
                  <p className={cn('flex items-center gap-2 text-xs font-semibold tracking-[0.06em] uppercase', toneText[levelMeta.tone])}>
                    <LevelIcon size={14} strokeWidth={2.2} aria-hidden />
                    {lang === 'bn' ? levelMeta.labelBn : levelMeta.label}
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={liveKey}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.25 }}
                      className="mt-1 text-sm leading-relaxed text-fg/90"
                    >
                      {t(liveKey)}
                    </motion.p>
                  </AnimatePresence>
                </div>
              ) : (
                <p className={cn('mt-1.5 text-sm leading-relaxed text-fg/85', mobile && step.live && 'line-clamp-2')}>
                  {t(step.body)}
                </p>
              )}
              {human ? (
                <p className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-evacuate/50 bg-evacuate/10 px-2.5 py-1.5 text-xs font-semibold tracking-[0.08em] text-evacuate uppercase">
                  <Siren size={14} strokeWidth={2.2} aria-hidden />
                  {t('basis.revealed')}
                </p>
              ) : null}
              {gate.waiting && !mobile ? <p className="mt-2 text-xs text-muted">{t('tour.waiting')}</p> : null}
            </motion.div>
          </AnimatePresence>

          <div className={cn('flex items-center justify-between gap-2', mobile ? 'mt-3' : 'mt-4')}>
            {gate.back ? (
              <button
                type="button"
                onClick={tour.back}
                disabled={tour.step === 0}
                className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg disabled:opacity-40"
              >
                <ArrowLeft size={15} strokeWidth={1.9} aria-hidden />
                {t('tour.back')}
              </button>
            ) : (
              <span />
            )}
            {gate.next ? (
              <button
                type="button"
                onClick={tour.next}
                autoFocus
                className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
              >
                {TOUR_STEPS[tour.step + 1]?.scenario === 'start' ? t('tour.start') : t('tour.next')}
                <ArrowRight size={15} strokeWidth={1.9} aria-hidden />
              </button>
            ) : gate.finish ? (
              <div className="flex items-center gap-2">
                {gate.restart ? (
                  <button
                    type="button"
                    onClick={controls.run}
                    className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
                  >
                    <RotateCcw size={14} strokeWidth={1.9} aria-hidden />
                    {t('scenario.restart')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={tour.exit}
                  autoFocus
                  className="flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-[filter] hover:brightness-105"
                >
                  <Check size={15} strokeWidth={2} aria-hidden />
                  {t('tour.finish')}
                </button>
              </div>
            ) : gate.waiting ? (
              <span className="flex h-10 items-center gap-2 rounded-lg px-3 text-xs text-muted" role="status">
                <Loader size={14} strokeWidth={2} aria-hidden className="animate-spin [animation-duration:2.4s]" />
                {t('tour.waitingShort')}
              </span>
            ) : null}
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}
