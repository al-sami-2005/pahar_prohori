import { useSyncExternalStore } from 'react'
import type { Budget, DeployScope } from '@/lib/deployment'

/**
 * Planner budget and scope, kept in memory for the browser session so they
 * survive route changes (Mission ↔ Deployment). Deliberately not persisted
 * beyond the page's lifetime.
 */
interface DeploymentPrefs {
  budget: Budget
  scope: DeployScope
}

let state: DeploymentPrefs = { budget: 10, scope: 'all' }
const listeners = new Set<() => void>()

export function setDeploymentPrefs(patch: Partial<DeploymentPrefs>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useDeploymentPrefs(): DeploymentPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state,
  )
}
