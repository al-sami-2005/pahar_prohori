/**
 * Guided Demo steps and the rules that gate them. Pure, so the rules can be
 * tested without a browser: the demo can never show Finish, or reach the
 * Human-action step, before the real alert engine says EVACUATE.
 */
import type { AlertLevel } from '@/types/domain'
import type { DrawerView, Tool } from '@/hooks/useMission'
import type { I18nKey } from './i18n'
import type { ScenarioStatus } from './scenarioClock'
import { SCENARIO_SCOPE } from './scenarioConfig'

export interface TourStep {
  title: I18nKey
  body: I18nKey
  /** What the step puts on screen. */
  layers?: { risk?: boolean; nisar?: boolean; sensors?: boolean }
  tool?: Tool | null
  select?: string | null
  focus?: boolean
  drawerView?: DrawerView
  /** 'start' runs the real scenario from 0 (same path as the CTA); 'exit' returns to resting conditions. */
  scenario?: 'start' | 'exit'
  /** Narration follows the live scenario instead of a fixed body. */
  live?: boolean
  /** The step can only be shown while the engine reports this level. */
  requires?: AlertLevel
}

const HERO = SCENARIO_SCOPE.heroSlopeId

export const TOUR_STEPS: readonly TourStep[] = [
  { title: 'tour.1.title', body: 'tour.1.body', tool: null, select: null, focus: false, scenario: 'exit' },
  { title: 'tour.2.title', body: 'tour.2.body', layers: { nisar: true }, tool: 'satellite', select: null, focus: false, scenario: 'exit' },
  { title: 'tour.3.title', body: 'tour.3.body', layers: { risk: true }, tool: 'risk', select: null, focus: false, scenario: 'exit' },
  { title: 'tour.4.title', body: 'tour.4.body', tool: null, select: HERO, focus: true, drawerView: 'overview', scenario: 'exit' },
  { title: 'tour.5.title', body: 'tour.5.body', layers: { sensors: true }, tool: null, select: HERO, focus: true, drawerView: 'overview', scenario: 'exit' },
  // Evidence confirmation: the real run plays through WATCH and WARNING. No Next, no Finish.
  { title: 'tour.6.title', body: 'tour.6.body', tool: null, select: HERO, focus: true, drawerView: 'overview', scenario: 'start', live: true },
  // Human action: only reachable once the engine reports EVACUATE for the hero slope.
  { title: 'tour.7.title', body: 'tour.7.body', tool: null, select: HERO, requires: 'evacuate' },
]

export const EVIDENCE_STEP = TOUR_STEPS.findIndex((s) => s.live)
export const HUMAN_ACTION_STEP = TOUR_STEPS.findIndex((s) => s.requires === 'evacuate')

/** May the demo show `step` given the engine's current level for the hero slope? */
export function canEnterStep(step: number, level: AlertLevel | undefined): boolean {
  const def = TOUR_STEPS[step]
  if (!def) return false
  return def.requires === undefined || def.requires === level
}

/** Which controls the tour card offers. */
export interface TourControls {
  next: boolean
  back: boolean
  finish: boolean
  restart: boolean
  /** Waiting for the real scenario to reach the next gate. */
  waiting: boolean
}

export function tourControls(step: number, level: AlertLevel | undefined, status: ScenarioStatus): TourControls {
  const last = step === TOUR_STEPS.length - 1
  if (step === EVIDENCE_STEP) {
    return { next: false, back: true, finish: false, restart: false, waiting: true }
  }
  if (last) {
    const reached = canEnterStep(step, level)
    return { next: false, back: false, finish: reached, restart: reached && status === 'complete', waiting: !reached }
  }
  return { next: canEnterStep(step + 1, level), back: step > 0, finish: false, restart: false, waiting: false }
}

/** Advance automatically from Evidence confirmation when the engine reaches EVACUATE. */
export function shouldAutoAdvance(step: number, level: AlertLevel | undefined): boolean {
  return step === EVIDENCE_STEP && canEnterStep(HUMAN_ACTION_STEP, level)
}

/** Leave Human action if its condition no longer holds (e.g. the run was restarted). */
export function shouldStepBack(step: number, level: AlertLevel | undefined): boolean {
  return step === HUMAN_ACTION_STEP && !canEnterStep(step, level)
}
