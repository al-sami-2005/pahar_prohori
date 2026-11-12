/**
 * Scenario clock — pure and wall-clock based.
 *
 * Scenario time is derived from monotonic real time (performance.now), never
 * accumulated from per-frame deltas: slow rendering skips visual frames but
 * never slows the storm. While running,
 *
 *     elapsed = baseMs + (now − anchorMs)
 *
 * Pause folds the running time into baseMs; resume re-anchors at `now`.
 * Every action carries `now`, so this module has no hidden inputs and is
 * fully testable. What a given elapsed time *shows* lives in data/scenario.ts.
 */
import { SCENARIO_FRAME_COUNT, SCENARIO_TIMING } from './scenarioConfig'

export type ScenarioStatus = 'idle' | 'running' | 'paused' | 'complete'

export interface ClockState {
  status: ScenarioStatus
  /** Scenario time banked before the current running stretch (ms). */
  baseMs: number
  /** performance.now() at which the current running stretch began. */
  anchorMs: number
  /** Last computed scenario time (ms) — what the UI renders. */
  elapsedMs: number
  /** Increments on every (re)start so consumers can reset per-run UI. */
  runId: number
}

export type ClockAction =
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'exit' }
  | { type: 'tick'; now: number }
  /** Jump to a moment (paused/complete runs only). QA tooling, not the UI. */
  | { type: 'seek'; elapsedMs: number }

export const DURATION_MS = SCENARIO_TIMING.durationMs
export const FRAME_MS = SCENARIO_TIMING.frameMs
const LAST_FRAME = SCENARIO_FRAME_COUNT - 1

export const initialClock: ClockState = { status: 'idle', baseMs: 0, anchorMs: 0, elapsedMs: 0, runId: 0 }

const clampMs = (ms: number) => Math.max(0, Math.min(DURATION_MS, ms))

/** Scenario time at `now` (real milliseconds). */
export function elapsedAt(state: ClockState, now: number): number {
  if (state.status !== 'running') return state.elapsedMs
  return clampMs(state.baseMs + (now - state.anchorMs))
}

export function clockReducer(state: ClockState, action: ClockAction): ClockState {
  switch (action.type) {
    case 'start':
      return { status: 'running', baseMs: 0, anchorMs: action.now, elapsedMs: 0, runId: state.runId + 1 }
    case 'pause': {
      if (state.status !== 'running') return state
      const elapsedMs = elapsedAt(state, action.now)
      if (elapsedMs >= DURATION_MS) return { ...state, status: 'complete', baseMs: DURATION_MS, elapsedMs: DURATION_MS }
      return { ...state, status: 'paused', baseMs: elapsedMs, elapsedMs }
    }
    case 'resume':
      if (state.status !== 'paused') return state
      return { ...state, status: 'running', baseMs: state.elapsedMs, anchorMs: action.now }
    case 'exit':
      return state.status === 'idle' ? state : { ...state, status: 'idle', baseMs: 0, anchorMs: 0, elapsedMs: 0 }
    case 'tick': {
      if (state.status !== 'running') return state
      const elapsedMs = elapsedAt(state, action.now)
      if (elapsedMs >= DURATION_MS) return { ...state, status: 'complete', baseMs: DURATION_MS, elapsedMs: DURATION_MS }
      return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs }
    }
    case 'seek': {
      if (state.status === 'idle' || state.status === 'running') return state
      const elapsedMs = clampMs(action.elapsedMs)
      const status = elapsedMs >= DURATION_MS ? 'complete' : 'paused'
      return { ...state, status, baseMs: elapsedMs, elapsedMs }
    }
  }
}

/** Data frame shown for a scenario time (null = at rest). Frames between renders are skipped, never delayed. */
export function frameOf(state: Pick<ClockState, 'status' | 'elapsedMs'>): number | null {
  if (state.status === 'idle') return null
  return Math.max(0, Math.min(LAST_FRAME, Math.floor(state.elapsedMs / FRAME_MS)))
}
