/**
 * The single run path. The CTA, the scenario bar's Restart and the Guided
 * Demo all start runs through `run()`, so every run looks the same.
 */
import { useCallback } from 'react'
import { SCENARIO_SCOPE } from '@/lib/scenarioConfig'
import { useMission } from './useMission'
import { useScenario } from './useScenario'

export function useScenarioControls() {
  const scenario = useScenario()
  const { dispatch } = useMission()

  /**
   * Always the Batali Hill story: Chattogram, CTG-S03 selected and active,
   * warning state reset, scenario time exactly 0.
   */
  const run = useCallback(() => {
    // Selecting the slope also moves the view to its site (Chattogram).
    dispatch({ type: 'select', id: SCENARIO_SCOPE.heroSlopeId })
    dispatch({ type: 'warningCollapsed', collapsed: false })
    scenario.start()
  }, [dispatch, scenario])

  /** Leave the scenario: back to resting conditions, nothing keeps running. */
  const exit = useCallback(() => {
    scenario.exit()
    dispatch({ type: 'warningCollapsed', collapsed: false })
  }, [dispatch, scenario])

  return { ...scenario, run, exit }
}
