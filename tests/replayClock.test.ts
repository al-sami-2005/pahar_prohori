import { describe, expect, it } from 'vitest'
import { MS_PER_DAY, createReplayClock, type ReplayAction, type ReplayClock } from '@/lib/replayClock'
import { REPLAY_DAYS } from '@/data/replay'

const clock = createReplayClock(REPLAY_DAYS.length)
const LAST = REPLAY_DAYS.length - 1
const run = (actions: ReplayAction[], from: ReplayClock = clock.initial) => actions.reduce(clock.reducer, from)

describe('replay clock — bounds', () => {
  it('covers 22 Jun – 31 Jul 2026 and starts paused on the first day', () => {
    expect(REPLAY_DAYS[0]).toBe('2026-06-22')
    expect(REPLAY_DAYS[LAST]).toBe('2026-07-31')
    expect(REPLAY_DAYS).toHaveLength(40)
    expect(clock.initial).toMatchObject({ day: 0, playing: false, speed: 1 })
  })

  it('seek and step clamp to the replay window', () => {
    expect(run([{ type: 'seek', index: -12, now: 0 }]).day).toBe(0)
    expect(run([{ type: 'seek', index: 400, now: 0 }]).day).toBe(LAST)
    expect(run([{ type: 'seek', index: LAST, now: 0 }, { type: 'step', delta: 5, now: 0 }]).day).toBe(LAST)
    expect(run([{ type: 'step', delta: -3, now: 0 }]).day).toBe(0)
  })
})

describe('replay clock — scrubbing', () => {
  it('scrubs forward and back to exact days', () => {
    const fwd = run([{ type: 'seek', index: 20, now: 0 }])
    expect(REPLAY_DAYS[fwd.day]).toBe('2026-07-12')
    const back = run([{ type: 'seek', index: 5, now: 10 }], fwd)
    expect(REPLAY_DAYS[back.day]).toBe('2026-06-27')
  })

  it('stepping moves one day at a time from the shown day', () => {
    const s = run([{ type: 'seek', index: 10, now: 0 }, { type: 'step', delta: 1, now: 0 }, { type: 'step', delta: 1, now: 0 }, { type: 'step', delta: -1, now: 0 }])
    expect(s.day).toBe(11)
  })

  it('scrubbing while playing keeps playing from the new day', () => {
    const s = run([{ type: 'play', now: 0 }, { type: 'seek', index: 30, now: 1000 }, { type: 'tick', now: 1000 + 2 * MS_PER_DAY }])
    expect(s.playing).toBe(true)
    expect(s.day).toBe(32)
  })
})

describe('replay clock — autoplay is wall-clock based', () => {
  it('advances one day per MS_PER_DAY at 1×', () => {
    const s = run([{ type: 'play', now: 0 }, { type: 'tick', now: 5 * MS_PER_DAY + 1 }])
    expect(s.day).toBe(5)
  })

  it('a late frame jumps straight to the right day', () => {
    const s = run([{ type: 'play', now: 0 }, { type: 'tick', now: 17 * MS_PER_DAY + 1 }])
    expect(s.day).toBe(17)
  })

  it('stops exactly on the last day and never overshoots', () => {
    const s = run([{ type: 'play', now: 0 }, { type: 'tick', now: 999 * MS_PER_DAY }])
    expect(s).toMatchObject({ day: LAST, playing: false, basePos: LAST })
  })

  it('2× and 4× are proportionally faster; changing speed keeps the position', () => {
    expect(run([{ type: 'speed', speed: 2, now: 0 }, { type: 'play', now: 0 }, { type: 'tick', now: 5 * MS_PER_DAY + 1 }]).day).toBe(10)
    expect(run([{ type: 'speed', speed: 4, now: 0 }, { type: 'play', now: 0 }, { type: 'tick', now: 5 * MS_PER_DAY + 1 }]).day).toBe(20)
    const mid = run([{ type: 'play', now: 0 }, { type: 'tick', now: 6 * MS_PER_DAY + 1 }, { type: 'speed', speed: 4, now: 6 * MS_PER_DAY + 1 }])
    expect(mid.day).toBe(6)
    expect(run([{ type: 'tick', now: 7 * MS_PER_DAY + 1 }], mid).day).toBe(10)
  })
})

describe('replay clock — pause, resume, restart', () => {
  it('pause freezes the day; resume continues from exactly there', () => {
    const paused = run([{ type: 'play', now: 0 }, { type: 'pause', now: 8 * MS_PER_DAY + 400 }, { type: 'tick', now: 60_000 }])
    expect(paused).toMatchObject({ day: 8, playing: false })
    const resumed = run([{ type: 'play', now: 100_000 }, { type: 'tick', now: 100_000 + 3 * MS_PER_DAY + 1 }], paused)
    expect(resumed.day).toBe(11)
  })

  it('restart returns to 22 Jun (and keeps playing if it was)', () => {
    const s = run([{ type: 'play', now: 0 }, { type: 'tick', now: 20 * MS_PER_DAY }, { type: 'restart', now: 20 * MS_PER_DAY }])
    expect(s).toMatchObject({ day: 0, playing: true })
    const paused = run([{ type: 'seek', index: 25, now: 0 }, { type: 'restart', now: 0 }])
    expect(paused).toMatchObject({ day: 0, playing: false })
  })

  it('play from the last day starts the story again', () => {
    const s = run([{ type: 'seek', index: LAST, now: 0 }, { type: 'play', now: 10 }])
    expect(s).toMatchObject({ day: 0, playing: true })
  })

  it('a tick that changes nothing returns the same object (no re-render)', () => {
    const s = run([{ type: 'play', now: 0 }])
    expect(clock.reducer(s, { type: 'tick', now: MS_PER_DAY / 4 })).toBe(s)
    const paused = run([{ type: 'seek', index: 3, now: 0 }])
    expect(clock.reducer(paused, { type: 'tick', now: 99_999 })).toBe(paused)
  })
})

describe('replay clock — determinism', () => {
  it('the same inputs always produce the same state', () => {
    const actions: ReplayAction[] = [
      { type: 'play', now: 0 },
      { type: 'tick', now: 2345 },
      { type: 'speed', speed: 2, now: 4000 },
      { type: 'tick', now: 7000 },
      { type: 'pause', now: 7100 },
      { type: 'step', delta: 2, now: 8000 },
      { type: 'play', now: 9000 },
      { type: 'tick', now: 12_000 },
    ]
    expect(run(actions)).toEqual(run(actions))
  })
})
