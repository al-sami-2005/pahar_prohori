/**
 * Replay clock — pure and wall-clock based, like the scenario clock.
 *
 * The replay position is a (fractional) day index into REPLAY_DAYS. While
 * playing it is derived from real time:
 *
 *     position = basePos + (now − anchorMs) / (MS_PER_DAY / speed)
 *
 * Scrubbing, stepping, key-date jumps and autoplay all go through this reducer,
 * so there is exactly one notion of "the replay date".
 */
export type ReplaySpeed = 1 | 2 | 4

export interface ReplayClock {
  /** Whole day index currently shown — what every replay view renders. */
  day: number
  /** Day position banked before the current playing stretch. */
  basePos: number
  /** performance.now() when the current playing stretch began. */
  anchorMs: number
  playing: boolean
  speed: ReplaySpeed
}

export type ReplayAction =
  | { type: 'play'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'seek'; index: number; now: number }
  | { type: 'step'; delta: number; now: number }
  | { type: 'restart'; now: number }
  | { type: 'speed'; speed: ReplaySpeed; now: number }
  | { type: 'tick'; now: number }

/** Real milliseconds per replay day at 1× (40 days ≈ 32 s). */
export const MS_PER_DAY = 800
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 4]

export function createReplayClock(dayCount: number) {
  const last = dayCount - 1
  const clamp = (pos: number) => Math.max(0, Math.min(last, pos))

  const initial: ReplayClock = { day: 0, basePos: 0, anchorMs: 0, playing: false, speed: 1 }

  /** Fractional day position at `now`. */
  function positionAt(s: ReplayClock, now: number): number {
    if (!s.playing) return s.basePos
    return clamp(s.basePos + (now - s.anchorMs) / (MS_PER_DAY / s.speed))
  }

  /** Whole day index shown at `now`. */
  function dayIndexAt(s: ReplayClock, now: number): number {
    return Math.floor(positionAt(s, now) + 1e-9)
  }

  function step(s: ReplayClock, a: ReplayAction): ReplayClock {
    switch (a.type) {
      case 'play': {
        if (s.playing) return s
        // Playing from the last day starts the story again.
        const from = s.basePos >= last ? 0 : s.basePos
        return { ...s, basePos: from, anchorMs: a.now, playing: true }
      }
      case 'pause':
        if (!s.playing) return s
        return { ...s, basePos: Math.floor(positionAt(s, a.now) + 1e-9), playing: false }
      case 'seek':
        return { ...s, basePos: clamp(Math.round(a.index)), anchorMs: a.now }
      case 'step': {
        const from = Math.floor(positionAt(s, a.now) + 1e-9)
        return { ...s, basePos: clamp(from + a.delta), anchorMs: a.now }
      }
      case 'restart':
        return { ...s, basePos: 0, anchorMs: a.now }
      case 'speed':
        if (s.speed === a.speed) return s
        return { ...s, basePos: positionAt(s, a.now), anchorMs: a.now, speed: a.speed }
      case 'tick': {
        if (!s.playing) return s
        if (positionAt(s, a.now) >= last) return { ...s, basePos: last, playing: false }
        return s
      }
    }
  }

  /** Apply an action and refresh the shown day. Returns the same object when nothing visible changed. */
  function reducer(s: ReplayClock, a: ReplayAction): ReplayClock {
    const next = step(s, a)
    const day = dayIndexAt(next, a.now)
    if (next === s && day === s.day) return s
    return next.day === day ? next : { ...next, day }
  }

  return { initial, reducer, positionAt, dayIndexAt, last }
}
