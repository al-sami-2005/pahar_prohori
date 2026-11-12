/**
 * NISAR data for the two monitored areas.
 *
 * - Acquisition pairs: REAL catalog metadata from the concept brief
 *   (NASA CMR, NISAR_L2_*_PROVISIONAL_V1, queried by the team 24 Sep 2026).
 * - Change footprints: ILLUSTRATIVE placeholders until GCOV change detection
 *   has been run. They must never be presented as detected scars.
 */
import type { FeatureCollection, Polygon } from 'geojson'
import type { DataProvenance, SiteId } from '@/types/domain'
import raw from './geo/nisar-change.json'

export type NisarProduct = 'GCOV' | 'GUNW'

export interface NisarPair {
  site: SiteId
  track: string
  direction: 'ascending' | 'descending'
  /** ISO date of the pre-event pass */
  before: string
  /** ISO date of the post-event pass */
  after: string
  product: NisarProduct
}

export const NISAR_PAIRS: readonly NisarPair[] = [
  { site: 'chattogram', track: '163', direction: 'descending', before: '2026-06-25', after: '2026-07-19', product: 'GCOV' },
  { site: 'chattogram', track: '069', direction: 'ascending', before: '2026-06-30', after: '2026-07-24', product: 'GCOV' },
  { site: 'chattogram', track: '069', direction: 'ascending', before: '2026-06-30', after: '2026-07-12', product: 'GUNW' },
  { site: 'ukhiya-teknaf', track: '069', direction: 'ascending', before: '2026-06-30', after: '2026-07-12', product: 'GCOV' },
  { site: 'ukhiya-teknaf', track: '163', direction: 'descending', before: '2026-07-07', after: '2026-07-19', product: 'GCOV' },
]

export const NISAR_CATALOG_PROVENANCE: DataProvenance = {
  kind: 'nasa',
  source: 'NASA CMR catalog (team query, 24 Sep 2026)',
  product: 'NISAR_L2_GCOV_PROVISIONAL_V1 · NISAR_L2_GUNW_PROVISIONAL_V1',
  note: 'Provisional products',
}

export interface NisarChangeProps {
  id: string
  slopeId: string
  site: SiteId
  kind: 'scar' | 'surface-change'
  track: string
  direction: 'ascending' | 'descending'
  before: string
  after: string
  product: NisarProduct
}

export const nisarChangeCollection = raw as unknown as FeatureCollection<Polygon, NisarChangeProps>

const bySlope = new Map(nisarChangeCollection.features.map((f) => [f.properties.slopeId, f.properties]))

export function getChangeForSlope(slopeId: string | null | undefined): NisarChangeProps | undefined {
  return slopeId ? bySlope.get(slopeId) : undefined
}

export const NISAR_CHANGE_PROVENANCE: DataProvenance = {
  kind: 'simulated',
  source: 'Illustrative change footprints',
  note: 'Placeholder until GCOV before/after change detection is run',
}

/** The pair the change layer is built from for a site — the ribbon and layer panel must agree with it. */
export function primaryPair(site: SiteId): NisarPair | undefined {
  const ref = nisarChangeCollection.features.find((f) => f.properties.site === site)?.properties
  if (!ref) return undefined
  return NISAR_PAIRS.find(
    (p) => p.site === site && p.product === ref.product && p.track === ref.track && p.before === ref.before && p.after === ref.after,
  )
}
