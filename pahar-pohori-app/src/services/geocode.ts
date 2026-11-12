/**
 * Place search for the map search bar: OpenStreetMap Nominatim (free, no key),
 * biased to the Chittagong Hill Tracts and limited to Bangladesh.
 * Usage policy: max ~1 request/second → we debounce in the UI and cache results.
 */
import type { GeoResult } from '../types';

const cache = new Map<string, GeoResult[]>();
const VIEWBOX = '91.6,23.8,92.8,21.2'; // lon/lat box around CHT (bias, not a hard limit)

export async function searchPlaces(q: string, lang: 'en' | 'bn'): Promise<GeoResult[]> {
  const key = `${lang}:${q.trim().toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=bd&addressdetails=0` +
    `&viewbox=${VIEWBOX}&accept-language=${lang === 'bn' ? 'bn,en' : 'en'}&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const j = (await res.json()) as { place_id: number; name?: string; display_name: string; lat: string; lon: string; type: string }[];
    const out = j.map((p) => ({
      id: String(p.place_id),
      name: p.name || p.display_name.split(',')[0],
      address: p.display_name.split(',').slice(1, 4).join(',').trim(),
      lat: Number(p.lat),
      lon: Number(p.lon),
      type: p.type,
    }));
    cache.set(key, out);
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
