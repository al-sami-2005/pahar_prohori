import { useEffect, useRef, type RefObject } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { AlertLevel } from '@/types/domain'
import { useMission } from '@/hooks/useMission'
import { useScenario } from '@/hooks/useScenario'
import { alertsAt } from '@/data/scenario'
import { getNode } from '@/data/sensors'

/**
 * Pushes the current scenario frame into the map as feature-state and marker
 * attributes. Renders nothing; only slopes whose level changed are touched, and
 * the MapLibre instance is never re-created.
 */
export function ScenarioMapSync({
  map,
  nodeEls,
}: {
  map: MapLibreMap
  nodeEls: RefObject<ReadonlyMap<string, HTMLElement>>
}) {
  const { frame, active } = useScenario()
  const { state } = useMission()
  // The storm only exists on Mission Control; Replay and Deployment show resting states.
  const levels = alertsAt(state.view.kind === 'mission' ? frame : null)
  const applied = useRef(new Map<string, AlertLevel>())

  useEffect(() => {
    for (const [id, level] of levels) {
      if (applied.current.get(id) === level) continue
      map.setFeatureState({ source: 'slopes', id }, { alert: level })
      applied.current.set(id, level)
    }
    for (const [nid, el] of nodeEls.current) {
      const slopeId = getNode(nid)?.slopeId
      const level = (slopeId && levels.get(slopeId)) || 'normal'
      if (el.getAttribute('data-alert') !== level) el.setAttribute('data-alert', level)
      // While the scenario streams, a static "seconds since last packet" would be misleading.
      el.setAttribute('data-live', String(active))
    }
  }, [map, levels, nodeEls, active])

  return null
}
