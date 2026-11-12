import { describe, expect, it } from 'vitest'
import type { SiteId } from '@/types/domain'
import type { Translate } from '@/lib/i18n'
import { REPLAY_DAYS, addDays } from '@/data/replay'
import {
  BACKTEST_CUTOFF,
  BACKTEST_RANKING,
  LATENCY_DAYS,
  NISAR_LATENCY_HOURS,
  assertTemporalIntegrity,
  evidenceFor,
  isAvailableAt,
  keyDates,
  knowledgeAt,
  markersFor,
  nextKeyDate,
  passEvidence,
  preEventIntelligence,
  prevKeyDate,
  replayMapState,
  storyCaption,
  type ReplayEvidence,
} from '@/data/replayEvidence'
import { evidenceTitle } from '@/components/replay/evidenceLabel'

const SITES: SiteId[] = ['chattogram', 'ukhiya-teknaf']
const all = SITES.flatMap((s) => evidenceFor(s))
const nisar = all.filter((e) => e.acquiredAt)
const passes = all.filter((e) => e.kind === 'nisar-pass')
const footprint = (site: SiteId) => evidenceFor(site).find((e) => e.kind === 'footprint')!
const pass = (site: SiteId, date: string) => evidenceFor(site).find((e) => e.kind === 'nisar-pass' && e.acquiredAt === date)!
/** Stub translator: key + vars, so tests can see which title was chosen. */
const t: Translate = (key, vars) => (vars && Object.keys(vars).length ? `${key}|${JSON.stringify(vars)}` : key)

describe('NISAR latency — acquisition is not availability', () => {
  it('uses the stated 36–72 h window, widened to whole replay days (possible from +2, available from +4)', () => {
    expect(NISAR_LATENCY_HOURS).toEqual({ min: 36, max: 72 })
    expect(LATENCY_DAYS).toEqual({ possible: 2, definite: 4 })
  })

  it('every NISAR item keeps acquiredAt, availabilityEarliest and availabilityLatest apart', () => {
    for (const e of nisar) {
      expect(e.availabilityEarliest, e.id).toBe(addDays(e.acquiredAt!, 2))
      expect(e.availabilityLatest, e.id).toBe(addDays(e.acquiredAt!, 4))
      expect(e.availableAt, e.id).toBe(e.availabilityLatest)
      expect(e.availableAt > e.acquiredAt!, e.id).toBe(true)
    }
  })

  it('a product is never available on its acquisition date', () => {
    for (const e of passes) {
      expect(isAvailableAt(e, e.acquiredAt!), e.id).toBe(false)
      expect(knowledgeAt(e, e.acquiredAt!), e.id).toBe('processing')
    }
  })

  it('inside the latency window it is processing, then only possibly available — never counted as known', () => {
    for (const e of passes) {
      const acq = e.acquiredAt!
      expect(knowledgeAt(e, addDays(acq, 1)), e.id).toBe('processing')
      expect(knowledgeAt(e, addDays(acq, 2)), e.id).toBe('possible')
      expect(knowledgeAt(e, addDays(acq, 3)), e.id).toBe('possible')
      for (const k of [0, 1, 2, 3]) expect(isAvailableAt(e, addDays(acq, k)), `${e.id} +${k}`).toBe(false)
    }
  })

  it('becomes available only by the conservative rule (acquisition + 4 days)', () => {
    for (const e of passes) {
      const day = addDays(e.acquiredAt!, 4)
      expect(isAvailableAt(e, day), e.id).toBe(true)
      expect(knowledgeAt(e, day), e.id).toBe(e.role === 'validation' ? 'post-event' : 'available')
    }
    // Worked example: the 30 Jun Chattogram acquisition.
    const p = pass('chattogram', '2026-06-30')
    expect(['2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'].map((d) => knowledgeAt(p, d))).toEqual([
      'processing',
      'processing',
      'possible',
      'possible',
      'available',
    ])
  })

  it('a pre-event input is used only once processed: 30 Jun is not in the prediction on 1 Jul, but is by the cutoff', () => {
    const ids = (day: string) => preEventIntelligence('chattogram', day).map((e) => e.acquiredAt)
    expect(ids('2026-07-01')).toEqual(['2026-06-25'])
    expect(ids('2026-06-28')).toEqual([])
    expect(ids(BACKTEST_CUTOFF)).toEqual(['2026-06-25', '2026-06-30'])
  })

  it('an acquisition shortly before the cutoff that cannot be processed in time is excluded from the prediction', () => {
    const late = passEvidence('chattogram', { date: '2026-07-03', track: '069', direction: 'ascending', products: ['GCOV'] })
    expect(late.availableAt).toBe('2026-07-07')
    expect(late.role).toBe('validation')
    expect(late.why).toBe('rev.pass.late.why')
    expect(late.provenance).not.toContain('post-event')
    const inTime = passEvidence('chattogram', { date: '2026-06-30', track: '069', direction: 'ascending', products: ['GCOV'] })
    expect(inTime.role).toBe('input')
  })
})

describe('illustrative change footprint — follows the processed pair, not the acquisition date', () => {
  it('Chattogram: pair completes 24 Jul, footprint hidden through 27 Jul, available 28 Jul', () => {
    const fp = footprint('chattogram')
    expect(fp.acquiredAt).toBe('2026-07-24')
    expect(fp.availableAt).toBe('2026-07-28')
    for (const d of ['2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27']) expect(replayMapState('chattogram', d).footprint, d).toBe(false)
    expect(replayMapState('chattogram', '2026-07-28').footprint).toBe(true)
    expect(knowledgeAt(fp, '2026-07-24')).toBe('processing')
    expect(knowledgeAt(fp, '2026-07-26')).toBe('possible')
    expect(knowledgeAt(fp, '2026-07-28')).toBe('post-event')
  })

  it('Ukhiya–Teknaf: pair completes 12 Jul, footprint available 16 Jul', () => {
    expect(replayMapState('ukhiya-teknaf', '2026-07-12').footprint).toBe(false)
    expect(replayMapState('ukhiya-teknaf', '2026-07-15').footprint).toBe(false)
    expect(replayMapState('ukhiya-teknaf', '2026-07-16').footprint).toBe(true)
  })

  it('stays ILLUSTRATIVE and POST-EVENT, never a prediction input', () => {
    for (const site of SITES) {
      const fp = footprint(site)
      expect(fp.provenance).toEqual(['illustrative', 'post-event'])
      expect(fp.role).toBe('validation')
      for (const day of REPLAY_DAYS) expect(knowledgeAt(fp, day)).not.toBe('available')
    }
  })

  it('the map never shows a footprint before its conservative availability, and never shows ground nodes', () => {
    for (const site of SITES) {
      const fp = footprint(site)
      for (const day of REPLAY_DAYS) {
        const m = replayMapState(site, day)
        expect(m.footprint, `${site} ${day}`).toBe(day >= fp.availableAt)
        expect(m.groundNodes).toBe(false)
      }
    }
  })
})

describe('prototype backtest ranking — simulated, not a historical output', () => {
  it('is always labelled PROTOTYPE BACKTEST and SIMULATED', () => {
    expect(BACKTEST_RANKING.provenance).toEqual(['prototype-backtest', 'simulated'])
    expect(BACKTEST_RANKING.title).toBe('rev.ranking')
    expect(BACKTEST_RANKING.why).toBe('rev.ranking.why')
  })

  it('is not temporal evidence: no availability date, no knowledge state, never "available then"', () => {
    for (const e of all) expect(e.kind).not.toBe('ranking' as never)
    for (const site of SITES) {
      for (const day of REPLAY_DAYS) expect(preEventIntelligence(site, day).every((e) => e.kind === 'nisar-pass')).toBe(true)
    }
  })

  it('the risk polygons stay on the replay map on every day', () => {
    for (const site of SITES) for (const day of REPLAY_DAYS) expect(replayMapState(site, day).ranking).toBe(true)
  })
})

describe('hindsight lock — nothing leaks backwards', () => {
  it('nothing is usable before it was observed; nothing is known before it happened', () => {
    for (const e of all) {
      expect(e.availableAt >= e.observedAt, e.id).toBe(true)
      expect(knowledgeAt(e, addDays(e.acquiredAt ?? e.availableAt, -1)), e.id).toBe('not-yet')
      expect(knowledgeAt(e, '2026-06-01'), e.id).toBe('not-yet')
    }
  })

  it('on every day, every item counted as known was conservatively available that day', () => {
    for (const site of SITES) {
      for (const day of REPLAY_DAYS) {
        for (const e of evidenceFor(site)) {
          const k = knowledgeAt(e, day)
          if (k === 'available' || k === 'post-event') expect(e.availableAt <= day, `${e.id} ${day}`).toBe(true)
          else expect(isAvailableAt(e, day), `${e.id} ${day}`).toBe(false)
        }
      }
    }
  })

  it('titles stay generic until an item exists (no future content, e.g. the death toll)', () => {
    const impact = all.find((e) => e.kind === 'impact-report')!
    expect(evidenceTitle(t, impact, '2026-07-10')).toBe('rev.kind.impact-report')
    expect(evidenceTitle(t, impact, '2026-07-11')).toBe('rev.impact')
    const p = pass('chattogram', '2026-07-12')
    expect(evidenceTitle(t, p, '2026-07-11')).toBe('rev.kind.nisar-pass')
    // From acquisition the scene is named — its product is still "processing".
    expect(evidenceTitle(t, p, '2026-07-12')).toContain('rev.pass')
    expect(knowledgeAt(p, '2026-07-12')).toBe('processing')
  })
})

describe('backtest cutoff — post-event evidence is never pre-event', () => {
  it('the cutoff is 5 July 2026', () => {
    expect(BACKTEST_CUTOFF).toBe('2026-07-05')
  })

  it('every prediction input was conservatively available before the cutoff', () => {
    for (const e of all.filter((x) => x.role === 'input')) expect(e.availableAt < BACKTEST_CUTOFF, e.id).toBe(true)
  })

  it('every NISAR acquisition on or after the cutoff is validation-only and labelled post-event', () => {
    for (const e of passes.filter((x) => x.observedAt >= BACKTEST_CUTOFF)) {
      expect(e.role, e.id).toBe('validation')
      expect(e.provenance, e.id).toContain('post-event')
    }
  })

  it('validation evidence is never presented as available for the prediction', () => {
    for (const e of all.filter((x) => x.role === 'validation')) {
      for (const day of REPLAY_DAYS) expect(knowledgeAt(e, day)).not.toBe('available')
    }
  })

  it('the pre-event input set freezes at the cutoff (later days add nothing)', () => {
    for (const site of SITES) {
      const atCutoff = preEventIntelligence(site, BACKTEST_CUTOFF).map((e) => e.id)
      expect(preEventIntelligence(site, '2026-07-31').map((e) => e.id)).toEqual(atCutoff)
    }
  })

  it('the integrity check rejects late inputs, early availability and same-day NISAR availability', () => {
    const base = pass('chattogram', '2026-06-25')
    const late: ReplayEvidence = { ...base, id: 'bad', availableAt: '2026-07-06', availabilityLatest: '2026-07-06' }
    expect(() => assertTemporalIntegrity([late])).toThrow(/cannot be a prediction input/)
    const early: ReplayEvidence = { ...base, id: 'early', role: 'event-record', acquiredAt: undefined, observedAt: '2026-07-08', availabilityEarliest: '2026-07-07', availabilityLatest: '2026-07-07', availableAt: '2026-07-07' }
    expect(() => assertTemporalIntegrity([early])).toThrow(/before it was observed/)
    const sameDay: ReplayEvidence = { ...base, id: 'same', availabilityEarliest: '2026-06-25', availabilityLatest: '2026-06-25', availableAt: '2026-06-25' }
    expect(() => assertTemporalIntegrity([sameDay])).toThrow(/acquisition date/)
  })
})

describe('evidence content stays honest', () => {
  it('reports are labelled reported (not NASA) and are available on their publication date', () => {
    for (const e of all.filter((x) => x.kind === 'rain-report' || x.kind === 'impact-report')) {
      expect(e.provenance).toEqual(['reported'])
      expect(e.acquiredAt).toBeUndefined()
      expect(e.availabilityEarliest).toBe(e.availableAt)
    }
  })

  it('no evidence item claims a landslide location or a validation result', () => {
    expect([...new Set(all.map((e) => e.kind))].sort()).toEqual(['footprint', 'impact-report', 'nisar-pass', 'rain-report'])
  })
})

describe('site filtering', () => {
  it('each area only carries its own acquisitions and footprint (area-wide reports shared)', () => {
    for (const site of SITES) {
      for (const e of evidenceFor(site)) expect([site, 'all']).toContain(e.site)
    }
    expect(evidenceFor('chattogram').filter((e) => e.kind === 'nisar-pass').map((e) => e.acquiredAt)).toEqual([
      '2026-06-25',
      '2026-06-30',
      '2026-07-12',
      '2026-07-19',
      '2026-07-24',
    ])
    expect(evidenceFor('ukhiya-teknaf').filter((e) => e.kind === 'nisar-pass').map((e) => e.acquiredAt)).toEqual([
      '2026-06-30',
      '2026-07-07',
      '2026-07-12',
      '2026-07-19',
    ])
  })
})

describe('timeline markers and key dates', () => {
  it('acquisitions sit on their acquisition date, the footprint on its availability date; cutoff and gap included', () => {
    for (const site of SITES) {
      const m = markersFor(site)
      expect(m.map((x) => x.date)).toEqual([...m.map((x) => x.date)].sort())
      expect(m.some((x) => x.kind === 'cutoff' && x.date === BACKTEST_CUTOFF)).toBe(true)
      expect(m.some((x) => x.kind === 'gap' && x.date === '2026-07-27')).toBe(true)
      for (const x of m.filter((y) => y.kind === 'pass-pre' || y.kind === 'pass-post')) expect(x.date).toBe(x.evidence?.acquiredAt)
      expect(m.find((x) => x.kind === 'footprint')?.date).toBe(footprint(site).availableAt)
    }
  })

  it('previous / next key date also stop where a product becomes available', () => {
    const keys = keyDates('chattogram')
    expect(keys[0]).toBe('2026-06-22')
    expect(keys.at(-1)).toBe('2026-07-31')
    expect(keys).toContain('2026-07-04') // 30 Jun product becomes available
    expect(nextKeyDate('chattogram', '2026-06-22')).toBe('2026-06-25')
    expect(nextKeyDate('chattogram', '2026-06-30')).toBe('2026-07-04')
    expect(nextKeyDate('chattogram', '2026-07-04')).toBe(BACKTEST_CUTOFF)
    expect(prevKeyDate('chattogram', '2026-07-24')).toBe('2026-07-23')
    expect(prevKeyDate('chattogram', '2026-06-22')).toBe('2026-06-22')
  })

  it('story captions come from the date alone', () => {
    expect(storyCaption('chattogram', '2026-06-22').key).toBe('story.baseline')
    expect(storyCaption('chattogram', '2026-06-30').key).toBe('story.prePass')
    expect(storyCaption('chattogram', '2026-07-04').key).toBe('story.passReadyPre')
    expect(storyCaption('chattogram', BACKTEST_CUTOFF).key).toBe('story.cutoff')
    expect(storyCaption('chattogram', '2026-07-07').key).toBe('story.rain')
    expect(storyCaption('chattogram', '2026-07-24').key).toBe('story.postPass')
    expect(storyCaption('chattogram', '2026-07-27').key).toBe('story.gap')
    expect(storyCaption('chattogram', '2026-07-28').key).toBe('story.footprint')
    expect(storyCaption('ukhiya-teknaf', '2026-07-16').key).toBe('story.footprint')
    expect(storyCaption('chattogram', '2026-07-31').key).toBe('story.after')
  })
})

describe('determinism', () => {
  it('evidence, markers, states and map states are identical on every call', () => {
    for (const site of SITES) {
      expect(evidenceFor(site)).toEqual(evidenceFor(site))
      expect(markersFor(site)).toEqual(markersFor(site))
      const snap = () => REPLAY_DAYS.map((d) => [replayMapState(site, d), evidenceFor(site).map((e) => knowledgeAt(e, d))])
      expect(snap()).toEqual(snap())
    }
  })
})
