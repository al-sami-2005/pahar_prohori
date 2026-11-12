/**
 * Map labels rendered as DOM markers (works offline — no glyph server needed).
 *
 * - region/admin: representative points of real geoBoundaries ADM3 units
 *   (printed by scripts/build_basemap.py), plus town positions
 * - water: points verified to lie in water against the bundled coastline
 * - locality: hill-locality names used by the demo slope units (approximate)
 */
import { unionBounds } from '@/lib/geo'
import { slopes } from './slopes'

export type PlaceKind = 'region' | 'admin' | 'locality' | 'water' | 'country'

export interface PlaceLabel {
  id: string
  text: string
  textBn: string
  lon: number
  lat: number
  kind: PlaceKind
  minZoom: number
  maxZoom: number
  /** Anchor relative to the point. */
  anchor?: 'center' | 'bottom'
  /** Locality labels belong to a site-local slope group. */
  locality?: string
}

const STATIC: PlaceLabel[] = [
  // Towns / upazilas — visible when zoomed out
  { id: 'ctg', text: 'Chattogram', textBn: 'চট্টগ্রাম', lon: 91.798, lat: 22.3319, kind: 'region', minZoom: 7, maxZoom: 11.6 },
  { id: 'cox', text: "Cox's Bazar", textBn: 'কক্সবাজার', lon: 92.0058, lat: 21.4272, kind: 'region', minZoom: 7, maxZoom: 11.6 },
  { id: 'ukhia', text: 'Ukhia', textBn: 'উখিয়া', lon: 92.1074, lat: 21.2141, kind: 'region', minZoom: 8.5, maxZoom: 12.4 },
  { id: 'teknaf', text: 'Teknaf', textBn: 'টেকনাফ', lon: 92.3058, lat: 20.8625, kind: 'region', minZoom: 8.5, maxZoom: 13 },
  { id: 'hathazari', text: 'Hathazari', textBn: 'হাটহাজারী', lon: 91.8018, lat: 22.5188, kind: 'region', minZoom: 9, maxZoom: 12 },
  { id: 'sitakunda', text: 'Sitakunda', textBn: 'সীতাকুণ্ড', lon: 91.7098, lat: 22.5332, kind: 'region', minZoom: 9, maxZoom: 12 },
  { id: 'patiya', text: 'Patiya', textBn: 'পটিয়া', lon: 91.9458, lat: 22.2892, kind: 'region', minZoom: 9, maxZoom: 12 },
  { id: 'maheshkhali', text: 'Maheshkhali', textBn: 'মহেশখালী', lon: 91.9308, lat: 21.6178, kind: 'region', minZoom: 8.5, maxZoom: 12 },
  { id: 'ramu', text: 'Ramu', textBn: 'রামু', lon: 92.1463, lat: 21.4473, kind: 'region', minZoom: 9, maxZoom: 12 },

  // Chattogram city thanas — visible at city zoom
  { id: 'pahartali', text: 'Pahartali', textBn: 'পাহাড়তলী', lon: 91.7696, lat: 22.3593, kind: 'admin', minZoom: 12, maxZoom: 16 },
  { id: 'panchlaish', text: 'Panchlaish', textBn: 'পাঁচলাইশ', lon: 91.8274, lat: 22.3757, kind: 'admin', minZoom: 12, maxZoom: 16 },
  { id: 'bayejid', text: 'Bayejid Bostami', textBn: 'বায়েজিদ বোস্তামী', lon: 91.8018, lat: 22.4189, kind: 'admin', minZoom: 12, maxZoom: 16 },
  { id: 'doublemooring', text: 'Double Mooring', textBn: 'ডবলমুরিং', lon: 91.8103, lat: 22.3316, kind: 'admin', minZoom: 12, maxZoom: 16 },
  { id: 'kotwali', text: 'Kotwali', textBn: 'কোতোয়ালী', lon: 91.8295, lat: 22.3441, kind: 'admin', minZoom: 12, maxZoom: 16 },
  { id: 'halishahar', text: 'Halishahar', textBn: 'হালিশহর', lon: 91.7791, lat: 22.3373, kind: 'admin', minZoom: 12, maxZoom: 16 },
  { id: 'chandgaon', text: 'Chandgaon', textBn: 'চান্দগাঁও', lon: 91.8651, lat: 22.3933, kind: 'admin', minZoom: 12, maxZoom: 16 },
  { id: 'bakalia', text: 'Bakalia', textBn: 'বাকলিয়া', lon: 91.8538, lat: 22.3465, kind: 'admin', minZoom: 12, maxZoom: 16 },

  // Water
  { id: 'bay-region', text: 'Bay of Bengal', textBn: 'বঙ্গোপসাগর', lon: 91.7, lat: 22.05, kind: 'water', minZoom: 7, maxZoom: 11.5 },
  { id: 'bay-city', text: 'Bay of Bengal', textBn: 'বঙ্গোপসাগর', lon: 91.7, lat: 22.372, kind: 'water', minZoom: 11.5, maxZoom: 14 },
  { id: 'karnaphuli', text: 'Karnaphuli River', textBn: 'কর্ণফুলী নদী', lon: 91.848, lat: 22.322, kind: 'water', minZoom: 12, maxZoom: 16 },

  // Country
  { id: 'mmr', text: 'Myanmar', textBn: 'মিয়ানমার', lon: 92.4, lat: 21.0, kind: 'country', minZoom: 8, maxZoom: 13 },
]

/** One label per hill locality, placed just above its slope units. */
function localityLabels(): PlaceLabel[] {
  const groups = new Map<string, typeof slopes>()
  for (const s of slopes) groups.set(s.locality, [...(groups.get(s.locality) ?? []), s])
  return [...groups.entries()].map(([locality, list]) => {
    const b = unionBounds(list.map((s) => s.bounds))
    return {
      id: `loc-${locality}`,
      text: locality,
      textBn: locality,
      lon: (b[0][0] + b[1][0]) / 2,
      lat: b[1][1],
      kind: 'locality' as const,
      minZoom: 11.9,
      maxZoom: 18,
      anchor: 'bottom' as const,
      locality,
    }
  })
}

export const PLACE_LABELS: readonly PlaceLabel[] = [...STATIC, ...localityLabels()]
