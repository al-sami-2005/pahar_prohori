/**
 * Current conditions per slope, at rest (no scenario running).
 * Instrumented slopes read their node's resting values; other slopes only have
 * the GPM area estimate. All values are SIMULATED for the demo.
 */
import type { SensorNode, Slope } from '@/types/domain'
import { evaluateAlert, type AlertDecision } from '@/lib/alertEngine'
import { gpmRainAt } from './gpm'
import { getNodeForSlope } from './sensors'
import { slopes } from './slopes'

/** One moment of conditions on a slope — resting or from a scenario frame. */
export interface LiveReading {
  /** On-slope rain gauge, or the satellite area estimate when the slope has no node. */
  rainSource: 'gauge' | 'satellite'
  /** mm/h */
  rainRate: number
  /** mm, last hour */
  rain1h: number
  /** mm, last 24 h */
  rain24h: number
  /** Relative saturation %, only with a ground node. */
  soilTop?: number
  soilDeep?: number
  /** Tilt change from baseline (°) and its rate (°/h), only with a ground node. */
  tiltDelta?: number
  tiltRate?: number
}

export interface SlopeLive {
  reading: LiveReading
  decision: AlertDecision
  node?: SensorNode
}

/** Build the engine input for a slope — shared by rest and scenario frames. */
export function decide(slope: Slope, reading: LiveReading, node: SensorNode | undefined, agreementMin = 0): AlertDecision {
  return evaluateAlert({
    relativeRisk: slope.relativeRiskIndex,
    rainfallRate: reading.rainRate,
    rainfall1h: reading.rain1h,
    rainfall24h: reading.rain24h,
    rainfallSource: reading.rainSource,
    topsoilMoisture: reading.soilTop,
    deepSoilMoisture: reading.soilDeep,
    tiltDelta: reading.tiltDelta,
    movementTrend: reading.tiltRate,
    sensorAgeMin: node ? node.lastSeenSec / 60 : undefined,
    nisarChange: slope.nisarChange === 'detected',
    signalAgreementMin: agreementMin,
  })
}

export function restReading(slope: Slope): LiveReading {
  const node = getNodeForSlope(slope.id)
  if (node) {
    const r = node.rest
    return {
      rainSource: 'gauge',
      rainRate: r.rainRate,
      rain1h: r.rainRate,
      rain24h: r.rain24h,
      soilTop: r.soilTop,
      soilDeep: r.soilDeep,
      tiltDelta: r.tiltDelta,
      tiltRate: 0,
    }
  }
  const rain24h = gpmRainAt(slope.center[0], slope.center[1])
  const rate = Math.round((rain24h / 24) * 10) / 10
  return { rainSource: 'satellite', rainRate: rate, rain1h: rate, rain24h }
}

const restCache = new Map<string, SlopeLive>()

export function restLive(slope: Slope): SlopeLive {
  const hit = restCache.get(slope.id)
  if (hit) return hit
  const node = getNodeForSlope(slope.id)
  const reading = restReading(slope)
  const live: SlopeLive = { reading, decision: decide(slope, reading, node), node }
  restCache.set(slope.id, live)
  return live
}

/** Alert level of every slope at rest — the map's initial feature-state. */
export const restAlerts: ReadonlyMap<string, AlertDecision['alertLevel']> = new Map(
  slopes.map((s) => [s.id, restLive(s).decision.alertLevel]),
)
