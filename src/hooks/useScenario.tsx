/**
 * Monsoon Scenario clock provider — the single source of scenario truth.
 *
 * Time comes from lib/scenarioClock (wall-clock based, pure). This provider
 * owns the only animation loop: it exists only while a run is playing, reads
 * performance.now(), and dispatches when the 100 ms data frame changes. A slow
 * renderer therefore skips frames; it never stretches the 46-second run.
 * When the tab is hidden the run pauses explicitly (a presenter switching to
 * slides must not come back to a finished storm), and waits for Resume.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import {
  DURATION_MS,
  FRAME_MS,
  clockReducer,
  frameOf,
  initialClock,
  type ClockState,
  type ScenarioStatus,
} from '@/lib/scenarioClock'

export type { ScenarioStatus }
export const SCENARIO_DURATION_MS = DURATION_MS

export interface ScenarioContextValue extends ClockState {
  /** Current data frame, or null at rest (idle). */
  frame: number | null
  progress: number
  active: boolean
  start: () => void
  pause: () => void
  resume: () => void
  restart: () => void
  exit: () => void
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null)

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(clockReducer, initialClock)

  // The one and only scenario loop. Pause, exit, completion, restart and unmount
  // all cancel it through this cleanup; each running stretch (new anchor) gets one loop.
  const { status, baseMs, anchorMs, runId } = state
  useEffect(() => {
    if (status !== 'running') return
    const dev = import.meta.env.DEV ? (window as unknown as { __scenarioLoops?: number }) : null
    if (dev) dev.__scenarioLoops = (dev.__scenarioLoops ?? 0) + 1
    let raf = 0
    let shown = Math.floor(baseMs / FRAME_MS)
    const loop = () => {
      const now = performance.now()
      const elapsed = Math.min(DURATION_MS, baseMs + (now - anchorMs))
      const frame = Math.floor(elapsed / FRAME_MS)
      if (frame !== shown || elapsed >= DURATION_MS) {
        shown = frame
        dispatch({ type: 'tick', now })
      }
      if (elapsed < DURATION_MS) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      if (dev) dev.__scenarioLoops = (dev.__scenarioLoops ?? 1) - 1
    }
  }, [status, baseMs, anchorMs, runId])

  // Hidden tab: pause explicitly instead of letting the storm run unseen.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'pause', now: performance.now() })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // DEV only: deterministic screenshots under slow software rendering.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __scenario?: unknown }).__scenario = {
      seek: (ms: number) => dispatch({ type: 'seek', elapsedMs: ms }),
      pause: () => dispatch({ type: 'pause', now: performance.now() }),
    }
  }, [])

  const start = useCallback(() => dispatch({ type: 'start', now: performance.now() }), [])
  const pause = useCallback(() => dispatch({ type: 'pause', now: performance.now() }), [])
  const resume = useCallback(() => dispatch({ type: 'resume', now: performance.now() }), [])
  const exit = useCallback(() => dispatch({ type: 'exit' }), [])

  const value = useMemo<ScenarioContextValue>(
    () => ({
      ...state,
      frame: frameOf(state),
      progress: state.elapsedMs / DURATION_MS,
      active: state.status !== 'idle',
      start,
      pause,
      resume,
      restart: start,
      exit,
    }),
    [state, start, pause, resume, exit],
  )

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext)
  if (!ctx) throw new Error('useScenario must be used inside <ScenarioProvider>')
  return ctx
}
