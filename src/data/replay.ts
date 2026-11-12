/**
 * July 2026 event replay — timeline scaffold.
 *
 * Only facts from the concept brief are used:
 *   - event window 5–11 July 2026
 *   - 412.3 mm in 24 h on 7 July (BMD, as reported)
 *   - NISAR pass dates per area (NASA CMR catalog, team query)
 *   - NISAR data gap 27 Jul – 10 Aug 2026
 * Daily GPM IMERG totals and backtest metrics are NOT available yet and are
 * never estimated here.
 */
import type { SiteId } from '@/types/domain'
import { NISAR_PAIRS, primaryPair } from './nisar'

export const REPLAY_START = '2026-06-22'
export const REPLAY_END = '2026-07-31'
export const EVENT_START = '2026-07-05'
export const EVENT_END = '2026-07-11'
export const GAP_START = '2026-07-27'
export const PEAK_DAY = '2026-07-07'
export const PEAK_RAIN_MM = 412.3

const DAY_MS = 86_400_000
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)

export function addDays(iso: string, n: number): string {
  return new Date(toMs(iso) + n * DAY_MS).toISOString().slice(0, 10)
}

export const REPLAY_DAYS: readonly string[] = (() => {
  const days: string[] = []
  for (let d = REPLAY_START; d <= REPLAY_END; d = addDays(d, 1)) days.push(d)
  return days
})()

export interface NisarPass {
  date: string
  track: string
  direction: 'ascending' | 'descending'
  products: string[]
}

/** Distinct NISAR pass dates for an area, derived from the catalog pairs. */
export function passesFor(site: SiteId): NisarPass[] {
  const map = new Map<string, NisarPass>()
  for (const p of NISAR_PAIRS.filter((x) => x.site === site)) {
    for (const date of [p.before, p.after]) {
      const key = `${date}-${p.track}`
      const existing = map.get(key)
      if (existing) {
        if (!existing.products.includes(p.product)) existing.products.push(p.product)
      } else {
        map.set(key, { date, track: p.track, direction: p.direction, products: [p.product] })
      }
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export type ReplayPhase = 'before' | 'during' | 'after'

export function phaseOf(date: string): ReplayPhase {
  if (date < EVENT_START) return 'before'
  if (date <= EVENT_END) return 'during'
  return 'after'
}

/** Latest pass acquired on or before the replay date. */
export function latestPass(site: SiteId, date: string): NisarPass | undefined {
  return passesFor(site)
    .filter((p) => p.date <= date)
    .at(-1)
}

/**
 * Change footprints come from the area's primary before/after pair; they can
 * only be shown once that pair's post-event pass exists.
 */
export function postEventEvidence(site: SiteId, date: string): boolean {
  const pair = primaryPair(site)
  return !!pair && date >= pair.after
}
