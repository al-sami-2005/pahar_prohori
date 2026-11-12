import type { Translate } from '@/lib/i18n'
import { formatDate } from '@/lib/formatters'
import { isKnownToExist, knowledgeAt, type KnowledgeState, type ReplayEvidence, type TimelineMarker } from '@/data/replayEvidence'

/**
 * Hindsight lock for text: before an item exists (acquired / published) only its
 * kind is shown ("Impact report"), never its content ("at least 30 deaths").
 * A NISAR acquisition is named from its acquisition date; its processed product
 * is only usable later (see knowledgeAt).
 */
export function evidenceTitle(t: Translate, e: ReplayEvidence, day: string): string {
  return isKnownToExist(e, day) ? t(e.title, e.vars) : t(`rev.kind.${e.kind}`)
}

/** "Acquired 30 Jun · possibly available from 2 Jul · conservatively available from 4 Jul" (NISAR only). */
export function evidenceWindow(t: Translate, e: ReplayEvidence): string | null {
  if (!e.acquiredAt) return null
  return t(e.kind === 'footprint' ? 'rev.window.pair' : 'rev.window', {
    acq: dayShort(e.acquiredAt),
    from: dayShort(e.availabilityEarliest),
    by: dayShort(e.availableAt),
  })
}

/** Date from which an item's details may be shown. */
export const knownFrom = (e: ReplayEvidence) => e.acquiredAt ?? e.availableAt

export function markerState(m: TimelineMarker, day: string): KnowledgeState {
  if (m.evidence) return knowledgeAt(m.evidence, day)
  return m.date <= day ? 'available' : 'not-yet'
}

export function markerTitle(t: Translate, m: TimelineMarker, day: string): string {
  if (m.evidence) return evidenceTitle(t, m.evidence, day)
  if (m.kind === 'cutoff') return t('rev.cutoff')
  return m.date <= day ? t(m.label, m.vars) : t('rev.kind.gap')
}

/** "7 Jul 2026" */
export const dayLong = (iso: string) => formatDate(`${iso}T00:00:00+06:00`)
/** "7 Jul" */
export const dayShort = (iso: string) => dayLong(iso).replace(/ \d{4}$/, '')
