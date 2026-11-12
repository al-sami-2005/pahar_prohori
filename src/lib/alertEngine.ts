/**
 * Alert engine — the ONLY place an alert level is decided.
 *
 * A pure function: current conditions in, a decision with its full evidence out.
 * UI components render the result; they never compare telemetry to thresholds.
 *
 * ILLUSTRATIVE DEMO THRESHOLDS — NOT OPERATIONAL (see lib/scenarioConfig.ts).
 *
 * Two different questions, kept apart on purpose:
 *   Relative Risk  → how susceptible this slope is compared with the others (a ranking).
 *   Alert status   → what current, monitored conditions justify right now.
 * A high Relative Risk Index only decides whether rain on this slope deserves WATCH.
 * It never raises an alert on its own and never counts toward EVACUATE, which needs
 * two independent in-situ signals — ground saturation AND movement — from a ground node.
 */
import type { AlertLevel, RiskBand } from '@/types/domain'
import { riskBandFor } from './alertLevels'
import { ALERT_THRESHOLDS, type AlertThresholds } from './scenarioConfig'

/** The six links of the Evidence Chain, in causal order. */
export type EvidenceStep = 'space' | 'environment' | 'terrain' | 'ground' | 'movement' | 'decision'

export const EVIDENCE_STEPS: readonly EvidenceStep[] = ['space', 'environment', 'terrain', 'ground', 'movement', 'decision']

/**
 * - observed       evidence on record; context, not a trigger
 * - contributing   pushing toward escalation, below its confirmation threshold
 * - confirmed      crossed its (illustrative) threshold; counts in the decision
 * - not-triggered  monitored, nothing detected
 * - stale          data too old to use in a decision
 * - unavailable    nothing measures this here (no ground node on the slope)
 */
export type EvidenceState = 'observed' | 'contributing' | 'confirmed' | 'not-triggered' | 'stale' | 'unavailable'

export type BasisId = 'rainContinuing' | 'saturation' | 'movement'

/** Why the level is what it is — translated by the UI. */
export type DecisionReason =
  | 'normal.calm'
  | 'normal.lowSusceptibility'
  | 'watch.rain'
  | 'watch.rainNoNode'
  | 'watch.saturationOnly'
  | 'watch.movementOnly'
  | 'warning.rainSaturation'
  | 'warning.confirming'
  | 'evacuate.twoSignals'

export interface AlertInputs {
  /** 0–1 ranking score. Not a probability. */
  relativeRisk: number
  /** mm/h */
  rainfallRate: number
  /** mm over the last hour */
  rainfall1h: number
  /** mm over the last 24 h */
  rainfall24h: number
  /** On-slope gauge, or the satellite area estimate (GPM IMERG) when there is no node. */
  rainfallSource: 'gauge' | 'satellite'
  /** Relative saturation %, undefined when the slope has no ground node. */
  topsoilMoisture?: number
  deepSoilMoisture?: number
  /** Tilt change from baseline (°). */
  tiltDelta?: number
  /** Rate of tilt change (°/h). */
  movementTrend?: number
  /** Minutes since the node's last packet. */
  sensorAgeMin?: number
  /** NISAR change evidence on this slope. */
  nisarChange: boolean
  /** Minutes both in-situ signals have been confirmed together (computed by the caller from history). */
  signalAgreementMin?: number
  config?: AlertThresholds
}

export interface TriggeredConditions {
  meaningfulRain: boolean
  highSusceptibility: boolean
  rainContinuing: boolean
  saturation: boolean
  movement: boolean
}

export interface AlertDecision {
  alertLevel: AlertLevel
  riskBand: RiskBand
  triggeredConditions: TriggeredConditions
  evidenceStates: Record<EvidenceStep, EvidenceState>
  /** The three current-condition checks the ladder is built from, in order. */
  basis: ReadonlyArray<{ id: BasisId; state: EvidenceState }>
  /** Confirmed independent in-situ signals (saturation, movement). EVACUATE needs 2. */
  independentSignals: 0 | 1 | 2
  decisionExplanation: DecisionReason
  /** True when the slope has no ground node, so the level cannot exceed WATCH. */
  capped: boolean
}

export function evaluateAlert(input: AlertInputs): AlertDecision {
  const cfg = input.config ?? ALERT_THRESHOLDS
  const band = riskBandFor(input.relativeRisk)
  const hasNode =
    input.topsoilMoisture !== undefined && input.deepSoilMoisture !== undefined && input.tiltDelta !== undefined
  const stale = hasNode && (input.sensorAgeMin ?? 0) > cfg.sensorStaleMin
  const live = hasNode && !stale

  const top = input.topsoilMoisture ?? 0
  const deep = input.deepSoilMoisture ?? 0
  const tilt = input.tiltDelta ?? 0
  const trend = input.movementTrend ?? 0

  const c: TriggeredConditions = {
    meaningfulRain: input.rainfallRate >= cfg.meaningfulRainRate || input.rainfall24h >= cfg.meaningfulRain24h,
    highSusceptibility: cfg.watchRiskBands.includes(band),
    rainContinuing: input.rainfallRate >= cfg.continuingRainRate && input.rainfall24h >= cfg.continuingRain24h,
    saturation: live && deep >= cfg.saturationDeep,
    movement: live && tilt >= cfg.movementTilt && trend >= cfg.movementRate,
  }
  const agree = c.saturation && c.movement
  const held = agree && (input.signalAgreementMin ?? 0) >= cfg.evacuateHoldMin

  /* ---------------- the ladder ---------------- */
  let level: AlertLevel
  let reason: DecisionReason
  if (held) {
    level = 'evacuate'
    reason = 'evacuate.twoSignals'
  } else if (agree) {
    level = 'warning'
    reason = 'warning.confirming'
  } else if (c.saturation && c.rainContinuing) {
    level = 'warning'
    reason = 'warning.rainSaturation'
  } else if (c.meaningfulRain && c.highSusceptibility) {
    level = 'watch'
    reason = hasNode ? 'watch.rain' : 'watch.rainNoNode'
  } else if (c.saturation) {
    level = 'watch'
    reason = 'watch.saturationOnly'
  } else if (c.movement) {
    level = 'watch'
    reason = 'watch.movementOnly'
  } else {
    level = 'normal'
    reason = c.meaningfulRain ? 'normal.lowSusceptibility' : 'normal.calm'
  }

  /* ---------------- evidence states ---------------- */
  const environment: EvidenceState = c.rainContinuing
    ? 'confirmed'
    : c.meaningfulRain
      ? 'contributing'
      : input.rainfallRate >= cfg.lightRainRate
        ? 'observed'
        : 'not-triggered'

  const ground: EvidenceState = !hasNode
    ? 'unavailable'
    : stale
      ? 'stale'
      : c.saturation
        ? 'confirmed'
        : top >= cfg.wettingTop || deep >= cfg.wettingDeep
          ? 'contributing'
          : 'not-triggered'

  const movement: EvidenceState = !hasNode
    ? 'unavailable'
    : stale
      ? 'stale'
      : c.movement
        ? 'confirmed'
        : tilt >= cfg.tiltContributing
          ? 'contributing'
          : 'not-triggered'

  const evidenceStates: Record<EvidenceStep, EvidenceState> = {
    space: input.nisarChange ? 'observed' : 'not-triggered',
    environment,
    // Susceptibility is context. It "contributes" only while rain makes it matter; it is never confirmed.
    terrain: c.highSusceptibility && c.meaningfulRain ? 'contributing' : 'observed',
    ground,
    movement,
    decision: level === 'normal' ? 'not-triggered' : 'confirmed',
  }

  return {
    alertLevel: level,
    riskBand: band,
    triggeredConditions: c,
    evidenceStates,
    basis: [
      { id: 'rainContinuing', state: environment === 'observed' ? 'not-triggered' : environment },
      { id: 'saturation', state: ground },
      { id: 'movement', state: movement },
    ],
    independentSignals: ((c.saturation ? 1 : 0) + (c.movement ? 1 : 0)) as 0 | 1 | 2,
    decisionExplanation: reason,
    capped: !hasNode,
  }
}
