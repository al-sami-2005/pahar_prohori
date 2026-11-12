import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Info, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { SCENARIO_DURATION_MS } from '@/hooks/useScenario'
import { useScenarioControls } from '@/hooks/useScenarioControls'
import { useHeroLive } from '@/hooks/useLive'
import { useResidentWarning } from '@/hooks/useResidentWarning'
import { usePrefs } from '@/hooks/usePrefs'
import { useTour } from '@/hooks/useTour'
import { ALERT_META } from '@/lib/alertLevels'
import { cn } from '@/lib/cn'
import { useLang, type Translate } from '@/lib/i18n'
import { useViewport } from '@/hooks/useViewport'
import { drawerWidth, sheetBottom, sheetEdge, warningSheetHeight } from '@/lib/layout'
import { ALERT_THRESHOLDS, SCENARIO_FRAME_COUNT, SCENARIO_SCOPE } from '@/lib/scenarioConfig'
import { toneText } from '@/lib/tones'
import { Tooltip } from '@/components/ui/Tooltip'
import { SCENARIO_EVENTS, liveAt, type ScenarioEventId } from '@/data/scenario'
import { getSlope, slopeName } from '@/data/slopes'

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Timeline markers — positions measured from the engine output, never hard-coded. */
const MARKERS: readonly ScenarioEventId[] = ['heavyRain', 'saturation', 'movement', 'evacuate']

function markerHint(t: Translate, id: ScenarioEventId): string {
  const frame = SCENARIO_EVENTS.find((e) => e.id === id)?.frame ?? 0
  const hero = liveAt(SCENARIO_SCOPE.heroSlopeId, frame)?.reading
  return t(`scenario.eventHint.${id}`, {
    rate: ALERT_THRESHOLDS.meaningfulRainRate,
    deep: hero?.soilDeep ?? ALERT_THRESHOLDS.saturationDeep,
    hold: ALERT_THRESHOLDS.evacuateHoldMin,
  })
}

function IconButton({
  label,
  onClick,
  children,
  primary,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  primary?: boolean
}) {
  return (
    <Tooltip content={label} side="top">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'grid size-10 place-items-center rounded-full transition-[background-color,filter] max-sm:size-9',
          primary ? 'bg-accent text-white hover:brightness-105' : 'text-muted hover:bg-fg/[0.07] hover:text-fg',
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

/**
 * Bottom-centre scenario control. Idle: the primary CTA. Running: transport
 * controls, a timeline with event markers, and the scenario slope's status —
 * all read from the one scenario clock.
 */
export function ScenarioBar() {
  const { state } = useMission()
  const scenario = useScenarioControls()
  const hero = useHeroLive()
  const warning = useResidentWarning()
  const prefs = usePrefs()
  const tour = useTour()
  const { t, lang } = useLang()
  const { width, height, mode } = useViewport()
  const [pinned, setPinned] = useState<ScenarioEventId | null>(null)
  const [hovered, setHovered] = useState<ScenarioEventId | null>(null)

  const active = scenario.active
  const decision = hero?.decision
  const level = ALERT_META[decision?.alertLevel ?? 'normal']
  const LevelIcon = level.icon
  const confirming = decision?.decisionExplanation === 'warning.confirming'
  const heroSlope = getSlope(SCENARIO_SCOPE.heroSlopeId)

  const selected = !!state.selectedSlopeId
  const dw = drawerWidth(width)
  const drawerOffset = selected && dw > 0 ? dw + 16 : 0
  const sheetOpen = selected && dw === 0 && !state.tool
  const warnSheet = warning.expanded && dw === 0
  // Tablet/mobile: sit above the bottom toolbar, the slope sheet, or the warning sheet.
  const bottom = warnSheet
    ? sheetBottom(width) + warningSheetHeight(width, height) + 12
    : sheetOpen
      ? sheetEdge(width, height) + 14
      : mode === 'mobile'
        ? 18
        : mode === 'tablet'
          ? 20
          : 24
  const mobile = mode === 'mobile'
  const onboardingVisible = !prefs.onboardingDismissed && !tour.active && !active && !state.selectedSlopeId && !state.tool && !state.focus
  // A tool sheet always wins. Above an open slope sheet the CTA stays reachable (caption dropped on phones).
  const hidden = (mode !== 'desktop' && !!state.tool) || onboardingVisible
  const trackW = mobile ? 84 : drawerOffset > 0 ? 150 : 220
  const shown = hovered ?? pinned

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 flex -translate-x-1/2 justify-center transition-[left,bottom,opacity] duration-200 ease-out',
        hidden && 'pointer-events-none opacity-0',
      )}
      style={{ left: `calc((100% - ${drawerOffset}px) / 2)`, bottom }}
      // Visually hidden under a tool sheet: inert removes every control from the tab order
      // and the accessibility tree at once (no focusable content left inside hidden UI).
      inert={hidden}
      data-scenario-bar=""
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!active ? (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn('flex flex-col items-center gap-2', hidden ? 'pointer-events-none' : 'pointer-events-auto')}
          >
            <button
              type="button"
              onClick={scenario.run}
              className={cn(
                'group flex h-11 items-center gap-2.5 rounded-xl bg-accent px-4 text-[14px] font-semibold whitespace-nowrap text-white',
                'shadow-[0_10px_28px_-14px_rgb(33_48_42/0.34)]',
                'transition-[filter,transform,box-shadow] duration-150 ease-out',
                'hover:-translate-y-px hover:brightness-[1.06] hover:shadow-[0_14px_32px_-14px_rgb(33_48_42/0.38)]',
                'active:translate-y-0 active:scale-[0.98] active:brightness-95',
                'focus-visible:outline-offset-4',
              )}
            >
              <Play size={16} strokeWidth={2.25} fill="currentColor" aria-hidden className="translate-x-px" />
              {t('scenario.run')}
            </button>
            {mobile && sheetOpen ? null : (
              <Tooltip content={t('scenario.hint')} side="top">
                <span
                  tabIndex={0}
                  className="flex items-center gap-1.5 rounded-md px-1 text-xs text-muted [text-shadow:0_0_8px_var(--color-sea)]"
                >
                  <Info size={12} strokeWidth={2} aria-hidden />
                  {t(mobile ? 'scenario.captionShort' : 'scenario.caption')}
                </span>
              </Tooltip>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="bar"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative"
          >
            {/* One-line event explanation (hover, focus or tap a marker) */}
            <AnimatePresence>
              {shown ? (
                <motion.p
                  key={shown}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="absolute bottom-full left-1/2 mb-2 w-max max-w-[min(92vw,440px)] -translate-x-1/2 rounded-lg border border-hairline bg-overlay px-3 py-1.5 text-center text-xs text-fg shadow-overlay backdrop-blur-md"
                >
                  <span className="font-semibold">{t(`scenario.event.${shown}`)}</span>
                  <span className="text-muted"> · {markerHint(t, shown)}</span>
                </motion.p>
              ) : null}
            </AnimatePresence>

            <div
              role="group"
              aria-label={t('scenario.run')}
              className="flex h-14 items-center gap-2 rounded-xl border border-hairline bg-overlay pr-4 pl-2 shadow-overlay backdrop-blur-md sm:gap-3 sm:pr-5"
            >
              <div className="flex items-center">
                {scenario.status === 'running' ? (
                  <IconButton label={t('scenario.pause')} onClick={scenario.pause}>
                    <Pause size={15} strokeWidth={2} fill="currentColor" aria-hidden />
                  </IconButton>
                ) : scenario.status === 'paused' ? (
                  <IconButton label={t('scenario.resume')} onClick={scenario.resume} primary>
                    <Play size={15} strokeWidth={2} fill="currentColor" aria-hidden />
                  </IconButton>
                ) : (
                  <IconButton label={t('scenario.run')} onClick={scenario.run} primary>
                    <Play size={15} strokeWidth={2} fill="currentColor" aria-hidden />
                  </IconButton>
                )}
                <IconButton label={t('scenario.restart')} onClick={scenario.run}>
                  <RotateCcw size={15} strokeWidth={1.8} aria-hidden />
                </IconButton>
                <IconButton label={t('scenario.exit')} onClick={scenario.exit}>
                  <X size={16} strokeWidth={1.8} aria-hidden />
                </IconButton>
              </div>

              {mobile ? null : <span className="numeric w-10 text-xs text-fg">{mmss(scenario.elapsedMs)}</span>}
              <div className="relative h-8" style={{ width: trackW }}>
                <div
                  role="progressbar"
                  aria-label={t('scenario.progress')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(scenario.progress * 100)}
                  aria-valuetext={`${mmss(scenario.elapsedMs)} / ${mmss(SCENARIO_DURATION_MS)}`}
                  className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2"
                >
                  <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-fg/[0.12]" />
                  <span
                    className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-accent"
                    style={{ width: `${scenario.progress * 100}%` }}
                  />
                  <span
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg shadow-[0_0_0_3px_var(--color-surface)]"
                    style={{ left: `${scenario.progress * 100}%` }}
                  />
                </div>
                {/* Event markers */}
                <ul aria-label={t('scenario.events')}>
                  {MARKERS.map((id) => {
                    const ev = SCENARIO_EVENTS.find((e) => e.id === id)
                    if (!ev) return null
                    const passed = (scenario.frame ?? 0) >= ev.frame
                    const evac = id === 'evacuate'
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          aria-label={`${t(`scenario.event.${id}`)} · ${mmss(ev.at * 1000)} — ${markerHint(t, id)}`}
                          aria-pressed={pinned === id}
                          onMouseEnter={() => setHovered(id)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(id)}
                          onBlur={() => setHovered(null)}
                          onClick={() => setPinned((p) => (p === id ? null : id))}
                          className="absolute -top-0.5 flex h-4 w-3.5 -translate-x-1/2 justify-center rounded-sm"
                          style={{ left: `${(ev.frame / (SCENARIO_FRAME_COUNT - 1)) * 100}%` }}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'mt-0.5 h-2.5 w-[2px] rounded-full transition-colors duration-300',
                              passed ? (evac ? 'bg-evacuate' : 'bg-fg') : 'bg-fg/25',
                            )}
                          />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
              {mobile ? null : <span className="numeric w-10 text-xs text-muted">{mmss(SCENARIO_DURATION_MS)}</span>}

              <span className="h-5 w-px bg-hairline" aria-hidden />
              <span
                title={t('scenario.levelFor', { slope: heroSlope ? slopeName(heroSlope, lang) : '' })}
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold tracking-[0.06em] whitespace-nowrap uppercase',
                  mobile ? 'min-w-[74px]' : 'min-w-[112px]',
                  confirming ? 'text-evacuate' : toneText[level.tone],
                )}
              >
                <motion.span
                  key={confirming ? 'signals' : level.level}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2"
                >
                  <LevelIcon size={15} strokeWidth={2.25} aria-hidden />
                  {/* When another slope is open, say whose status this is. */}
                  {!mobile && state.selectedSlopeId && state.selectedSlopeId !== SCENARIO_SCOPE.heroSlopeId ? (
                    <span className="numeric text-2xs font-normal tracking-normal text-muted normal-case">
                      {SCENARIO_SCOPE.heroSlopeId}
                    </span>
                  ) : null}
                  {confirming && !mobile ? (
                    <span className="text-xs tracking-[0.04em]">{t('scenario.signals')}</span>
                  ) : (
                    <span>{lang === 'bn' ? level.labelBn : level.label}</span>
                  )}
                </motion.span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
