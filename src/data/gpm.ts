/**
 * GPM IMERG rainfall placeholder: a deterministic 0.1° grid (IMERG's native
 * resolution) with a SIMULATED 24 h accumulation field. Replace with IMERG
 * Early-run accumulations for the demo window.
 */
import type { FeatureCollection, Polygon } from 'geojson'
import type { DataProvenance } from '@/types/domain'

export interface GpmCellProps {
  id: string
  /** Simulated 24 h accumulation (mm). */
  rain24h: number
}

const CELL = 0.1
const WEST = 91.6
const EAST = 92.4
const SOUTH = 20.8
const NORTH = 22.6

/** Two smooth rain cores: Chattogram and the Ukhiya camps. */
function field(lon: number, lat: number): number {
  const core = (cx: number, cy: number, peak: number, sigma: number) =>
    peak * Math.exp(-(((lon - cx) ** 2 + (lat - cy) ** 2) / (2 * sigma ** 2)))
  return 14 + core(91.8, 22.38, 26, 0.18) + core(92.15, 21.18, 12, 0.16)
}

function buildGrid(): FeatureCollection<Polygon, GpmCellProps> {
  const features: FeatureCollection<Polygon, GpmCellProps>['features'] = []
  const nx = Math.round((EAST - WEST) / CELL)
  const ny = Math.round((NORTH - SOUTH) / CELL)
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const w = +(WEST + i * CELL).toFixed(2)
      const s = +(SOUTH + j * CELL).toFixed(2)
      const e = +(w + CELL).toFixed(2)
      const n = +(s + CELL).toFixed(2)
      features.push({
        type: 'Feature',
        properties: { id: `G${i}-${j}`, rain24h: Math.round(field(w + CELL / 2, s + CELL / 2) * 10) / 10 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [w, s],
              [e, s],
              [e, n],
              [w, n],
              [w, s],
            ],
          ],
        },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

export const gpmGrid = buildGrid()

/** Area estimate for a point: the value of the containing 0.1° cell. */
export function gpmRainAt(lon: number, lat: number): number {
  const w = WEST + Math.floor((lon - WEST) / CELL) * CELL
  const s = SOUTH + Math.floor((lat - SOUTH) / CELL) * CELL
  return Math.round(field(w + CELL / 2, s + CELL / 2) * 10) / 10
}

export const GPM_PROVENANCE: DataProvenance = {
  kind: 'simulated',
  source: 'Simulated field on the IMERG 0.1° grid',
  product: 'GPM_3IMERGHHE (Early run) — planned',
  note: 'IMERG Early run latency is about 4 hours',
}
