import type { SiteId } from '@/types/domain'
import { unionBounds, type Bounds } from '@/lib/geo'
import { slopes } from './slopes'

export interface SiteMeta {
  id: SiteId
  bounds: Bounds
  /** Curated resting camera at 1440×900 — frames the hill band, not every outlier. */
  camera: { center: [number, number]; zoom: number }
  slopeCount: number
  instrumentedCount: number
}

const CAMERAS: Record<SiteId, SiteMeta['camera']> = {
  chattogram: { center: [91.8035, 22.3765], zoom: 12.55 },
  'ukhiya-teknaf': { center: [92.157, 21.184], zoom: 12.35 },
}

function pad(b: Bounds, fx: number, fy: number): Bounds {
  const dx = (b[1][0] - b[0][0]) * fx
  const dy = (b[1][1] - b[0][1]) * fy
  return [
    [b[0][0] - dx, b[0][1] - dy],
    [b[1][0] + dx, b[1][1] + dy],
  ]
}

function build(id: SiteId): SiteMeta {
  const list = slopes.filter((s) => s.site === id)
  return {
    id,
    bounds: pad(unionBounds(list.map((s) => s.bounds)), 0.02, 0.02),
    camera: CAMERAS[id],
    slopeCount: list.length,
    instrumentedCount: list.filter((s) => s.sensorId).length,
  }
}

export const SITES: Record<SiteId, SiteMeta> = {
  chattogram: build('chattogram'),
  'ukhiya-teknaf': build('ukhiya-teknaf'),
}

export const SITE_ORDER: readonly SiteId[] = ['chattogram', 'ukhiya-teknaf']
