import { describe, expect, it } from 'vitest'
import { clockReducer, elapsedAt, frameOf, initialClock, type ClockAction, type ClockState } from '@/lib/scenarioClock'
import { SCENARIO_TIMING } from '@/lib/scenarioConfig'

const DUR = SCENARIO_TIMING.durationMs
const run = (actions: ClockAction[], from: ClockState = initialClock) => actions.reduce(clockReducer, from)

describe('scenario clock — wall-clock time, not frame count', () => {
  it('scenario time equals real elapsed time', () => {
    const s = run([{ type: 'start', now: 1000 }, { type: 'tick', now: 1000 + 12_345 }])
    expect(s.elapsedMs).toBe(12_345)
    expect(frameOf(s)).toBe(123)
  })

  it('a slow renderer skips frames but does not slow the storm', () => {
    // 4 fps: 250 ms between rendered frames for the whole run.
    const actions: ClockAction[] = [{ type: 'start', now: 0 }]
    for (let t = 250; t <= DUR; t += 250) actions.push({ type: 'tick', now: t })
    const s = run(actions)
    expect(s.status).toBe('complete')
    expect(s.elapsedMs).toBe(DUR)
  })

  it('one very late frame jumps straight to the right time', () => {
    const s = run([{ type: 'start', now: 0 }, { type: 'tick', now: 30_000 }])
    expect(s.elapsedMs).toBe(30_000)
    expect(frameOf(s)).toBe(300)
  })

  it('completes exactly at 46 s and never overshoots', () => {
    const s = run([{ type: 'start', now: 0 }, { type: 'tick', now: DUR + 9_000 }])
    expect(s.status).toBe('complete')
    expect(s.elapsedMs).toBe(DUR)
    expect(frameOf(s)).toBe(460)
  })
})

describe('scenario clock — controls', () => {
  it('pause freezes elapsed time; resume continues from exactly the paused time', () => {
    const paused = run([{ type: 'start', now: 0 }, { type: 'pause', now: 10_000 }, { type: 'tick', now: 30_000 }])
    expect(paused.status).toBe('paused')
    expect(paused.elapsedMs).toBe(10_000)
    expect(elapsedAt(paused, 99_999)).toBe(10_000)
    const resumed = run([{ type: 'resume', now: 50_000 }, { type: 'tick', now: 51_000 }], paused)
    expect(resumed.status).toBe('running')
    expect(resumed.elapsedMs).toBe(11_000)
  })

  it('restart starts exactly at 0 with a new run id', () => {
    const mid = run([{ type: 'start', now: 0 }, { type: 'tick', now: 20_000 }])
    const restarted = run([{ type: 'start', now: 40_000 }], mid)
    expect(restarted.elapsedMs).toBe(0)
    expect(restarted.runId).toBe(mid.runId + 1)
    expect(run([{ type: 'tick', now: 40_000 }], restarted).elapsedMs).toBe(0)
  })

  it('restart after completion runs again from 0', () => {
    const done = run([{ type: 'start', now: 0 }, { type: 'tick', now: DUR }])
    expect(done.status).toBe('complete')
    const again = run([{ type: 'start', now: 60_000 }, { type: 'tick', now: 61_000 }], done)
    expect(again.status).toBe('running')
    expect(again.elapsedMs).toBe(1_000)
  })

  it('exit returns to idle and rest (frame null)', () => {
    const s = run([{ type: 'start', now: 0 }, { type: 'tick', now: 5_000 }, { type: 'exit' }])
    expect(s.status).toBe('idle')
    expect(s.elapsedMs).toBe(0)
    expect(frameOf(s)).toBeNull()
    expect(run([{ type: 'tick', now: 9_000 }], s)).toBe(s)
  })

  it('ticks while paused or idle change nothing', () => {
    const paused = run([{ type: 'start', now: 0 }, { type: 'pause', now: 3_000 }])
    expect(run([{ type: 'tick', now: 8_000 }], paused)).toBe(paused)
  })

  it('pausing after the end lands on complete, not beyond', () => {
    const s = run([{ type: 'start', now: 0 }, { type: 'pause', now: DUR + 5_000 }])
    expect(s.status).toBe('complete')
    expect(s.elapsedMs).toBe(DUR)
  })
})
