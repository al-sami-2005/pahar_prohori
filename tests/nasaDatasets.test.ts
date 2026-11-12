import { describe, expect, it } from 'vitest'
import {
  DATA_NASA_GOV_NISAR_CATALOG,
  GLOBAL_LANDSLIDE_NOWCAST_LHASA,
  GPM_3IMERGHHE_V07,
  NASADEM_HGT_V001,
  NISAR_L2_GCOV_PROVISIONAL_V1,
  NISAR_L2_GUNW_PROVISIONAL_V1,
  NISAR_L3_SME2_PROVISIONAL_V1,
  getNasademSlopeSummary,
} from '@/data/nasa'
import { NISAR_PAIRS, nisarChangeCollection } from '@/data/nisar'
import { slopeFeatureById, slopes } from '@/data/slopes'

describe('cached NASA Open Data & CMR datasets', () => {
  it('loads all NASA portal and CMR catalog snapshots', () => {
    expect(DATA_NASA_GOV_NISAR_CATALOG.datasets).toHaveLength(50)
    expect(NISAR_L2_GCOV_PROVISIONAL_V1.features).toHaveLength(97)
    expect(NISAR_L2_GUNW_PROVISIONAL_V1.features).toHaveLength(80)
    expect(NISAR_L3_SME2_PROVISIONAL_V1.features).toHaveLength(96)
    expect(GPM_3IMERGHHE_V07.granules).toHaveLength(100)
    expect(NASADEM_HGT_V001.cmrTiles).toHaveLength(5)
    expect(NASADEM_HGT_V001.slopeElevationSummary).toHaveLength(50)
    expect(GLOBAL_LANDSLIDE_NOWCAST_LHASA.portalDatasets.length).toBeGreaterThanOrEqual(2)
  })

  it('resolves every NISAR acquisition pair to real ASF CMR granules', () => {
    expect(NISAR_PAIRS).toHaveLength(5)
    for (const pair of NISAR_PAIRS) {
      expect(pair.beforeGranuleId).toMatch(/^G\d+-ASF$/)
      expect(pair.afterGranuleId).toMatch(/^G\d+-ASF$/)
      expect(pair.beforeGranuleTitle).toMatch(new RegExp(`^NISAR_L2_PR_${pair.product}_`))
      expect(pair.afterGranuleTitle).toMatch(new RegExp(`^NISAR_L2_PR_${pair.product}_`))
      expect(pair.browseUrl).toMatch(/^https:\/\/nisar\.asf\.earthdatacloud\.nasa\.gov\/BROWSE\//)
      expect(pair.granuleSizeMb).toBeGreaterThan(0)
    }
  })

  it('links illustrative change footprints to real GCOV CMR granule metadata', () => {
    expect(nisarChangeCollection.features).toHaveLength(8)
    for (const feature of nisarChangeCollection.features) {
      expect(feature.properties.collectionId).toBe('C2854338529-ASF')
      expect(feature.properties.beforeGranuleId).toMatch(/^G\d+-ASF$/)
      expect(feature.properties.afterGranuleId).toMatch(/^G\d+-ASF$/)
    }
  })

  it('hydrates all 50 slopes with real Terrarium 30 m DEM elevation and slope metrics', () => {
    expect(slopes).toHaveLength(50)
    for (const slope of slopes) {
      const dem = getNasademSlopeSummary(slope.id)
      const featureProps = slopeFeatureById.get(slope.id)?.properties
      expect(dem).toBeDefined()
      expect(featureProps?.elevationM).toBe(dem?.maxElevM)
      expect(slope.slopeDegrees).toBe(dem?.maxSlopeDeg)
      expect(slope.slopeDegrees).toBeGreaterThan(0)
    }
  })
})
