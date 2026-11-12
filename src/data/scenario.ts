/**
 * Deterministic Monsoon Scenario — every frame of every affected slope,
 * computed once at module load. SIMULATED data; no randomness, no wall clock.
 *
 * Frame N is identical on every run: the curves below are fixed keyframes,
 * rainfall accumulations are integrated from the rate, and each frame's alert
 * level comes from lib/alertEngine (never from this file).
 *
 * Story: a monsoon cell sits over Chattogram. The ground node on Batali Hill ·
 * Sector 03 sees rain, saturation and finally movement. Other gauged slopes get
 * wet but do not move. Slopes without a node only know GPM rainfall, which
 * arrives ~4 h late, and can never rise above WATCH.
 */
import type { AlertLevel, Slope } from '@/types/domain'
import {
  SCENARIO_FRAME_COUNT,
  SCENARIO_PHASES,
  SCENARIO_SCOPE,
  SCENARIO_TIMING,
  SIM_MINUTES_PER_FRAME,
  SOURCE_TIMING,
  type ScenarioPhaseId,
} from '@/lib/scenarioConfig'
import { gpmRainAt } from './gpm'
import { getNodeForSlope } from './sensors'
import { getSlope, slopes } from './slopes'
import { decide, restLive, type LiveReading, type SlopeLive } from './telemetry'

/* ------------------------------------------------------------------ */
/* Curves                                                              */
/* ------------------------------------------------------------------ */

type Key = readonly [seconds: number, value: number]

/** Monotone cubic (Fritsch–Carlson) through the keyframes: smooth, no overshoot. */
function curve(keys: readonly Key[]): (s: number) => number {
  const n = keys.length
  const xs = keys.map((k) => k[0])
  const ys = keys.map((k) => k[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!))
  const m: number[] = [d[0]!]
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2)
  m.push(d[n - 2]!)
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i]! / d[i]!
    const b = m[i + 1]! / d[i]!
    const h = a * a + b * b
    if (h > 9) {
      const t = 3 / Math.sqrt(h)
      m[i] = t * a * d[i]!
      m[i + 1] = t * b * d[i]!
    }
  }
  return (s: number) => {
    if (s <= xs[0]!) return ys[0]!
    if (s >= xs[n - 1]!) return ys[n - 1]!
    let i = 0
    while (s > xs[i + 1]!) i++
    const h = xs[i + 1]! - xs[i]!
    const t = (s - xs[i]!) / h
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i]! +
      (t3 - 2 * t2 + t) * h * m[i]! +
      (-2 * t3 + 3 * t2) * ys[i + 1]! +
      (t3 - t2) * h * m[i + 1]!
    )
  }
}

/** Batali Hill · Sector 03 (NODE-03). Seconds of scenario time → reading. */
const HERO = {
  /** Rain-gauge rate, mm/h: moderate → heavy from ~7 s → sustained. */
  rainRate: curve([
    [0, 2.4], [3, 3.1], [6, 3.6], [7.2, 11], [9, 20], [10.5, 27], [12, 31], [14, 29],
    [17, 32], [22, 34], [26, 30], [29, 31], [33, 28], [38, 30], [42, 27], [46, 26],
  ]),
  /** Topsoil relative saturation, %: responds first. */
  soilTop: curve([
    [0, 58], [7, 59], [8.5, 61], [10, 66], [12, 74], [14, 81], [17, 88], [20, 93], [24, 95], [29, 96], [38, 97], [46, 97],
  ]),
  /** Deep probe, %: lags the topsoil, crosses near-saturation after ~17 s. */
  soilDeep: curve([
    [0, 49], [9, 50], [11, 54], [13, 62], [15, 72], [17, 83], [18, 86], [20, 89], [23, 91], [29, 93], [38, 95], [46, 96],
  ]),
  /** Tilt change from baseline, °: stable, then a small change from ~33 s, rising through the movement threshold. */
  tiltDelta: curve([
    [0, 0.01], [29, 0.014], [33, 0.018], [34, 0.03], [35, 0.07], [36, 0.12], [37, 0.18], [38, 0.245], [39, 0.3],
    [41, 0.36], [43, 0.42], [46, 0.5],
  ]),
}

/**
 * Other gauged slopes in the storm: same rain cell (scaled), wetter soil, no movement.
 * `wet` scales the hero's soil response; `deepCap` keeps them below near-saturation.
 */
const RESPONSE: Readonly<Record<string, { rain: number; wet: number; deepCap: number }>> = {
  'NODE-01': { rain: 0.9, wet: 0.78, deepCap: 79 },
  'NODE-02': { rain: 0.95, wet: 0.72, deepCap: 76 },
  'NODE-04': { rain: 0.8, wet: 0.62, deepCap: 71 },
}

/* ------------------------------------------------------------------ */
/* Frame builder                                                       */
/* ------------------------------------------------------------------ */

const N = SCENARIO_FRAME_COUNT
const FRAME_S = SCENARIO_TIMING.frameMs / 1000
const FRAME_H = SIM_MINUTES_PER_FRAME / 60
const FRAMES_PER_HOUR = Math.round(60 / SIM_MINUTES_PER_FRAME)
const GPM_LAG_FRAMES = Math.round(SOURCE_TIMING.gpmLatencyMin / SIM_MINUTES_PER_FRAME)
const round1 = (v: number) => Math.round(v * 10) / 10
const round3 = (v: number) => Math.round(v * 1000) / 1000

/** Rain rate per frame → trailing 1 h and 24 h accumulations (trapezoid rule). */
function accumulate(rates: readonly number[], base24h: number) {
  const r1h: number[] = []
  const r24h: number[] = []
  let total = 0
  for (let i = 0; i < rates.length; i++) {
    if (i > 0) total += ((rates[i - 1]! + rates[i]!) / 2) * FRAME_H
    r24h.push(base24h + total)
    // Before the run started the slope was at its first rate.
    let hour = 0
    for (let k = i - FRAMES_PER_HOUR + 1; k <= i; k++) hour += (k < 0 ? rates[0]! : rates[k]!) * FRAME_H
    r1h.push(hour)
  }
  return { r1h, r24h }
}

const heroRates = Array.from({ length: N }, (_, i) => HERO.rainRate(i * FRAME_S))
const heroTop = Array.from({ length: N }, (_, i) => HERO.soilTop(i * FRAME_S))
const heroDeep = Array.from({ length: N }, (_, i) => HERO.soilDeep(i * FRAME_S))
const heroTilt = Array.from({ length: N }, (_, i) => HERO.tiltDelta(i * FRAME_S))

function gaugedReadings(slope: Slope): LiveReading[] {
  const node = getNodeForSlope(slope.id)!
  const isHero = slope.id === SCENARIO_SCOPE.heroSlopeId
  const resp = RESPONSE[node.id] ?? { rain: 0.85, wet: 0.6, deepCap: 70 }
  const rates = heroRates.map((r) => (isHero ? r : r * resp.rain))
  const { r1h, r24h } = accumulate(rates, node.rest.rain24h)
  return rates.map((rate, i) => {
    const top = isHero ? heroTop[i]! : Math.min(97, node.rest.soilTop + (heroTop[i]! - heroTop[0]!) * resp.wet)
    const deep = isHero ? heroDeep[i]! : Math.min(resp.deepCap, node.rest.soilDeep + (heroDeep[i]! - heroDeep[0]!) * resp.wet)
    const tilt = isHero ? heroTilt[i]! : node.rest.tiltDelta
    const prevTilt = isHero ? heroTilt[Math.max(0, i - 1)]! : node.rest.tiltDelta
    return {
      rainSource: 'gauge',
      rainRate: round1(rate),
      rain1h: round1(r1h[i]!),
      rain24h: round1(r24h[i]!),
      soilTop: Math.round(top),
      soilDeep: Math.round(deep),
      tiltDelta: round3(tilt),
      tiltRate: i === 0 ? 0 : round3((tilt - prevTilt) / FRAME_H),
    }
  })
}

/** No node: GPM IMERG area rain only, delayed by the Early-run latency. */
function satelliteReadings(slope: Slope): LiveReading[] {
  const hero = getNodeForSlope(SCENARIO_SCOPE.heroSlopeId)!
  const rest = gpmRainAt(slope.center[0], slope.center[1])
  const f = Math.min(1.1, Math.max(0.75, rest / hero.rest.rain24h))
  const lagged = heroRates.map((_, i) => heroRates[Math.max(0, i - GPM_LAG_FRAMES)]! * f)
  const { r1h, r24h } = accumulate(lagged, rest)
  return lagged.map((rate, i) => ({
    rainSource: 'satellite',
    rainRate: round1(rate),
    rain1h: round1(r1h[i]!),
    rain24h: round1(r24h[i]!),
  }))
}

function buildSeries(slope: Slope): SlopeLive[] {
  const node = getNodeForSlope(slope.id)
  const readings = node ? gaugedReadings(slope) : satelliteReadings(slope)
  // The node streams during the run, so its telemetry is always current.
  const liveNode = node ? { ...node, lastSeenSec: 0 } : undefined
  const out: SlopeLive[] = []
  let agreement = 0
  let agreeing = false
  for (const reading of readings) {
    const first = decide(slope, reading, liveNode, 0)
    const both = first.triggeredConditions.saturation && first.triggeredConditions.movement
    agreement = both ? (agreeing ? agreement + SIM_MINUTES_PER_FRAME : 0) : 0
    agreeing = both
    const decision = both ? decide(slope, reading, liveNode, agreement) : first
    out.push({ reading, decision, node: liveNode })
  }
  return out
}

const inScope = slopes.filter((s) => s.site === SCENARIO_SCOPE.site)
const SERIES: ReadonlyMap<string, readonly SlopeLive[]> = new Map(inScope.map((s) => [s.id, buildSeries(s)]))

/* ------------------------------------------------------------------ */
/* Public selectors                                                    */
/* ------------------------------------------------------------------ */

/** Any frame index maps into the precomputed range. */
const clampFrame = (frame: number) => Math.max(0, Math.min(N - 1, Math.floor(frame) || 0))

/** Conditions + decision for a slope at a frame (`null` = at rest, no scenario). */
export function liveAt(slopeId: string, frame: number | null): SlopeLive | undefined {
  const slope = getSlope(slopeId)
  if (!slope) return undefined
  if (frame === null) return restLive(slope)
  const series = SERIES.get(slopeId)
  return series ? series[clampFrame(frame)] : restLive(slope)
}

/** Readings from the start of the run up to `frame` — for sparklines. Empty at rest or out of scope. */
export function historyFor(slopeId: string, frame: number | null): readonly SlopeLive[] {
  if (frame === null) return []
  return SERIES.get(slopeId)?.slice(0, clampFrame(frame) + 1) ?? []
}

export function inScenario(slopeId: string): boolean {
  return SERIES.has(slopeId)
}

const alertCache = new Map<number, ReadonlyMap<string, AlertLevel>>()
const restMap: ReadonlyMap<string, AlertLevel> = new Map(slopes.map((s) => [s.id, restLive(s).decision.alertLevel]))

/** Alert level of every slope at a frame. Cached per frame. */
export function alertsAt(frame: number | null): ReadonlyMap<string, AlertLevel> {
  if (frame === null) return restMap
  const f = clampFrame(frame)
  const hit = alertCache.get(f)
  if (hit) return hit
  const map = new Map(restMap)
  for (const [id, series] of SERIES) map.set(id, series[f]!.decision.alertLevel)
  alertCache.set(f, map)
  return map
}

export function phaseAt(frame: number | null): ScenarioPhaseId | null {
  if (frame === null) return null
  const s = clampFrame(frame) * FRAME_S
  return (SCENARIO_PHASES.find((p) => s >= p.fromS && s < p.toS) ?? SCENARIO_PHASES[SCENARIO_PHASES.length - 1]!).id
}

/** Minutes of simulated storm at a frame. */
export function stormMinutesAt(frame: number): number {
  return frame * SIM_MINUTES_PER_FRAME
}

/* ------------------------------------------------------------------ */
/* Events — measured from the hero's engine output                     */
/* ------------------------------------------------------------------ */

export type ScenarioEventId = 'heavyRain' | 'saturation' | 'movement' | 'signals' | 'evacuate'

export interface ScenarioEvent {
  id: ScenarioEventId
  frame: number
  /** Scenario seconds. */
  at: number
}

function firstFrame(test: (live: SlopeLive) => boolean): number {
  const series = SERIES.get(SCENARIO_SCOPE.heroSlopeId) ?? []
  const i = series.findIndex(test)
  return i < 0 ? N - 1 : i
}

const rank: Record<AlertLevel, number> = { normal: 0, watch: 1, warning: 2, evacuate: 3 }

export const SCENARIO_EVENTS: readonly ScenarioEvent[] = (
  [
    ['heavyRain', firstFrame((l) => rank[l.decision.alertLevel] >= 1)],
    ['saturation', firstFrame((l) => rank[l.decision.alertLevel] >= 2)],
    ['movement', firstFrame((l) => l.decision.evidenceStates.movement !== 'not-triggered')],
    ['signals', firstFrame((l) => l.decision.independentSignals === 2)],
    ['evacuate', firstFrame((l) => l.decision.alertLevel === 'evacuate')],
  ] as const
).map(([id, frame]) => ({ id, frame, at: round1(frame * FRAME_S) }))

export function eventFrame(id: ScenarioEventId): number {
  return SCENARIO_EVENTS.find((e) => e.id === id)?.frame ?? N - 1
}
