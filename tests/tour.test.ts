import { describe, expect, it } from 'vitest'
import type { AlertLevel } from '@/types/domain'
import {
  EVIDENCE_STEP,
  HUMAN_ACTION_STEP,
  TOUR_STEPS,
  canEnterStep,
  shouldAutoAdvance,
  shouldStepBack,
  tourControls,
} from '@/lib/tour'
import { SCENARIO_FRAME_COUNT, SCENARIO_SCOPE } from '@/lib/scenarioConfig'
import { liveAt } from '@/data/scenario'

const BEFORE: AlertLevel[] = ['normal', 'watch', 'warning']

describe('Guided Demo — cannot finish before EVACUATE', () => {
  it('has an evidence step followed by a final Human-action step gated on EVACUATE', () => {
    expect(TOUR_STEPS).toHaveLength(7)
    expect(EVIDENCE_STEP).toBe(5)
    expect(HUMAN_ACTION_STEP).toBe(TOUR_STEPS.length - 1)
    expect(TOUR_STEPS[EVIDENCE_STEP]!.scenario).toBe('start')
    expect(TOUR_STEPS[HUMAN_ACTION_STEP]!.requires).toBe('evacuate')
  })

  it('the evidence step never offers Finish or Next', () => {
    for (const lvl of [...BEFORE, 'evacuate'] as AlertLevel[]) {
      const c = tourControls(EVIDENCE_STEP, lvl, 'running')
      expect(c.finish).toBe(false)
      expect(c.next).toBe(false)
    }
  })

  it('Human action cannot be entered, and cannot finish, before EVACUATE', () => {
    for (const lvl of BEFORE) {
      expect(canEnterStep(HUMAN_ACTION_STEP, lvl)).toBe(false)
      expect(tourControls(HUMAN_ACTION_STEP, lvl, 'running').finish).toBe(false)
      expect(shouldAutoAdvance(EVIDENCE_STEP, lvl)).toBe(false)
      expect(shouldStepBack(HUMAN_ACTION_STEP, lvl)).toBe(true)
    }
  })

  it('at EVACUATE the demo advances and Finish appears', () => {
    expect(shouldAutoAdvance(EVIDENCE_STEP, 'evacuate')).toBe(true)
    const c = tourControls(HUMAN_ACTION_STEP, 'evacuate', 'running')
    expect(c.finish).toBe(true)
    expect(c.restart).toBe(false)
    expect(tourControls(HUMAN_ACTION_STEP, 'evacuate', 'complete').restart).toBe(true)
  })

  it('no earlier step ever offers Finish', () => {
    for (let step = 0; step < HUMAN_ACTION_STEP; step++) {
      for (const lvl of [...BEFORE, 'evacuate'] as AlertLevel[]) expect(tourControls(step, lvl, 'running').finish).toBe(false)
    }
  })

  it('driven by the real scenario frames, the demo advances exactly at the EVACUATE frame', () => {
    let advancedAt = -1
    for (let f = 0; f < SCENARIO_FRAME_COUNT; f++) {
      const lvl = liveAt(SCENARIO_SCOPE.heroSlopeId, f)!.decision.alertLevel
      expect(tourControls(EVIDENCE_STEP, lvl, 'running').finish).toBe(false)
      if (advancedAt < 0 && shouldAutoAdvance(EVIDENCE_STEP, lvl)) advancedAt = f
    }
    expect(advancedAt).toBe(395)
  })
})
