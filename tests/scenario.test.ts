import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AlertLevel } from '@/types/domain'
import { SCENARIO_FRAME_COUNT, SCENARIO_SCOPE, SCENARIO_TIMING } from '@/lib/scenarioConfig'
import { SCENARIO_EVENTS, liveAt } from '@/data/scenario'
import { slopes } from '@/data/slopes'

const HERO = SCENARIO_SCOPE.heroSlopeId
const N = SCENARIO_FRAME_COUNT
const rank: Record<AlertLevel, number> = { normal: 0, watch: 1, warning: 2, evacuate: 3 }
const levelAt = (frame: number) => liveAt(HERO, frame)!.decision.alertLevel
const firstFrame = (level: AlertLevel) => {
  for (let f = 0; f < N; f++) if (levelAt(f) === level) return f
  return -1
}

describe('hero scenario — Batali Hill · Sector 03 (NODE-03)', () => {
  it('covers 46 s in 100 ms frames', () => {
    expect(N).toBe(SCENARIO_TIMING.durationMs / SCENARIO_TIMING.frameMs + 1)
    expect(N).toBe(461)
  })

  it('NORMAL → WATCH at 7.1 s', () => {
    expect(levelAt(70)).toBe('normal')
    expect(levelAt(71)).toBe('watch')
    expect(firstFrame('watch')).toBe(71)
  })

  it('WATCH → WARNING at 17.5 s', () => {
    expect(levelAt(174)).toBe('watch')
    expect(levelAt(175)).toBe('warning')
    expect(firstFrame('warning')).toBe(175)
  })

  it('WARNING → EVACUATE at 39.5 s, after two signals confirm at 38.1 s', () => {
    expect(levelAt(394)).toBe('warning')
    expect(levelAt(395)).toBe('evacuate')
    expect(firstFrame('evacuate')).toBe(395)
    const confirming = liveAt(HERO, 381)!.decision
    expect(confirming.alertLevel).toBe('warning')
    expect(confirming.independentSignals).toBe(2)
    expect(liveAt(HERO, 380)!.decision.independentSignals).toBe(1)
  })

  it('status never de-escalates during the run', () => {
    for (let f = 1; f < N; f++) expect(rank[levelAt(f)]).toBeGreaterThanOrEqual(rank[levelAt(f - 1)])
  })

  it('every EVACUATE frame rests on both ground signals', () => {
    for (let f = 0; f < N; f++) {
      const d = liveAt(HERO, f)!.decision
      if (d.alertLevel !== 'evacuate') continue
      expect(d.triggeredConditions.saturation && d.triggeredConditions.movement).toBe(true)
      expect(d.independentSignals).toBe(2)
    }
  })

  it('event markers match the expected timestamps', () => {
    const at = Object.fromEntries(SCENARIO_EVENTS.map((e) => [e.id, e.at]))
    expect(at).toEqual({ heavyRain: 7.1, saturation: 17.5, movement: 35.3, signals: 38.1, evacuate: 39.5 })
  })
})

describe('scenario — every slope obeys the rules at every frame', () => {
  it('slopes without a ground node never exceed WATCH', () => {
    const noNode = slopes.filter((s) => !s.sensorId)
    expect(noNode.length).toBeGreaterThan(0)
    for (const s of noNode) {
      for (let f = 0; f < N; f++) expect(rank[liveAt(s.id, f)!.decision.alertLevel]).toBeLessThanOrEqual(rank.watch)
    }
  })

  it('only the hero slope reaches EVACUATE', () => {
    for (const s of slopes) {
      if (s.id === HERO) continue
      for (let f = 0; f < N; f++) expect(liveAt(s.id, f)!.decision.alertLevel).not.toBe('evacuate')
    }
  })
})

describe('scenario — determinism', () => {
  afterEach(() => vi.restoreAllMocks())

  async function fingerprint(): Promise<string> {
    vi.resetModules()
    const mod = await import('@/data/scenario')
    const { slopes: all } = await import('@/data/slopes')
    let s = ''
    for (const sl of all) {
      for (let f = 0; f < N; f++) {
        const l = mod.liveAt(sl.id, f)!
        s += `${JSON.stringify(l.reading)}|${l.decision.alertLevel}|${l.decision.decisionExplanation};`
      }
    }
    return s
  }

  it('produces identical telemetry and decisions for every frame on every build', async () => {
    const a = await fingerprint()
    const b = await fingerprint()
    expect(a.length).toBeGreaterThan(100_000)
    expect(a).toBe(b)
  })

  it('never uses Math.random or the wall clock to build frames', async () => {
    const random = vi.spyOn(Math, 'random')
    const now = vi.spyOn(Date, 'now')
    await fingerprint()
    expect(random).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
  })
})
