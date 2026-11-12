/**
 * M6/M7 regression guard: Replay and Deployment must not touch the locked
 * M4/M5 behaviour (alert rules, scenario timing, hero slope, Guided Demo).
 */
import { describe, expect, it } from 'vitest'
import type { AlertLevel } from '@/types/domain'
import { SCENARIO_FRAME_COUNT, SCENARIO_SCOPE, SCENARIO_TIMING, ALERT_THRESHOLDS } from '@/lib/scenarioConfig'
import { alertsAt, liveAt } from '@/data/scenario'
import { restAlerts } from '@/data/telemetry'
import { slopes } from '@/data/slopes'
import { BUDGETS, planDeployment } from '@/lib/deployment'
import { createReplayClock } from '@/lib/replayClock'
import { REPLAY_DAYS } from '@/data/replay'
import { evidenceFor, replayMapState } from '@/data/replayEvidence'
import { TOUR_STEPS } from '@/lib/tour'
import { initialMissionState, missionReducer } from '@/hooks/useMission'

const hero = SCENARIO_SCOPE.heroSlopeId
const levels = () => Array.from({ length: SCENARIO_FRAME_COUNT }, (_, f) => liveAt(hero, f)!.decision.alertLevel)
const snapshot = () => ({
  levels: levels(),
  alerts: [0, 100, 200, 300, 400, 460].map((f) => [...alertsAt(f).entries()]),
  rest: [...restAlerts.entries()],
  thresholds: JSON.stringify(ALERT_THRESHOLDS),
  slopes: JSON.stringify(slopes),
})

function exerciseReplayAndDeployment() {
  const clock = createReplayClock(REPLAY_DAYS.length)
  let s = clock.initial
  s = clock.reducer(s, { type: 'play', now: 0 })
  s = clock.reducer(s, { type: 'tick', now: 60_000 })
  for (const site of ['chattogram', 'ukhiya-teknaf'] as const) {
    evidenceFor(site)
    for (const d of REPLAY_DAYS) replayMapState(site, d)
  }
  for (const b of BUDGETS) for (const scope of ['all', 'chattogram', 'ukhiya-teknaf'] as const) planDeployment(b, scope)
  return s
}

describe('regression — the monsoon scenario is untouched', () => {
  it('the hero slope still escalates NORMAL → WATCH → WARNING → EVACUATE, in order', () => {
    const seq = levels().filter((l, i, a) => i === 0 || l !== a[i - 1])
    expect(seq).toEqual<AlertLevel[]>(['normal', 'watch', 'warning', 'evacuate'])
    expect(hero).toBe('CTG-S03')
  })

  it('the run still lasts 46 s of wall-clock time', () => {
    expect(SCENARIO_TIMING.durationMs).toBe(46_000)
    expect(SCENARIO_FRAME_COUNT).toBe(461)
  })

  it('the Guided Demo still ends on a step gated on EVACUATE', () => {
    expect(TOUR_STEPS.at(-1)?.requires).toBe('evacuate')
  })

  it('running the replay and the planner changes no scenario frame, alert or threshold', () => {
    const before = snapshot()
    exerciseReplayAndDeployment()
    expect(snapshot()).toEqual(before)
  })
})

describe('regression — route views stay isolated in the shared map state', () => {
  it('leaving Deployment clears its plan, hover and selection; Mission starts clean', () => {
    let s = missionReducer(initialMissionState, { type: 'view', view: { kind: 'deploy', ids: ['CTG-S04'], existing: [], hovered: null } })
    s = missionReducer(s, { type: 'deployHover', id: 'CTG-S04' })
    s = missionReducer(s, { type: 'select', id: 'CTG-S04' })
    expect(s.view).toMatchObject({ kind: 'deploy', hovered: 'CTG-S04' })
    s = missionReducer(s, { type: 'view', view: { kind: 'mission' } })
    expect(s.view).toEqual({ kind: 'mission' })
    expect(s.selectedSlopeId).toBeNull()
  })

  it('deployment hover is ignored outside the planner', () => {
    const s = missionReducer(initialMissionState, { type: 'deployHover', id: 'CTG-S04' })
    expect(s).toBe(initialMissionState)
  })

  it('replay carries footprint availability per area; changing the date keeps the view kind', () => {
    let s = missionReducer(initialMissionState, { type: 'view', view: { kind: 'replay', footprintSites: [] } })
    s = missionReducer(s, { type: 'select', id: 'CTG-S03' })
    s = missionReducer(s, { type: 'view', view: { kind: 'replay', footprintSites: ['ukhiya-teknaf'] } })
    expect(s.view).toEqual({ kind: 'replay', footprintSites: ['ukhiya-teknaf'] })
    // Same route: the selection survives a date change.
    expect(s.selectedSlopeId).toBe('CTG-S03')
  })
})
