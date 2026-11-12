/**
 * Map style: offline-first.
 *
 * The initial style only uses bundled data (real geography from geoBoundaries +
 * Natural Earth, plus the demo data layers), so the map always renders — even
 * with no network at the judging table. Online layers (OpenFreeMap vector tiles
 * and terrain hillshade) are added after load by `addOnlineBasemap`; if they
 * fail, nothing else is affected.
 */
import type {
  ExpressionSpecification,
  FilterSpecification,
  Map as MLMap,
  StyleSpecification,
} from 'maplibre-gl'
import { palette } from '@/lib/theme'
import { gpmGrid } from '@/data/gpm'
import { nisarChangeCollection } from '@/data/nisar'
import { ringCentroid } from '@/lib/geo'
import { slopeCollection } from '@/data/slopes'

export const HATCH_IMAGE = 'hatch-satellite'
export const HATCH_POST_IMAGE = 'hatch-post-event'

// Land sits clearly above water so the coast and river read at a glance.
const LAND = '#f4f2e9'
const FOREIGN = '#eef2ed'
const SEA = palette.sea

/** Band fill colours carry their own alpha so fill-opacity can stay a constant (and transition). */
const RISK_FILL: ExpressionSpecification = [
  'match',
  ['get', 'band'],
  'critical',
  'rgba(115, 93, 133, 0.24)',
  'high',
  'rgba(169, 150, 183, 0.24)',
  'moderate',
  'rgba(215, 206, 220, 0.34)',
  'rgba(231, 229, 223, 0.50)',
]

const RISK_LINE: ExpressionSpecification = [
  'match',
  ['get', 'band'],
  'critical',
  '#6a557d',
  'high',
  '#89759a',
  'moderate',
  '#aa9ab6',
  '#b9b8ae',
]

const ALERT_LINE: ExpressionSpecification = [
  'match',
  ['coalesce', ['feature-state', 'alert'], 'normal'],
  'watch',
  palette.watch,
  'warning',
  palette.warning,
  'evacuate',
  palette.evacuate,
  'rgba(0,0,0,0)',
]

const ALERT_STATE: ExpressionSpecification = ['coalesce', ['feature-state', 'alert'], 'normal']

/** Selected edge follows the alert state: accent at rest, then amber → orange → red. */
const SELECTED_LINE: ExpressionSpecification = [
  'match',
  ALERT_STATE,
  'watch',
  palette.watch,
  'warning',
  palette.warning,
  'evacuate',
  palette.evacuate,
  palette.accent,
]

export const NONE_FILTER: FilterSpecification = ['==', ['get', 'id'], '__none__']

const T = { duration: 320, delay: 0 }

export function basemapUrl(): string {
  return new URL('data/basemap.json', document.baseURI).href
}

const nisarPoints: GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; site: string }> = {
  type: 'FeatureCollection',
  features: nisarChangeCollection.features.map((f) => ({
    type: 'Feature',
    properties: { id: f.properties.id, site: f.properties.site },
    geometry: { type: 'Point', coordinates: ringCentroid(f.geometry.coordinates[0] ?? []) },
  })),
}

export function buildBaseStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Pahar Prohori — mission',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      basemap: { type: 'geojson', data: basemapUrl(), attribution: 'geoBoundaries (CC BY 4.0) · Natural Earth' },
      gpm: { type: 'geojson', data: gpmGrid },
      slopes: { type: 'geojson', data: slopeCollection, promoteId: 'id' },
      nisar: { type: 'geojson', data: nisarChangeCollection, promoteId: 'id' },
      // Footprint centres: lets the replay mark tiny post-event footprints legibly at site zoom.
      'nisar-points': { type: 'geojson', data: nisarPoints },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': SEA } },
      {
        id: 'base-foreign',
        type: 'fill',
        source: 'basemap',
        filter: ['==', ['get', 'layer'], 'foreign'],
        paint: { 'fill-color': FOREIGN, 'fill-antialias': true },
      },
      {
        id: 'base-land',
        type: 'fill',
        source: 'basemap',
        filter: ['==', ['get', 'layer'], 'land'],
        paint: { 'fill-color': LAND },
      },
      // ← online hillshade + OSM layers are inserted here (before 'base-admin')
      {
        id: 'base-admin',
        type: 'line',
        source: 'basemap',
        filter: ['==', ['get', 'layer'], 'admin'],
        paint: {
          'line-color': 'rgba(91, 111, 100, 0.30)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 13, 0.8, 16, 1],
          'line-opacity': 1,
          'line-opacity-transition': T,
        },
      },
      {
        id: 'base-coast',
        type: 'line',
        source: 'basemap',
        filter: ['==', ['get', 'layer'], 'land'],
        paint: {
          'line-color': 'rgba(91, 126, 133, 0.46)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 1],
        },
      },
      {
        id: 'base-road-casing',
        type: 'line',
        source: 'basemap',
        filter: ['==', ['get', 'layer'], 'road'],
        paint: {
          'line-color': 'rgba(154, 158, 145, 0.42)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 14, 2.2, 16, 3],
        },
      },
      {
        id: 'base-road',
        type: 'line',
        source: 'basemap',
        filter: ['==', ['get', 'layer'], 'road'],
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.98)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 14, 1.4, 16, 2.1],
        },
      },

      // ---- ENVIRONMENT: GPM rainfall (simulated field) ----
      {
        id: 'gpm-fill',
        type: 'fill',
        source: 'gpm',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'rain24h'],
            12,
            'rgba(83, 200, 255, 0)',
            25,
            'rgba(43, 120, 153, 0.08)',
            45,
            'rgba(43, 120, 153, 0.16)',
            90,
            'rgba(43, 120, 153, 0.26)',
            150,
            'rgba(43, 120, 153, 0.34)',
          ],
          'fill-outline-color': 'rgba(43, 120, 153, 0.08)',
          'fill-opacity': 1,
          'fill-opacity-transition': T,
        },
      },

      // ---- Selected-slope lift (soft drop shadow under the unit) ----
      {
        id: 'slope-halo',
        type: 'line',
        source: 'slopes',
        filter: NONE_FILTER,
        paint: { 'line-color': 'rgba(50, 70, 84, 0.22)', 'line-width': 8, 'line-blur': 6, 'line-translate': [0, 2] },
      },

      // ---- AI: relative risk ----
      {
        id: 'risk-fill',
        type: 'fill',
        source: 'slopes',
        paint: {
          'fill-color': RISK_FILL,
          'fill-opacity': 1,
          'fill-opacity-transition': T,
        },
      },
      {
        id: 'risk-focus-fill',
        type: 'fill',
        source: 'slopes',
        filter: NONE_FILTER,
        paint: { 'fill-color': RISK_FILL, 'fill-opacity': 1 },
      },
      {
        id: 'risk-line',
        type: 'line',
        source: 'slopes',
        paint: {
          'line-color': RISK_LINE,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,
            ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0.6],
            15,
            ['case', ['boolean', ['feature-state', 'hover'], false], 2, 1.1],
          ],
          'line-opacity': 0.7,
          'line-opacity-transition': T,
        },
      },

      // ---- SPACE: NISAR change (illustrative footprints) ----
      {
        id: 'nisar-fill',
        type: 'fill',
        source: 'nisar',
        paint: { 'fill-pattern': HATCH_IMAGE, 'fill-opacity': 0.95, 'fill-opacity-transition': T },
      },
      {
        id: 'nisar-line',
        type: 'line',
        source: 'nisar',
        paint: {
          'line-color': palette.satellite,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 15, 1.2],
          'line-opacity': 0.8,
          'line-opacity-transition': T,
        },
      },
      {
        id: 'nisar-focus-line',
        type: 'line',
        source: 'nisar',
        filter: NONE_FILTER,
        paint: { 'line-color': palette.satellite, 'line-width': 1.4, 'line-opacity': 0.95 },
      },

      // ---- Replay: the same footprint as POST-EVENT evidence (secondary treatment) ----
      // Neutral counter-hatch + dashed outline: reads as hindsight, never as a pre-event signal.
      {
        id: 'nisar-post-fill',
        type: 'fill',
        source: 'nisar',
        layout: { visibility: 'none' },
        paint: { 'fill-pattern': HATCH_POST_IMAGE, 'fill-opacity': 0, 'fill-opacity-transition': T },
      },
      {
        id: 'nisar-post-line',
        type: 'line',
        source: 'nisar',
        layout: { visibility: 'none' },
        paint: {
          'line-color': 'rgba(52, 65, 76, 0.82)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 1.6],
          'line-dasharray': [2, 1.5],
          'line-opacity': 0,
          'line-opacity-transition': T,
        },
      },
      {
        id: 'nisar-post-ring',
        type: 'circle',
        source: 'nisar-points',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 7, 14, 11, 16, 0],
          'circle-color': 'rgba(0, 0, 0, 0)',
          'circle-stroke-width': 1.25,
          'circle-stroke-color': 'rgba(52, 65, 76, 0.78)',
          'circle-stroke-opacity': 0,
          'circle-stroke-opacity-transition': T,
        },
      },

      // ---- HUMAN ACTION: alert state (feature-state driven, urgency rises step by step) ----
      // WATCH: thin amber edge only. WARNING: orange edge + faint wash. EVACUATE: red edge + restrained wash.
      {
        id: 'alert-fill',
        type: 'fill',
        source: 'slopes',
        paint: {
          'fill-color': [
            'match',
            ALERT_STATE,
            'warning',
            'rgba(180, 90, 42, 0.13)',
            'evacuate',
            'rgba(190, 67, 83, 0.20)',
            'rgba(0, 0, 0, 0)',
          ],
          'fill-opacity': 1,
          'fill-opacity-transition': T,
        },
      },
      {
        id: 'alert-line',
        type: 'line',
        source: 'slopes',
        paint: {
          'line-color': ALERT_LINE,
          'line-width': ['match', ALERT_STATE, 'watch', 1.2, 'warning', 1.8, 'evacuate', 2.2, 0],
          'line-opacity': 0.95,
          'line-opacity-transition': T,
        },
      },

      // Focus Mode keeps the focused slope's alert at full strength while the rest dims.
      {
        id: 'alert-focus-fill',
        type: 'fill',
        source: 'slopes',
        filter: NONE_FILTER,
        paint: {
          'fill-color': [
            'match',
            ALERT_STATE,
            'warning',
            'rgba(180, 90, 42, 0.13)',
            'evacuate',
            'rgba(190, 67, 83, 0.20)',
            'rgba(0, 0, 0, 0)',
          ],
        },
      },

      // ---- Selection edge (colour follows the alert state) ----
      {
        id: 'slope-selected-ring',
        type: 'line',
        source: 'slopes',
        filter: NONE_FILTER,
        paint: {
          'line-color': SELECTED_LINE,
          'line-width': ['match', ALERT_STATE, 'evacuate', 10, 'warning', 8, 7],
          'line-opacity': ['match', ALERT_STATE, 'evacuate', 0.3, 'warning', 0.22, 0.16],
          'line-blur': ['match', ALERT_STATE, 'evacuate', 4, 2],
        },
      },
      {
        id: 'slope-selected-line',
        type: 'line',
        source: 'slopes',
        filter: NONE_FILTER,
        paint: {
          'line-color': SELECTED_LINE,
          'line-width': ['match', ALERT_STATE, 'evacuate', 2.8, 'warning', 2.4, 2],
          'line-opacity': 1,
        },
      },

      // ---- Deployment planner: slopes chosen for the sensor budget ----
      {
        id: 'deploy-line',
        type: 'line',
        source: 'slopes',
        filter: NONE_FILTER,
        paint: {
          'line-color': palette.accent,
          'line-width': ['case', ['boolean', ['feature-state', 'planHover'], false], 3.2, 1.8],
          'line-opacity': 0.95,
        },
      },

      // ---- Hit target so slopes stay selectable when the risk layer is hidden ----
      {
        id: 'slope-hit',
        type: 'fill',
        source: 'slopes',
        paint: { 'fill-color': '#000000', 'fill-opacity': 0 },
      },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Opacity model — one place that knows each layer's resting opacity,  */
/* its dimmed value in Focus Mode and which toggle it belongs to.      */
/* ------------------------------------------------------------------ */

type PaintProp = 'fill-opacity' | 'line-opacity' | 'circle-stroke-opacity'
type Group = 'risk' | 'nisar' | 'nisarPost' | 'gpm' | null

interface OpacitySpec {
  prop: PaintProp
  base: number
  focus: number
  group: Group
}

export const OPACITY: Record<string, OpacitySpec> = {
  'risk-fill': { prop: 'fill-opacity', base: 1, focus: 0.2, group: 'risk' },
  'alert-fill': { prop: 'fill-opacity', base: 1, focus: 0.35, group: null },
  'alert-line': { prop: 'line-opacity', base: 0.95, focus: 0.3, group: null },
  'risk-focus-fill': { prop: 'fill-opacity', base: 1, focus: 1, group: 'risk' },
  'risk-line': { prop: 'line-opacity', base: 0.7, focus: 0.1, group: 'risk' },
  'nisar-fill': { prop: 'fill-opacity', base: 0.95, focus: 0.2, group: 'nisar' },
  'nisar-line': { prop: 'line-opacity', base: 0.8, focus: 0.15, group: 'nisar' },
  'nisar-focus-line': { prop: 'line-opacity', base: 0.95, focus: 0.95, group: 'nisar' },
  'nisar-post-fill': { prop: 'fill-opacity', base: 0.9, focus: 0.9, group: 'nisarPost' },
  'nisar-post-line': { prop: 'line-opacity', base: 0.95, focus: 0.95, group: 'nisarPost' },
  'nisar-post-ring': { prop: 'circle-stroke-opacity', base: 0.9, focus: 0.9, group: 'nisarPost' },
  'gpm-fill': { prop: 'fill-opacity', base: 1, focus: 0.35, group: 'gpm' },
  'base-admin': { prop: 'line-opacity', base: 1, focus: 0.4, group: null },
}

/**
 * Diagonal hatch for NISAR change — reads as "evidence", distinct from risk fills.
 * `post` = neutral counter-diagonal used for post-event evidence in the replay.
 */
export function makeHatchImage(post = false): { width: number; height: number; data: Uint8Array } {
  const size = 12
  const data = new Uint8Array(size * size * 4)
  const [r, g, b] = post ? [78, 91, 83] : [43, 120, 153]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const d = (post ? x - y + size : x + y) % 6
      const a = d === 0 ? 150 : d === 1 || d === 5 ? 40 : 14
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return { width: size, height: size, data }
}

/* ------------------------------------------------------------------ */
/* Online basemap                                                      */
/* ------------------------------------------------------------------ */

export type RemoteStatus = 'loading' | 'online' | 'offline'

interface OnlineCallbacks {
  onVector: (s: RemoteStatus) => void
  onTerrain: (s: RemoteStatus) => void
}

const BEFORE = 'base-admin'

export function addOnlineBasemap(map: MLMap, cb: OnlineCallbacks): () => void {
  try {
    map.addSource('terrain', {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 14,
      attribution: 'Terrain: Mapzen / AWS Open Data (SRTM and others)',
    })
    map.addLayer(
      {
        id: 'terrain-hillshade',
        type: 'hillshade',
        source: 'terrain',
        paint: {
          'hillshade-shadow-color': '#9aa79d',
          'hillshade-highlight-color': 'rgba(255, 255, 255, 0.82)',
          'hillshade-accent-color': '#c8d3c5',
          'hillshade-exaggeration': 0.28,
          'hillshade-illumination-direction': 315,
        },
      },
      BEFORE,
    )

    map.addSource('omt', {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      attribution: '© OpenMapTiles © OpenStreetMap contributors',
    })
    map.addLayer(
      {
        id: 'omt-water',
        type: 'fill',
        source: 'omt',
        'source-layer': 'water',
        paint: { 'fill-color': SEA },
      },
      BEFORE,
    )
    map.addLayer(
      {
        id: 'omt-waterway',
        type: 'line',
        source: 'omt',
        'source-layer': 'waterway',
        minzoom: 11,
        paint: { 'line-color': SEA, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 2.5] },
      },
      BEFORE,
    )
    map.addLayer(
      {
        id: 'omt-building',
        type: 'fill',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 14.5,
        paint: { 'fill-color': 'rgba(103, 117, 107, 0.10)' },
      },
      BEFORE,
    )
    map.addLayer(
      {
        id: 'omt-road-minor',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 12.5,
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track', 'path']]],
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.86)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 16, 1.4],
        },
      },
      BEFORE,
    )
    map.addLayer(
      {
        id: 'omt-road-major',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 8,
        filter: [
          'in',
          ['get', 'class'],
          ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']],
        ],
        paint: {
          'line-color': [
            'match',
            ['get', 'class'],
            ['motorway', 'trunk', 'primary'],
            'rgba(255, 255, 255, 1)',
            'rgba(255, 255, 255, 0.92)',
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 13, 1, 16, 2.4],
        },
      },
      BEFORE,
    )
    map.addLayer(
      {
        id: 'omt-road-label',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 14.5,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-letter-spacing': 0.04,
        },
        paint: {
          'text-color': 'rgba(72, 86, 77, 0.88)',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.2,
        },
      },
      'slope-halo',
    )
  } catch {
    cb.onVector('offline')
    cb.onTerrain('offline')
    return () => {}
  }

  let vector: RemoteStatus = 'loading'
  let terrain: RemoteStatus = 'loading'
  const setVector = (s: RemoteStatus) => {
    if (s === vector) return
    vector = s
    cb.onVector(s)
    // Natural Earth highways duplicate OSM roads once the live basemap is up.
    map.setLayoutProperty('base-road', 'visibility', s === 'online' ? 'none' : 'visible')
    map.setLayoutProperty('base-road-casing', 'visibility', s === 'online' ? 'none' : 'visible')
  }
  const setTerrain = (s: RemoteStatus) => {
    if (s === terrain) return
    terrain = s
    cb.onTerrain(s)
  }

  const onData = (e: object) => {
    const ev = e as { sourceId?: string; tile?: { state?: string } }
    if (ev.tile?.state !== 'loaded') return
    if (ev.sourceId === 'omt') setVector('online')
    if (ev.sourceId === 'terrain') setTerrain('online')
  }
  const onError = (e: object) => {
    const sourceId = (e as { sourceId?: string }).sourceId
    if (sourceId === 'omt' && vector === 'loading') setVector('offline')
    if (sourceId === 'terrain' && terrain === 'loading') setTerrain('offline')
  }
  map.on('sourcedata', onData)
  map.on('error', onError)

  // No successful tile within the window → treat as offline (a later success flips it back).
  const timer = window.setTimeout(() => {
    if (vector === 'loading') setVector('offline')
    if (terrain === 'loading') setTerrain('offline')
  }, 7000)

  return () => {
    window.clearTimeout(timer)
    map.off('sourcedata', onData)
    map.off('error', onError)
  }
}
