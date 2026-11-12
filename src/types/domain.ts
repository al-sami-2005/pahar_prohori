/**
 * Core domain model for Pahar Prohori.
 *
 * Integrity rule: every value shown in the UI must be traceable to a
 * DataProvenance. Simulated or placeholder values are never allowed to look
 * measured.
 */

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

/**
 * - nasa:      NASA / NASA–ISRO data or catalog metadata used as-is
 * - derived:   computed by the team from NASA data (e.g. slope from DEM, change from GCOV)
 * - simulated: deterministic demo values — not observations
 * - lab:       measured in the controlled soil-tray test — not field data
 */
export type ProvenanceKind = 'nasa' | 'derived' | 'simulated' | 'lab'

/** "validated" is intentionally absent until the team has real validation results. */
export type ValidationStatus = 'pending' | 'prototype-backtest'

export interface DataProvenance {
  kind: ProvenanceKind
  /** Human-readable source, e.g. "NASA CMR catalog" or "Pahar Prohori demo scenario". */
  source: string
  /** Product identifier, e.g. "NISAR_L2_GCOV_PROVISIONAL_V1". */
  product?: string
  /** When the underlying observation was acquired (ISO 8601). */
  acquiredAt?: string
  /** When this value was last produced/refreshed (ISO 8601). */
  updatedAt?: string
  stale?: boolean
  validation?: ValidationStatus
  /** Short caveat shown next to the value. */
  note?: string
}

/* ------------------------------------------------------------------ */
/* Alert + risk vocabulary                                             */
/* ------------------------------------------------------------------ */

/**
 * "normal" is the calm pre-alert state (routine monitoring). The three
 * escalation levels from the concept brief are watch → warning → evacuate.
 */
export type AlertLevel = 'normal' | 'watch' | 'warning' | 'evacuate'

/** Band of the Relative Risk Index — a ranking, not a failure probability. */
export type RiskBand = 'low' | 'moderate' | 'high' | 'critical'

export type Confidence = 'low' | 'medium' | 'high'

export type SiteId = 'chattogram' | 'ukhiya-teknaf'

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

/**
 * A monitored slope unit. Static attributes only — live conditions (rain, soil,
 * tilt) come from telemetry and the alert level from lib/alertEngine.
 */
export interface Slope {
  id: string
  site: SiteId
  /** Named hill locality the unit belongs to (position approximate in the demo). */
  locality: string
  sector: number
  /** 0–1 relative ranking score. NOT a calibrated probability of failure. */
  relativeRiskIndex: number
  riskBand: RiskBand
  confidence: Confidence
  slopeDegrees: number
  nisarChange: 'detected' | 'none'
  sensorId: string | null
  /** 1 = highest Relative Risk Index across all monitored slopes. */
  rank: number
  /** [longitude, latitude] */
  center: [number, number]
  /** [[west, south], [east, north]] */
  bounds: [[number, number], [number, number]]
}

export type LinkQuality = 'good' | 'fair' | 'poor' | 'offline'

/** One set of readings from a ground node. */
export interface NodeReading {
  /** Rainfall rate (mm/h). */
  rainRate: number
  /** Accumulated rainfall over trailing 24 h (mm). */
  rain24h: number
  /** Relative saturation (0–100 %). */
  soilTop: number
  soilDeep: number
  /** Tilt change from baseline (degrees). */
  tiltDelta: number
}

export interface SensorNode {
  id: string
  slopeId: string
  /** [longitude, latitude] */
  coordinates: [number, number]
  batteryPct: number
  link: LinkQuality
  /** LoRa received signal strength (dBm). */
  rssi: number
  /** Seconds since the last packet at demo start. */
  lastSeenSec: number
  /** Resting readings before any scenario runs. */
  rest: NodeReading
}

/** One telemetry sample from a ground node. */
export interface TelemetryFrame {
  /** ISO 8601 timestamp. */
  t: string
  /** Rainfall rate (mm/h). */
  rainRate: number
  /** Accumulated rainfall over trailing 24 h (mm). */
  rain24h: number
  /** Relative saturation (0–100 %). */
  soilTop: number
  soilDeep: number
  /** Tilt change from baseline (degrees). */
  tiltDelta: number
}
