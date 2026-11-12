/**
 * Guardian Deployment Planner — prototype priority ranking (pure).
 *
 * The rule, in full:
 *   1. Candidates are the monitored slopes in scope (all sites, or one site).
 *   2. They are ordered exactly as Mission Control ranks them: Relative Risk
 *      Index, highest first; ties broken by slope ID (see data/slopes.ts).
 *   3. A budget of N covers the first N candidates — one node per slope.
 *   4. A slope that already carries a simulated demo node keeps it
 *      ("existing"); every other covered slope gets a proposed node.
 *
 * Nothing else is weighed: population, exposure, access and cost are not in
 * the data. This is a transparent ranking rule, not an optimisation.
 */
import type { SiteId, Slope } from '@/types/domain'
import { slopes as allSlopes } from '@/data/slopes'

export const BUDGETS = [5, 10, 25, 50] as const
export type Budget = (typeof BUDGETS)[number]
export type DeployScope = 'all' | SiteId

export type PlanStatus = 'proposed' | 'existing'

export interface PlanItem {
  /** 1-based priority — the number shown on the map marker and in the list. */
  position: number
  slope: Slope
  status: PlanStatus
  /** The simulated demo node already on this slope, for `existing` items. */
  nodeId: string | null
}

export interface DeploymentPlan {
  budget: number
  scope: DeployScope
  items: PlanItem[]
  /** Slopes available in this scope. */
  candidates: number
  existing: number
  proposed: number
  /** Budget exceeds the candidate slopes: every candidate is assigned. */
  exhausted: boolean
  /** Nodes left without a candidate slope. */
  unassigned: number
}

/** Candidate slopes for a scope, in Mission ranking order. */
export function candidatesFor(scope: DeployScope, source: readonly Slope[] = allSlopes): Slope[] {
  const list = scope === 'all' ? [...source] : source.filter((s) => s.site === scope)
  return list.sort((a, b) => b.relativeRiskIndex - a.relativeRiskIndex || a.id.localeCompare(b.id))
}

export function planDeployment(budget: number, scope: DeployScope, source: readonly Slope[] = allSlopes): DeploymentPlan {
  const candidates = candidatesFor(scope, source)
  const n = Math.max(0, Math.floor(budget))
  const items: PlanItem[] = candidates.slice(0, n).map((slope, i) => ({
    position: i + 1,
    slope,
    status: slope.sensorId ? 'existing' : 'proposed',
    nodeId: slope.sensorId,
  }))
  const existing = items.filter((i) => i.status === 'existing').length
  return {
    budget: n,
    scope,
    items,
    candidates: candidates.length,
    existing,
    proposed: items.length - existing,
    exhausted: n > candidates.length,
    unassigned: Math.max(0, n - candidates.length),
  }
}

/** Where a slope sits in a scope's ranking (1-based), or null if out of scope. */
export function scopeRank(slopeId: string, scope: DeployScope, source: readonly Slope[] = allSlopes): number | null {
  const i = candidatesFor(scope, source).findIndex((s) => s.id === slopeId)
  return i < 0 ? null : i + 1
}
