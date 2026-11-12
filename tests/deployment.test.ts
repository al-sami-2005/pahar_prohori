import { describe, expect, it } from 'vitest'
import { BUDGETS, candidatesFor, planDeployment, scopeRank, type DeployScope } from '@/lib/deployment'
import { slopes } from '@/data/slopes'

const SCOPES: DeployScope[] = ['all', 'chattogram', 'ukhiya-teknaf']

describe('deployment planner — budgets', () => {
  it('offers exactly 5 / 10 / 25 / 50 nodes', () => {
    expect([...BUDGETS]).toEqual([5, 10, 25, 50])
  })

  it.each([5, 10, 25, 50])('budget %i assigns that many candidate slopes across all sites', (b) => {
    const plan = planDeployment(b, 'all')
    expect(plan.items).toHaveLength(Math.min(b, slopes.length))
    expect(plan.existing + plan.proposed).toBe(plan.items.length)
    expect(plan.budget).toBe(b)
  })

  it('positions are 1…n with no gaps — the marker number equals the list row', () => {
    for (const b of BUDGETS) {
      for (const scope of SCOPES) {
        expect(planDeployment(b, scope).items.map((i) => i.position)).toEqual(planDeployment(b, scope).items.map((_, i) => i + 1))
      }
    }
  })
})

describe('deployment planner — the ranking rule', () => {
  it('orders by Relative Risk Index, highest first, ties by slope ID', () => {
    for (const scope of SCOPES) {
      const items = planDeployment(50, scope).items
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1]!.slope
        const b = items[i]!.slope
        expect(a.relativeRiskIndex > b.relativeRiskIndex || (a.relativeRiskIndex === b.relativeRiskIndex && a.id < b.id)).toBe(true)
      }
    }
  })

  it('uses the same ranking as Mission Control (no second risk model)', () => {
    expect(candidatesFor('all').map((s) => s.id)).toEqual(slopes.map((s) => s.id))
    expect(candidatesFor('all').every((s, i) => s.rank === i + 1)).toBe(true)
    // Same objects, not copies: one slope dataset.
    expect(candidatesFor('all')[0]).toBe(slopes[0])
  })

  it('never assigns a slope twice', () => {
    for (const b of BUDGETS) {
      for (const scope of SCOPES) {
        const ids = planDeployment(b, scope).items.map((i) => i.slope.id)
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })

  it('reducing the budget keeps the top of the list; expanding appends below it', () => {
    for (const scope of SCOPES) {
      const ids = (b: number) => planDeployment(b, scope).items.map((i) => i.slope.id)
      expect(ids(10).slice(0, 5)).toEqual(ids(5))
      expect(ids(25).slice(0, 10)).toEqual(ids(10))
      expect(ids(50).slice(0, ids(25).length)).toEqual(ids(25))
    }
  })
})

describe('deployment planner — existing simulated nodes', () => {
  it('a covered slope that already carries a demo node is "existing", never given a second node', () => {
    for (const b of BUDGETS) {
      for (const item of planDeployment(b, 'all').items) {
        expect(item.status).toBe(item.slope.sensorId ? 'existing' : 'proposed')
        expect(item.nodeId).toBe(item.slope.sensorId)
      }
    }
  })

  it('matches the worked example: 10 nodes → 10 slopes, 2 existing, 8 proposed', () => {
    const plan = planDeployment(10, 'all')
    expect(plan.items).toHaveLength(10)
    expect(plan.existing).toBe(2)
    expect(plan.proposed).toBe(8)
    expect(plan.items.filter((i) => i.status === 'existing').map((i) => i.slope.id)).toEqual(['CTG-S03', 'UKH-S10'])
  })

  it('counts every demo node once the whole landscape is covered', () => {
    const withNode = slopes.filter((s) => s.sensorId).length
    expect(planDeployment(50, 'all').existing).toBe(withNode)
  })
})

describe('deployment planner — scope and exhaustion', () => {
  it('a site scope only ranks that site', () => {
    for (const site of ['chattogram', 'ukhiya-teknaf'] as const) {
      const plan = planDeployment(25, site)
      expect(plan.items.every((i) => i.slope.site === site)).toBe(true)
      expect(plan.candidates).toBe(slopes.filter((s) => s.site === site).length)
    }
  })

  it('a budget larger than the candidates assigns all of them and reports the rest as unassigned', () => {
    const plan = planDeployment(50, 'chattogram')
    const n = slopes.filter((s) => s.site === 'chattogram').length
    expect(plan.items).toHaveLength(n)
    expect(plan.exhausted).toBe(true)
    expect(plan.unassigned).toBe(50 - n)
    expect(planDeployment(50, 'all').exhausted).toBe(false)
  })

  it('scopeRank agrees with the plan position', () => {
    for (const scope of SCOPES) {
      for (const item of planDeployment(50, scope).items) expect(scopeRank(item.slope.id, scope)).toBe(item.position)
    }
    expect(scopeRank('UKH-S01', 'chattogram')).toBeNull()
  })
})

describe('deployment planner — purity and determinism', () => {
  it('does not mutate the shared slope list', () => {
    const before = slopes.map((s) => s.id)
    for (const b of BUDGETS) for (const scope of SCOPES) planDeployment(b, scope)
    expect(slopes.map((s) => s.id)).toEqual(before)
  })

  it('the same budget and scope always give the same plan', () => {
    for (const b of BUDGETS) for (const scope of SCOPES) expect(planDeployment(b, scope)).toEqual(planDeployment(b, scope))
  })
})
