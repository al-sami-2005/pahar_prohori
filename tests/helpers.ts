import { evaluateAlert, type AlertInputs } from '@/lib/alertEngine'
import { ALERT_THRESHOLDS as T } from '@/lib/scenarioConfig'

/** A fresh, calm, instrumented, critical-susceptibility slope. Override what a test needs. */
export function inputs(over: Partial<AlertInputs> = {}): AlertInputs {
  return {
    relativeRisk: 0.84,
    rainfallRate: 2,
    rainfall1h: 2,
    rainfall24h: 30,
    rainfallSource: 'gauge',
    topsoilMoisture: 55,
    deepSoilMoisture: 45,
    tiltDelta: 0.01,
    movementTrend: 0,
    sensorAgeMin: 0.1,
    nisarChange: true,
    signalAgreementMin: 0,
    ...over,
  }
}

/** Conditions that satisfy each rule, derived from the (illustrative) thresholds — never hard-coded. */
export const heavyRain = { rainfallRate: T.continuingRainRate + 5, rainfall1h: 25, rainfall24h: T.continuingRain24h + 60 }
export const saturated = { deepSoilMoisture: T.saturationDeep + 5, topsoilMoisture: 95 }
export const moving = { tiltDelta: T.movementTilt + 0.1, movementTrend: T.movementRate + 0.1 }
export const held = { signalAgreementMin: T.evacuateHoldMin + 1 }
export const noNode = { topsoilMoisture: undefined, deepSoilMoisture: undefined, tiltDelta: undefined, movementTrend: undefined, sensorAgeMin: undefined, rainfallSource: 'satellite' as const }

export const level = (over: Partial<AlertInputs> = {}) => evaluateAlert(inputs(over)).alertLevel
