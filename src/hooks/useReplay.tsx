/**
 * The replay clock provider — the single source of "the replay date".
 *
 * Mounted at the app root so the chosen date survives route changes within a
 * session. One animation loop, alive only while playing, dispatching only when
 * the shown day changes. Scrubbing, keyboard, key-date jumps and autoplay all
 * dispatch into the same pure reducer (lib/replayClock.ts). A hidden tab pauses.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { MS_PER_DAY, createReplayClock, type ReplayClock, type ReplaySpeed } from '@/lib/replayClock'
import { REPLAY_DAYS } from '@/data/replay'

const clock = createReplayClock(REPLAY_DAYS.length)

export interface ReplayContextValue extends ReplayClock {
  /** ISO date currently shown. */
  date: string
  lastIndex: number
  play: () => void
  pause: () => void
  toggle: () => void
  restart: () => void
  seek: (index: number) => void
  seekDate: (iso: string) => void
  step: (delta: number) => void
  setSpeed: (speed: ReplaySpeed) => void
}

const ReplayContext = createContext<ReplayContextValue | null>(null)

export function ReplayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(clock.reducer, clock.initial)
  const { playing, basePos, anchorMs, speed, day } = state

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let shown = day
    const loop = () => {
      const now = performance.now()
      const pos = basePos + (now - anchorMs) / (MS_PER_DAY / speed)
      const index = Math.min(clock.last, Math.floor(pos + 1e-9))
      if (index !== shown || pos >= clock.last) {
        shown = index
        dispatch({ type: 'tick', now })
      }
      if (pos < clock.last) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // `day` only seeds the loop; ticks must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, basePos, anchorMs, speed])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'pause', now: performance.now() })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const play = useCallback(() => dispatch({ type: 'play', now: performance.now() }), [])
  const pause = useCallback(() => dispatch({ type: 'pause', now: performance.now() }), [])
  const restart = useCallback(() => dispatch({ type: 'restart', now: performance.now() }), [])
  const seek = useCallback((index: number) => dispatch({ type: 'seek', index, now: performance.now() }), [])
  const step = useCallback((delta: number) => dispatch({ type: 'step', delta, now: performance.now() }), [])
  const setSpeed = useCallback((s: ReplaySpeed) => dispatch({ type: 'speed', speed: s, now: performance.now() }), [])
  const seekDate = useCallback((iso: string) => {
    const i = REPLAY_DAYS.indexOf(iso)
    if (i >= 0) dispatch({ type: 'seek', index: i, now: performance.now() })
  }, [])
  const toggle = useCallback(() => dispatch({ type: playing ? 'pause' : 'play', now: performance.now() }), [playing])

  const value = useMemo<ReplayContextValue>(
    () => ({
      ...state,
      date: REPLAY_DAYS[state.day] ?? REPLAY_DAYS[0]!,
      lastIndex: clock.last,
      play,
      pause,
      toggle,
      restart,
      seek,
      seekDate,
      step,
      setSpeed,
    }),
    [state, play, pause, toggle, restart, seek, seekDate, step, setSpeed],
  )
  return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>
}

export function useReplay(): ReplayContextValue {
  const ctx = useContext(ReplayContext)
  if (!ctx) throw new Error('useReplay must be used inside <ReplayProvider>')
  return ctx
}
