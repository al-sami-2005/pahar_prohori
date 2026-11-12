import { SCENARIO_SCOPE } from '@/lib/scenarioConfig'
import { useHeroLive } from './useLive'
import { useMission } from './useMission'

/**
 * The resident warning exists while the scenario's slope is at EVACUATE on the
 * Mission view. `expanded` = full warning; otherwise a compact banner.
 */
export function useResidentWarning() {
  const hero = useHeroLive()
  const { state } = useMission()
  const active = state.view.kind === 'mission' && hero?.decision.alertLevel === 'evacuate'
  return { active, expanded: active && !state.warningCollapsed, slopeId: SCENARIO_SCOPE.heroSlopeId }
}
