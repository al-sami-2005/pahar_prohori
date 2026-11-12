import type { Position } from 'geojson'

export type LngLat = [number, number]
/** [[west, south], [east, north]] */
export type Bounds = [LngLat, LngLat]

export function ringBounds(ring: Position[]): Bounds {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const p of ring) {
    const x = p[0] ?? 0
    const y = p[1] ?? 0
    if (x < w) w = x
    if (x > e) e = x
    if (y < s) s = y
    if (y > n) n = y
  }
  return [
    [w, s],
    [e, n],
  ]
}

export function unionBounds(list: Bounds[]): Bounds {
  return list.reduce<Bounds>(
    (acc, b) => [
      [Math.min(acc[0][0], b[0][0]), Math.min(acc[0][1], b[0][1])],
      [Math.max(acc[1][0], b[1][0]), Math.max(acc[1][1], b[1][1])],
    ],
    [
      [Infinity, Infinity],
      [-Infinity, -Infinity],
    ],
  )
}

/** Area-weighted centroid of a simple polygon ring (planar approximation — fine at slope scale). */
export function ringCentroid(ring: Position[]): LngLat {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0 = 0, y0 = 0] = ring[i] ?? []
    const [x1 = 0, y1 = 0] = ring[i + 1] ?? []
    const f = x0 * y1 - x1 * y0
    a += f
    cx += (x0 + x1) * f
    cy += (y0 + y1) * f
  }
  if (a === 0) {
    const b = ringBounds(ring)
    return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]
  }
  a *= 0.5
  return [cx / (6 * a), cy / (6 * a)]
}

/** Ground resolution in metres per CSS pixel at a latitude (MapLibre uses 512 px tiles). */
export function metersPerPixel(lat: number, zoom: number): number {
  return (78271.51696 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
}

const NICE = [1, 2, 5]

/** Largest "nice" distance (1/2/5 × 10^n m) that fits in `maxPx`. */
export function niceScale(lat: number, zoom: number, maxPx = 96): { meters: number; px: number } {
  const mpp = metersPerPixel(lat, zoom)
  const maxMeters = mpp * maxPx
  const pow = 10 ** Math.floor(Math.log10(maxMeters))
  let meters = pow
  for (const n of NICE) if (n * pow <= maxMeters) meters = n * pow
  return { meters, px: meters / mpp }
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${meters / 1000} km` : `${meters} m`
}
