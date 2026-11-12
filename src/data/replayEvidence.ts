/**
 * As-of-time evidence for the July 2026 replay — the hindsight lock.
 *
 * Every item says when it was acquired or observed and when the system could
 * have used it. The replay presents an item as known only once the replay date
 * reaches its conservative availability date (`availableAt`), and anything not
 * definitely available before the backtest cutoff can never be a prediction input.
 *
 * NISAR: acquisition ≠ availability. Processed products follow a stated
 * processing latency of roughly 36–72 h (project methodology). The catalog gives
 * day-level acquisition dates only — no acquisition time and no delivery
 * timestamp — so the window is widened to whole replay days, each judged at its
 * start (see LATENCY_DAYS). No exact delivery time is invented.
 *
 * Built only from data already in the project (no duplicates, nothing invented):
 *   - NISAR acquisition dates/tracks/products: NISAR_PAIRS (NASA CMR catalog metadata)
 *   - change footprint: the area's primary pair (the footprint drawn is illustrative)
 *   - 412.3 mm on 7 July and ≥30 deaths (11 July report): the replay facts
 * The Relative Risk ranking is NOT evidence: it is a simulated prototype placeholder
 * (BACKTEST_RANKING), labelled as such, never given "available then" semantics.
 */
import type { SiteId } from '@/types/domain'
import type { I18nKey } from '@/lib/i18n'
import type { ProvenanceLabel } from '@/lib/provenance'
import { NISAR_CATALOG_PROVENANCE, primaryPair } from './nisar'
import {
  EVENT_END,
  EVENT_START,
  GAP_START,
  PEAK_DAY,
  PEAK_RAIN_MM,
  REPLAY_DAYS,
  REPLAY_END,
  REPLAY_START,
  addDays,
  passesFor,
  type NisarPass,
} from './replay'

/** Data not definitely available before this date cannot contribute to the pre-event prediction. */
export const BACKTEST_CUTOFF = EVENT_START
export const GAP_END = '2026-08-10'
export const IMPACT_REPORT_DAY = EVENT_END

/** Stated processing latency of processed NISAR products (project methodology). */
export const NISAR_LATENCY_HOURS = { min: 36, max: 72 } as const

/**
 * The latency window at day resolution. The acquisition time within its day is
 * unknown and each replay day is judged at its start (00:00), so on day
 * acquisition + k the elapsed time lies in (24(k−1), 24k] hours:
 *   possibly available  from k = ⌈36 / 24⌉      = 2  (the 36 h floor may have passed)
 *   available by        from k = ⌊72 / 24⌋ + 1  = 4  (72 h has passed whatever the acquisition time)
 */
export const LATENCY_DAYS = {
  possible: Math.ceil(NISAR_LATENCY_HOURS.min / 24),
  definite: Math.floor(NISAR_LATENCY_HOURS.max / 24) + 1,
} as const

export type EvidenceKind = 'nisar-pass' | 'footprint' | 'rain-report' | 'impact-report'
/** input = may feed the pre-event prediction · event-record = reported during the event · validation = post-event evidence */
export type EvidenceRole = 'input' | 'event-record' | 'validation'
/**
 * not-yet    — not acquired / not published yet
 * processing — NISAR scene acquired, product certainly still inside the latency window
 * possible   — inside the latency window: the product may or may not exist yet
 * available  — conservatively available by this date
 * post-event — available, but validation-only hindsight
 */
export type KnowledgeState = 'not-yet' | 'processing' | 'possible' | 'available' | 'post-event'

export interface ReplayEvidence {
  id: string
  kind: EvidenceKind
  site: SiteId | 'all'
  /** When it was observed (ISO date). For NISAR items, the acquisition date. */
  observedAt: string
  /** End of the observed period, for reports that cover a window. */
  observedTo?: string
  /** NISAR only: catalog acquisition date (for a footprint, the pair's second scene). */
  acquiredAt?: string
  /** First replay day on which the item may already be usable. */
  availabilityEarliest: string
  /** First replay day by which the item is certainly usable. */
  availabilityLatest: string
  /** Conservative availability used by the hindsight lock (= availabilityLatest). */
  availableAt: string
  role: EvidenceRole
  provenance: readonly ProvenanceLabel[]
  /** Technical source identifier, shown verbatim. */
  source: string
  title: I18nKey
  why: I18nKey
  vars: Record<string, string | number>
}

/**
 * The replay's Relative Risk ranking. A prototype placeholder reconstructed from
 * permitted pre-cutoff inputs — not a historical model output — so it carries no
 * availability date and no knowledge state.
 */
export const BACKTEST_RANKING = {
  provenance: ['prototype-backtest', 'simulated'] as readonly ProvenanceLabel[],
  title: 'rev.ranking' as I18nKey,
  why: 'rev.ranking.why' as I18nKey,
  source: 'Pahar Prohori AI layer · placeholder values (same slopes and index as Mission)',
}

export const isPostCutoff = (iso: string) => iso >= BACKTEST_CUTOFF

/** The hindsight lock: is this item conservatively available on `day`? */
export function isAvailableAt(e: Pick<ReplayEvidence, 'availableAt'>, day: string): boolean {
  return e.availableAt <= day
}

/** Has the item happened at all by `day` (acquired / published)? Its title may show from then. */
export function isKnownToExist(e: Pick<ReplayEvidence, 'acquiredAt' | 'availableAt'>, day: string): boolean {
  return (e.acquiredAt ?? e.availableAt) <= day
}

export function knowledgeAt(e: ReplayEvidence, day: string): KnowledgeState {
  if (!isKnownToExist(e, day)) return 'not-yet'
  if (day < e.availabilityEarliest) return 'processing'
  if (day < e.availableAt) return 'possible'
  return e.role === 'validation' ? 'post-event' : 'available'
}

/** Day-level availability window for a NISAR product acquired on `acquiredAt`. */
export function nisarWindow(acquiredAt: string) {
  return {
    acquiredAt,
    availabilityEarliest: addDays(acquiredAt, LATENCY_DAYS.possible),
    availabilityLatest: addDays(acquiredAt, LATENCY_DAYS.definite),
  }
}

/** Evidence for one NISAR acquisition. Exported for tests. */
export function passEvidence(site: SiteId, p: NisarPass): ReplayEvidence {
  const w = nisarWindow(p.date)
  const post = isPostCutoff(p.date)
  // An input only if its processed product was certainly available before the cutoff.
  const input = !post && !isPostCutoff(w.availabilityLatest)
  return {
    id: `${site}:pass:${p.date}:${p.track}`,
    kind: 'nisar-pass',
    site,
    observedAt: p.date,
    ...w,
    availableAt: w.availabilityLatest,
    role: input ? 'input' : 'validation',
    provenance: post ? ['nasa', 'post-event'] : ['nasa'],
    source: NISAR_CATALOG_PROVENANCE.source,
    title: 'rev.pass',
    why: post ? 'rev.pass.post.why' : input ? 'rev.pass.pre.why' : 'rev.pass.late.why',
    vars: { track: p.track, dir: p.direction === 'ascending' ? 'asc' : 'desc', products: p.products.join(' + ') },
  }
}

function build(site: SiteId): ReplayEvidence[] {
  const items: ReplayEvidence[] = passesFor(site).map((p) => passEvidence(site, p))
  const pair = primaryPair(site)
  if (pair) {
    // The footprint needs the processed pair: it follows the second scene's processing window.
    const w = nisarWindow(pair.after)
    items.push({
      id: `${site}:footprint`,
      kind: 'footprint',
      site,
      observedAt: pair.after,
      ...w,
      availableAt: w.availabilityLatest,
      role: 'validation',
      provenance: ['illustrative', 'post-event'],
      source: `${pair.product} T${pair.track} ${pair.before} → ${pair.after} (pair: NASA catalog; footprint: illustrative)`,
      title: 'rev.footprint',
      why: 'rev.footprint.why',
      vars: { product: pair.product, track: pair.track, before: pair.before, after: pair.after },
    })
  }
  items.push(
    {
      id: 'all:rain',
      kind: 'rain-report',
      site: 'all',
      observedAt: PEAK_DAY,
      availabilityEarliest: PEAK_DAY,
      availabilityLatest: PEAK_DAY,
      availableAt: PEAK_DAY,
      role: 'event-record',
      provenance: ['reported'],
      source: 'Bangladesh Meteorological Department, as reported by the press',
      title: 'rev.rain',
      why: 'rev.rain.why',
      vars: { mm: PEAK_RAIN_MM },
    },
    {
      id: 'all:impact',
      kind: 'impact-report',
      site: 'all',
      observedAt: EVENT_START,
      observedTo: EVENT_END,
      availabilityEarliest: IMPACT_REPORT_DAY,
      availabilityLatest: IMPACT_REPORT_DAY,
      availableAt: IMPACT_REPORT_DAY,
      role: 'event-record',
      provenance: ['reported'],
      source: 'The Star (AFP), 11 July 2026',
      title: 'rev.impact',
      why: 'rev.impact.why',
      vars: {},
    },
  )
  // Chronological; on a shared date an acquisition lists before the footprint derived from it.
  const KIND_ORDER: Record<EvidenceKind, number> = { 'nisar-pass': 0, footprint: 1, 'rain-report': 2, 'impact-report': 3 }
  return items.sort(
    (a, b) =>
      (a.acquiredAt ?? a.availableAt).localeCompare(b.acquiredAt ?? b.availableAt) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.id.localeCompare(b.id),
  )
}

/**
 * Temporal integrity, checked when the module loads; a violation is a data bug:
 *   - nothing not definitely available before the cutoff may be a prediction input
 *   - nothing is usable before it was observed/acquired
 *   - a NISAR product is never usable on its acquisition date
 */
export function assertTemporalIntegrity(items: readonly ReplayEvidence[]): void {
  for (const e of items) {
    if (e.role === 'input' && isPostCutoff(e.availableAt)) {
      throw new Error(`Evidence not available before the cutoff cannot be a prediction input: ${e.id}`)
    }
    if (e.availableAt < e.observedAt || e.availabilityEarliest < e.observedAt) {
      throw new Error(`Evidence available before it was observed: ${e.id}`)
    }
    if (e.acquiredAt && (e.availabilityEarliest <= e.acquiredAt || e.availableAt <= e.acquiredAt)) {
      throw new Error(`NISAR product treated as available on its acquisition date: ${e.id}`)
    }
    if (e.availableAt !== e.availabilityLatest || e.availabilityEarliest > e.availabilityLatest) {
      throw new Error(`Inconsistent availability window: ${e.id}`)
    }
  }
}

const BY_SITE: Record<SiteId, readonly ReplayEvidence[]> = {
  chattogram: build('chattogram'),
  'ukhiya-teknaf': build('ukhiya-teknaf'),
}
assertTemporalIntegrity([...BY_SITE.chattogram, ...BY_SITE['ukhiya-teknaf']])

/** All evidence for an area (area-wide reports included), in acquisition/availability order. */
export function evidenceFor(site: SiteId): readonly ReplayEvidence[] {
  return BY_SITE[site]
}

/** Only items that were conservatively available on `day` and allowed to feed the prediction. */
export function preEventIntelligence(site: SiteId, day: string): ReplayEvidence[] {
  return evidenceFor(site).filter((e) => e.role === 'input' && isAvailableAt(e, day))
}

/* ------------------------------------------------------------------ */
/* Map state                                                           */
/* ------------------------------------------------------------------ */

export interface ReplayMapState {
  /** The prototype backtest ranking (simulated; same Relative Risk Index as Mission) — always drawn, always labelled. */
  ranking: true
  /** The illustrative change footprint — only once its processed pair is conservatively available, always as post-event evidence. */
  footprint: boolean
  /** No ground nodes existed during the event. */
  groundNodes: false
}

export function replayMapState(site: SiteId, day: string): ReplayMapState {
  const footprint = evidenceFor(site).find((e) => e.kind === 'footprint')
  return {
    ranking: true,
    footprint: !!footprint && isAvailableAt(footprint, day),
    groundNodes: false,
  }
}

/* ------------------------------------------------------------------ */
/* Timeline markers and story moments                                  */
/* ------------------------------------------------------------------ */

export type MarkerKind = 'pass-pre' | 'pass-post' | 'cutoff' | 'rain' | 'impact' | 'footprint' | 'gap'

export interface TimelineMarker {
  id: string
  kind: MarkerKind
  /** NISAR passes sit on their acquisition date; everything else on its availability date. */
  date: string
  label: I18nKey
  why: I18nKey
  provenance: readonly ProvenanceLabel[]
  source: string
  vars: Record<string, string | number>
  /** Evidence this marker stands for (knowledge state), if any. */
  evidence?: ReplayEvidence
}

export function markersFor(site: SiteId): TimelineMarker[] {
  const out: TimelineMarker[] = []
  for (const e of evidenceFor(site)) {
    const kind: MarkerKind =
      e.kind === 'nisar-pass'
        ? isPostCutoff(e.observedAt)
          ? 'pass-post'
          : 'pass-pre'
        : e.kind === 'rain-report'
          ? 'rain'
          : e.kind === 'impact-report'
            ? 'impact'
            : 'footprint'
    const date = e.kind === 'nisar-pass' ? e.observedAt : e.availableAt
    out.push({ id: e.id, kind, date, label: e.title, why: e.why, provenance: e.provenance, source: e.source, vars: e.vars, evidence: e })
  }
  out.push(
    { id: 'cutoff', kind: 'cutoff', date: BACKTEST_CUTOFF, label: 'rev.cutoff', why: 'rev.cutoff.why', provenance: ['prototype-backtest'], source: 'Prototype backtest design', vars: {} },
    { id: 'gap', kind: 'gap', date: GAP_START, label: 'rev.gap', why: 'rev.gap.why', provenance: ['nasa'], source: NISAR_CATALOG_PROVENANCE.source, vars: { from: GAP_START, to: GAP_END } },
  )
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

/** Dates worth stopping at: start, every marker, every product becoming available, end. */
export function keyDates(site: SiteId): string[] {
  const ready = evidenceFor(site)
    .filter((e) => e.kind === 'nisar-pass')
    .map((e) => e.availableAt)
  const set = new Set<string>([REPLAY_START, ...markersFor(site).map((m) => m.date), ...ready, EVENT_END, REPLAY_END])
  return [...set].filter((d) => d >= REPLAY_START && d <= REPLAY_END).sort()
}

export function nextKeyDate(site: SiteId, day: string): string {
  return keyDates(site).find((d) => d > day) ?? REPLAY_END
}

export function prevKeyDate(site: SiteId, day: string): string {
  return [...keyDates(site)].reverse().find((d) => d < day) ?? REPLAY_START
}

export type StoryKey =
  | 'story.baseline'
  | 'story.prePass'
  | 'story.passReadyPre'
  | 'story.cutoff'
  | 'story.rain'
  | 'story.impact'
  | 'story.postPass'
  | 'story.passReadyPost'
  | 'story.footprint'
  | 'story.gap'
  | 'story.event'
  | 'story.after'

type MomentKind = MarkerKind | 'ready-pre' | 'ready-post'
interface Moment {
  date: string
  kind: MomentKind
  vars: Record<string, string | number>
}

const MOMENT_DAYS = 3
const CAPTION_PRIORITY: readonly MomentKind[] = ['footprint', 'impact', 'rain', 'cutoff', 'ready-pre', 'ready-post', 'pass-post', 'gap', 'pass-pre']
const CAPTION_KEY: Record<MomentKind, StoryKey> = {
  'pass-pre': 'story.prePass',
  'ready-pre': 'story.passReadyPre',
  'pass-post': 'story.postPass',
  'ready-post': 'story.passReadyPost',
  cutoff: 'story.cutoff',
  rain: 'story.rain',
  impact: 'story.impact',
  footprint: 'story.footprint',
  gap: 'story.gap',
}

function momentsFor(site: SiteId): Moment[] {
  const moments: Moment[] = markersFor(site).map((m) => ({ date: m.date, kind: m.kind, vars: m.vars }))
  for (const e of evidenceFor(site)) {
    if (e.kind !== 'nisar-pass') continue
    moments.push({ date: e.availableAt, kind: isPostCutoff(e.observedAt) ? 'ready-post' : 'ready-pre', vars: e.vars })
  }
  return moments.sort((a, b) => a.date.localeCompare(b.date))
}

/** Short caption for the replay date — derived from the evidence, never from a timer. */
export function storyCaption(site: SiteId, day: string): { key: StoryKey; vars: Record<string, string | number> } {
  const near = momentsFor(site).filter((m) => m.date <= day && daysBetween(m.date, day) < MOMENT_DAYS)
  const latest = near.at(-1)?.date
  // On a shared date the most consequential item speaks (a footprint over its pass).
  const recent = near
    .filter((m) => m.date === latest)
    .sort((a, b) => CAPTION_PRIORITY.indexOf(a.kind) - CAPTION_PRIORITY.indexOf(b.kind))[0]
  if (recent) return { key: CAPTION_KEY[recent.kind], vars: recent.vars }
  if (day < BACKTEST_CUTOFF) return { key: 'story.baseline', vars: {} }
  if (day <= EVENT_END) return { key: 'story.event', vars: {} }
  return { key: 'story.after', vars: {} }
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

export function dayIndexOf(day: string): number {
  return Math.max(0, REPLAY_DAYS.indexOf(day))
}
