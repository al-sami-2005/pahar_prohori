/**
 * Monsoon Scenario + alert-rule configuration.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ ILLUSTRATIVE DEMO THRESHOLDS — NOT OPERATIONAL                   │
 * │ Every number in this file was chosen so the demo storm explains  │
 * │ itself. None has been lab-calibrated or field-validated. Replace │
 * │ with calibrated values before any real use.                      │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * This is the only file that holds scenario timing or alert thresholds.
 * Components never compare telemetry against numbers of their own.
 */
import type { RiskBand, SiteId } from '@/types/domain'

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

export const SCENARIO_TIMING = {
  /** Length of one run. */
  durationMs: 46_000,
  /** Derived state advances in 100 ms frames (10 Hz) — smooth, and cheap to render. */
  frameMs: 100,
  /** Compressed clock: one scenario second stands for 15 minutes of storm (46 s ≈ 11.5 h). */
  simMinutesPerSecond: 15,
} as const

export const SCENARIO_FRAME_COUNT = SCENARIO_TIMING.durationMs / SCENARIO_TIMING.frameMs + 1

/** Minutes of simulated storm per frame. */
export const SIM_MINUTES_PER_FRAME = (SCENARIO_TIMING.frameMs / 1000) * SCENARIO_TIMING.simMinutesPerSecond

export const SCENARIO_SCOPE: { site: SiteId; heroSlopeId: string; heroNodeId: string } = {
  /** The storm is centred on Chattogram; Ukhiya–Teknaf stays at rest. */
  site: 'chattogram',
  /** Batali Hill · Sector 03 — critical susceptibility, NISAR change evidence, ground node NODE-03. */
  heroSlopeId: 'CTG-S03',
  heroNodeId: 'NODE-03',
}

export type ScenarioPhaseId = 'baseline' | 'heavyRain' | 'saturation' | 'slopeResponse' | 'movement'

/** Narrative phases shown in the ribbon and tour. Alert levels come from the engine, not from these. */
export const SCENARIO_PHASES: ReadonlyArray<{ id: ScenarioPhaseId; fromS: number; toS: number }> = [
  { id: 'baseline', fromS: 0, toS: 7 },
  { id: 'heavyRain', fromS: 7, toS: 17 },
  { id: 'saturation', fromS: 17, toS: 29 },
  { id: 'slopeResponse', fromS: 29, toS: 38 },
  { id: 'movement', fromS: 38, toS: 46 },
]

/* ------------------------------------------------------------------ */
/* Data-source timing                                                  */
/* ------------------------------------------------------------------ */

export const SOURCE_TIMING = {
  /** GPM IMERG Early run latency (~4 h). Slopes without a gauge see rain this late. */
  gpmLatencyMin: 240,
  /** Ground nodes report every 30 s. */
  nodePacketSec: 30,
  /** NISAR revisit over the area (days). */
  nisarRevisitDays: 12,
} as const

/* ------------------------------------------------------------------ */
/* Alert thresholds — ILLUSTRATIVE DEMO THRESHOLDS, NOT OPERATIONAL    */
/* ------------------------------------------------------------------ */

export interface AlertThresholds {
  /** WATCH: rainfall that matters — rate (mm/h) … */
  meaningfulRainRate: number
  /** … or 24 h accumulation (mm). */
  meaningfulRain24h: number
  /** Susceptibility bands on which meaningful rain raises WATCH. Susceptibility never raises an alert alone. */
  watchRiskBands: readonly RiskBand[]
  /** Rain recorded but below any trigger (mm/h). */
  lightRainRate: number
  /** WARNING part 1 — rain continuing: still this heavy (mm/h) … */
  continuingRainRate: number
  /** … after at least this much in 24 h (mm). */
  continuingRain24h: number
  /** WARNING part 2 / EVACUATE signal 1 — deep-probe relative saturation (%). */
  saturationDeep: number
  /** Ground wetting up but not saturated: topsoil (%) … */
  wettingTop: number
  /** … or deep probe (%). */
  wettingDeep: number
  /** EVACUATE signal 2 — tilt change from baseline (°) … */
  movementTilt: number
  /** … still increasing at least this fast (°/h). */
  movementRate: number
  /** Tilt worth watching, not yet movement (°). */
  tiltContributing: number
  /** Both in-situ signals must agree this long before EVACUATE (storm minutes). */
  evacuateHoldMin: number
  /** Ground telemetry older than this cannot confirm anything (minutes). */
  sensorStaleMin: number
}

export const ALERT_THRESHOLDS: AlertThresholds = {
  meaningfulRainRate: 10,
  meaningfulRain24h: 90,
  watchRiskBands: ['high', 'critical'],
  lightRainRate: 0.5,
  continuingRainRate: 10,
  continuingRain24h: 90,
  saturationDeep: 85,
  wettingTop: 75,
  wettingDeep: 65,
  movementTilt: 0.25,
  movementRate: 0.05,
  tiltContributing: 0.08,
  evacuateHoldMin: 20,
  sensorStaleMin: 15,
}
