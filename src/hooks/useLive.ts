/**
 * Read-only views of the scenario for components. Every one of them derives
 * from the same scenario frame, so nothing on screen can disagree.
 */
import { useMemo } from 'react'
import { SCENARIO_SCOPE } from '@/lib/scenarioConfig'
import { alertsAt, historyFor, liveAt, phaseAt } from '@/data/scenario'
import type { SlopeLive } from '@/data/telemetry'
import { useScenario } from './useScenario'

/** Conditions + alert decision for a slope right now (rest values when no scenario runs). */
export function useSlopeLive(slopeId: string | null | undefined): SlopeLive | undefined {
  const { frame } = useScenario()
  return slopeId ? liveAt(slopeId, frame) : undefined
}

/** Readings since the storm began, for sparklines. Empty at rest. */
export function useSlopeHistory(slopeId: string | null | undefined): readonly SlopeLive[] {
  const { frame } = useScenario()
  return useMemo(() => (slopeId ? historyFor(slopeId, frame) : []), [slopeId, frame])
}

/** Alert level of every slope right now. */
export function useAlertLevels() {
  const { frame } = useScenario()
  return alertsAt(frame)
}

/** The slope the scenario story follows (Batali Hill · Sector 03). */
export function useHeroLive(): SlopeLive | undefined {
  return useSlopeLive(SCENARIO_SCOPE.heroSlopeId)
}

export function useScenarioPhase() {
  const { frame } = useScenario()
  return phaseAt(frame)
}
