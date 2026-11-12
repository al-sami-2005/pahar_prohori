import { describe, expect, it } from 'vitest'
import { evaluateAlert } from '@/lib/alertEngine'
import { ALERT_THRESHOLDS as T } from '@/lib/scenarioConfig'
import { heavyRain, held, inputs, level, moving, noNode, saturated } from './helpers'

describe('alert engine — the ladder', () => {
  it('NORMAL when no escalation condition is met', () => {
    const d = evaluateAlert(inputs())
    expect(d.alertLevel).toBe('normal')
    expect(d.independentSignals).toBe(0)
  })

  it('NORMAL → WATCH: meaningful rain on a high/critical-susceptibility slope', () => {
    expect(level({ rainfallRate: T.meaningfulRainRate - 0.1 })).toBe('normal')
    expect(level({ rainfallRate: T.meaningfulRainRate })).toBe('watch')
    expect(level({ rainfall24h: T.meaningfulRain24h })).toBe('watch')
  })

  it('heavy rain alone does not raise WATCH on a moderate-susceptibility slope', () => {
    expect(level({ relativeRisk: 0.5, ...heavyRain })).toBe('normal')
  })

  it('WATCH → WARNING: rain continuing AND ground near saturation', () => {
    expect(level({ ...heavyRain })).toBe('watch')
    expect(level({ ...heavyRain, ...saturated })).toBe('warning')
    expect(evaluateAlert(inputs({ ...heavyRain, ...saturated })).decisionExplanation).toBe('warning.rainSaturation')
  })

  it('WARNING → EVACUATE: saturation AND movement, agreeing for the hold period', () => {
    const confirming = evaluateAlert(inputs({ ...heavyRain, ...saturated, ...moving }))
    expect(confirming.alertLevel).toBe('warning')
    expect(confirming.decisionExplanation).toBe('warning.confirming')
    const evac = evaluateAlert(inputs({ ...heavyRain, ...saturated, ...moving, ...held }))
    expect(evac.alertLevel).toBe('evacuate')
    expect(evac.independentSignals).toBe(2)
    expect(evac.evidenceStates.ground).toBe('confirmed')
    expect(evac.evidenceStates.movement).toBe('confirmed')
  })
})

describe('alert engine — EVACUATE needs two independent ground signals', () => {
  it('saturation alone (even with heavy rain, held) is never EVACUATE', () => {
    const d = evaluateAlert(inputs({ ...heavyRain, ...saturated, ...held }))
    expect(d.alertLevel).toBe('warning')
    expect(d.independentSignals).toBe(1)
  })

  it('movement alone (even held) is never EVACUATE', () => {
    const d = evaluateAlert(inputs({ ...moving, ...held }))
    expect(d.alertLevel).toBe('watch')
    expect(d.decisionExplanation).toBe('watch.movementOnly')
    expect(d.independentSignals).toBe(1)
  })

  it('tilt past the threshold but no longer rising does not count as movement', () => {
    const d = evaluateAlert(inputs({ ...heavyRain, ...saturated, ...held, tiltDelta: T.movementTilt + 0.1, movementTrend: 0 }))
    expect(d.triggeredConditions.movement).toBe(false)
    expect(d.alertLevel).toBe('warning')
  })
})

describe('alert engine — Relative Risk never escalates on its own', () => {
  it('maximum Relative Risk with calm conditions stays NORMAL', () => {
    expect(level({ relativeRisk: 1 })).toBe('normal')
  })

  it('no Relative Risk value produces EVACUATE without both ground signals', () => {
    for (let rri = 0; rri <= 1.0001; rri += 0.05) {
      expect(level({ relativeRisk: rri, ...heavyRain, ...saturated, ...held })).not.toBe('evacuate')
      expect(level({ relativeRisk: rri, ...heavyRain, ...moving, ...held })).not.toBe('evacuate')
    }
  })

  it('with both ground signals, EVACUATE happens at any Relative Risk — the index is not an input to it', () => {
    for (const rri of [0.05, 0.4, 0.84, 1]) {
      expect(level({ relativeRisk: rri, ...saturated, ...moving, ...held })).toBe('evacuate')
    }
  })
})

describe('alert engine — slopes without a ground node', () => {
  it('cannot exceed WATCH however heavy the rain', () => {
    const d = evaluateAlert(inputs({ ...noNode, relativeRisk: 1, rainfallRate: 80, rainfall1h: 80, rainfall24h: 600, ...held }))
    expect(d.alertLevel).toBe('watch')
    expect(d.capped).toBe(true)
    expect(d.evidenceStates.ground).toBe('unavailable')
    expect(d.evidenceStates.movement).toBe('unavailable')
    expect(d.independentSignals).toBe(0)
  })
})

describe('alert engine — stale ground telemetry', () => {
  const stale = { sensorAgeMin: T.sensorStaleMin + 1 }

  it('cannot confirm saturation or movement', () => {
    const d = evaluateAlert(inputs({ ...heavyRain, ...saturated, ...moving, ...held, ...stale }))
    expect(d.triggeredConditions.saturation).toBe(false)
    expect(d.triggeredConditions.movement).toBe(false)
    expect(d.evidenceStates.ground).toBe('stale')
    expect(d.evidenceStates.movement).toBe('stale')
    expect(d.independentSignals).toBe(0)
    expect(d.alertLevel).toBe('watch') // rain on a critical slope still justifies WATCH
  })

  it('telemetry just inside the freshness window still counts', () => {
    expect(level({ ...saturated, ...moving, ...held, sensorAgeMin: T.sensorStaleMin })).toBe('evacuate')
  })
})
