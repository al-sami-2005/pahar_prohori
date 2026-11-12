/**
 * Typed accessors and lookup helpers for cached NASA Open Data Portal and NASA
 * CMR catalog snapshots fetched by `scripts/fetch_nasa_datasets.py`.
 */
import type { FeatureCollection, Polygon } from 'geojson'
import type { SiteId } from '@/types/domain'
import rawPortalCatalog from './DATA_NASA_GOV_NISAR_CATALOG.json'
import rawGcov from './NISAR_L2_GCOV_PROVISIONAL_V1.json'
import rawGunw from './NISAR_L2_GUNW_PROVISIONAL_V1.json'
import rawSme2 from './NISAR_L3_SME2_PROVISIONAL_V1.json'
import rawGpm from './GPM_3IMERGHHE_V07.json'
import rawNasadem from './NASADEM_HGT_V001.json'
import rawLhasa from './GLOBAL_LANDSLIDE_NOWCAST_LHASA.json'

export interface NasaCatalogResource {
  format: string | null
  url: string
}

export interface NasaPortalDatasetEntry {
  name: string
  title: string
  cmrCollectionId?: string | null
  metadataModified?: string | null
  portalUrl: string
  resources: NasaCatalogResource[]
}

export interface NasaPortalCatalog {
  meta: {
    source: string
    queryUrl: string
    apiUrl: string
    totalMatches: number
    fetchedAt: string
    provenance: 'nasa'
  }
  datasets: NasaPortalDatasetEntry[]
}

export interface NisarSwathGranuleProps {
  conceptId: string
  granuleTitle: string
  collectionId: string
  collectionShortName: string
  product: 'GCOV' | 'GUNW' | 'SME2'
  cycle: number | null
  track: string | null
  direction: 'ascending' | 'descending' | null
  timeStart: string | null
  timeEnd: string | null
  acqDate: string
  updated: string | null
  granuleSizeMb: number | null
  sitesCovered: SiteId[]
  dataUrl: string | null
  browseUrl: string | null
  earthdataSearchUrl: string
}

export interface NisarSwathCollection extends FeatureCollection<Polygon, NisarSwathGranuleProps> {
  meta: {
    source: string
    collectionId: string
    collectionShortName: string
    boundingBox: string
    temporal: string
    featureCount: number
    fetchedAt: string
    provenance: 'nasa'
  }
}

export interface GpmCatalogGranule {
  conceptId: string
  title: string
  timeStart: string | null
  timeEnd: string | null
  granuleSizeMb: number | null
  dataUrl: string | null
}

export interface GpmCatalogDataset {
  meta: {
    source: string
    shortName: string
    version: string
    temporal: string
    note: string
    granuleCountSampled: number
    fetchedAt: string
    provenance: 'nasa'
  }
  granules: GpmCatalogGranule[]
}

export interface NasademCmrTile {
  conceptId: string
  tileId: string
  granuleSizeMb: number | null
  dataUrl: string | null
}

export interface NasademSlopeSummary {
  slopeId: string
  locality: string
  meanElevM: number | null
  maxElevM: number | null
  maxSlopeDeg: number | null
}

export interface NasademHgtDataset {
  meta: {
    source: string
    collectionId: string
    tileCount: number
    slopeSamples: number
    fetchedAt: string
    provenance: 'nasa'
  }
  cmrTiles: NasademCmrTile[]
  slopeElevationSummary: NasademSlopeSummary[]
}

export interface LhasaSampleGranule {
  conceptId: string
  title: string
  timeStart: string | null
  dataUrl: string | null
}

export interface LhasaCatalogDataset {
  meta: {
    source: string
    note: string
    fetchedAt: string
    provenance: 'nasa'
  }
  portalDatasets: NasaPortalDatasetEntry[]
  cmrSampleGranules: LhasaSampleGranule[]
}

export const DATA_NASA_GOV_NISAR_CATALOG = rawPortalCatalog as unknown as NasaPortalCatalog
export const NISAR_L2_GCOV_PROVISIONAL_V1 = rawGcov as unknown as NisarSwathCollection
export const NISAR_L2_GUNW_PROVISIONAL_V1 = rawGunw as unknown as NisarSwathCollection
export const NISAR_L3_SME2_PROVISIONAL_V1 = rawSme2 as unknown as NisarSwathCollection
export const GPM_3IMERGHHE_V07 = rawGpm as unknown as GpmCatalogDataset
export const NASADEM_HGT_V001 = rawNasadem as unknown as NasademHgtDataset
export const GLOBAL_LANDSLIDE_NOWCAST_LHASA = rawLhasa as unknown as LhasaCatalogDataset

const SINGLE_PASS_COLLECTIONS = {
  GCOV: NISAR_L2_GCOV_PROVISIONAL_V1,
  SME2: NISAR_L3_SME2_PROVISIONAL_V1,
} as const

/** Look up a single-pass NISAR L2/L3 swath granule covering `site` on `acqDate`. */
export function findNisarSwathGranule(
  product: keyof typeof SINGLE_PASS_COLLECTIONS,
  site: SiteId,
  track: string,
  acqDate: string,
): NisarSwathGranuleProps | undefined {
  return SINGLE_PASS_COLLECTIONS[product].features.find((f) => {
    const p = f.properties
    return p.track === track && p.acqDate === acqDate && p.sitesCovered.includes(site)
  })?.properties
}

/** Look up a two-pass NISAR L2 GUNW interferogram granule for `beforeDate -> afterDate`. */
export function findNisarGunwGranule(
  site: SiteId,
  track: string,
  beforeDate: string,
  afterDate: string,
): NisarSwathGranuleProps | undefined {
  return NISAR_L2_GUNW_PROVISIONAL_V1.features.find((f) => {
    const p = f.properties
    return (
      p.track === track &&
      p.sitesCovered.includes(site) &&
      p.timeStart?.slice(0, 10) === beforeDate &&
      p.timeEnd?.slice(0, 10) === afterDate
    )
  })?.properties
}

/** Look up open Terrarium DEM elevation/slope summary cached alongside NASADEM_HGT.001. */
export function getNasademSlopeSummary(slopeId: string): NasademSlopeSummary | undefined {
  return NASADEM_HGT_V001.slopeElevationSummary.find((entry) => entry.slopeId === slopeId)
}
