/**
 * Real road routing with OSRM on OpenStreetMap data (free, no API key).
 *   walking → routing.openstreetmap.de/routed-foot   (FOSSGIS)
 *   driving → routing.openstreetmap.de/routed-car, falls back to router.project-osrm.org
 * If both fail (offline), returns a straight-line route so the screen still works.
 */
import type { Lang } from '../i18n';
import type { RoadRoute, RouteStep } from '../types';
import { haversineKm } from '../utils';

export type Profile = 'foot' | 'car';

const ENDPOINTS: Record<Profile, string[]> = {
  foot: ['https://routing.openstreetmap.de/routed-foot/route/v1/driving'],
  car: ['https://routing.openstreetmap.de/routed-car/route/v1/driving', 'https://router.project-osrm.org/route/v1/driving'],
};

interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}
interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
  legs: { steps: OsrmStep[] }[];
}

const cache = new Map<string, RoadRoute>();

function withCum(coords: { latitude: number; longitude: number }[]) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    cum.push(cum[i - 1] + haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) * 1000);
  }
  return cum;
}

export function straightLine(from: { lat: number; lon: number }, to: { lat: number; lon: number }, profile: Profile, lang: Lang): RoadRoute {
  const coords = [{ latitude: from.lat, longitude: from.lon }, { latitude: to.lat, longitude: to.lon }];
  const d = haversineKm(from.lat, from.lon, to.lat, to.lon) * 1000 * 1.3;
  const speed = profile === 'foot' ? 3.5 / 3.6 : 25 / 3.6; // m/s on hill paths
  return {
    coords,
    cum: [0, d],
    distance: d,
    duration: d / speed,
    real: false,
    steps: [
      { instruction: lang === 'bn' ? 'আশ্রয়কেন্দ্রের দিকে যান' : 'Head towards the shelter', name: '', type: 'depart', distance: d, duration: d / speed, location: [from.lon, from.lat], cumDist: 0 },
      { instruction: lang === 'bn' ? 'আশ্রয়কেন্দ্রে পৌঁছান' : 'Arrive at the shelter', name: '', type: 'arrive', distance: 0, duration: 0, location: [to.lon, to.lat], cumDist: d },
    ],
  };
}

export async function fetchRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  profile: Profile,
  lang: Lang,
): Promise<RoadRoute> {
  const key = `${profile}:${from.lat.toFixed(4)},${from.lon.toFixed(4)}>${to.lat.toFixed(4)},${to.lon.toFixed(4)}:${lang}`;
  const hit = cache.get(key);
  if (hit) return hit;

  for (const base of ENDPOINTS[profile]) {
    const url = `${base}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { code: string; routes?: OsrmRoute[] };
      const r = json.routes?.[0];
      if (json.code !== 'Ok' || !r) continue;
      const coords = r.geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
      // the road may not reach the exact shelter point — add the last metres as a straight segment
      const last = coords[coords.length - 1];
      if (haversineKm(last.latitude, last.longitude, to.lat, to.lon) > 0.02) coords.push({ latitude: to.lat, longitude: to.lon });
      const cum = withCum(coords);
      let acc = 0;
      const steps: RouteStep[] = r.legs.flatMap((l) => l.steps).map((st) => {
        const s: RouteStep = {
          instruction: describe(st, lang),
          name: st.name,
          type: st.maneuver.type,
          modifier: st.maneuver.modifier,
          distance: st.distance,
          duration: st.duration,
          location: st.maneuver.location,
          cumDist: acc,
        };
        acc += st.distance;
        return s;
      });
      const route: RoadRoute = { coords, cum, distance: r.distance, duration: r.duration, steps, real: true };
      cache.set(key, route);
      return route;
    } catch {
      /* try next endpoint */
    }
  }
  return straightLine(from, to, profile, lang);
}

/* ---------------- human-readable instructions ---------------- */

const MOD_EN: Record<string, string> = {
  left: 'Turn left', right: 'Turn right', 'slight left': 'Keep slightly left', 'slight right': 'Keep slightly right',
  'sharp left': 'Turn sharp left', 'sharp right': 'Turn sharp right', straight: 'Continue straight', uturn: 'Make a U-turn',
};
const MOD_BN: Record<string, string> = {
  left: 'বামে ঘুরুন', right: 'ডানে ঘুরুন', 'slight left': 'হালকা বামে থাকুন', 'slight right': 'হালকা ডানে থাকুন',
  'sharp left': 'তীক্ষ্ণ বামে ঘুরুন', 'sharp right': 'তীক্ষ্ণ ডানে ঘুরুন', straight: 'সোজা চলুন', uturn: 'ইউ-টার্ন নিন',
};

function describe(st: OsrmStep, lang: Lang): string {
  const { type, modifier } = st.maneuver;
  const name = st.name;
  const bn = lang === 'bn';
  if (type === 'depart') return bn ? `${name ? `${name} ধরে ` : ''}যাত্রা শুরু করুন` : `Start${name ? ` on ${name}` : ''}`;
  if (type === 'arrive') return bn ? 'আশ্রয়কেন্দ্রে পৌঁছেছেন' : 'Arrive at the shelter';
  if (type === 'roundabout' || type === 'rotary') return bn ? 'গোলচত্বরে ঢুকুন' : 'Enter the roundabout';
  const verb = (bn ? MOD_BN : MOD_EN)[modifier ?? 'straight'] ?? (bn ? 'চলুন' : 'Continue');
  if (!name) return verb;
  return bn ? `${verb} — ${name}` : `${verb} onto ${name}`;
}

/** MaterialCommunityIcons name for a maneuver arrow. */
export function maneuverIcon(type: string, modifier?: string): string {
  if (type === 'arrive') return 'flag-checkered';
  if (type === 'depart') return 'navigation-variant';
  if (type === 'roundabout' || type === 'rotary') return 'rotate-right';
  switch (modifier) {
    case 'left': return 'arrow-left-top';
    case 'right': return 'arrow-right-top';
    case 'slight left': return 'arrow-top-left';
    case 'slight right': return 'arrow-top-right';
    case 'sharp left': return 'arrow-left-bottom';
    case 'sharp right': return 'arrow-right-bottom';
    case 'uturn': return 'arrow-u-left-top';
    default: return 'arrow-up';
  }
}

/** Where is the user along the route? Returns progress (m) and distance off the line (m). */
export function progressOnRoute(route: RoadRoute, lat: number, lon: number) {
  let best = Infinity;
  let bestI = 0;
  for (let i = 0; i < route.coords.length; i++) {
    const c = route.coords[i];
    const d = haversineKm(lat, lon, c.latitude, c.longitude) * 1000;
    if (d < best) { best = d; bestI = i; }
  }
  const progress = route.cum[bestI] ?? 0;
  const nextIdx = route.steps.findIndex((s) => s.cumDist > progress + 5);
  const next = nextIdx >= 0 ? route.steps[nextIdx] : route.steps[route.steps.length - 1];
  return {
    progress,
    offRoute: best,
    remaining: Math.max(0, route.distance - progress),
    next,
    nextIdx,
    toNext: Math.max(0, (next?.cumDist ?? route.distance) - progress),
  };
}

export function formatMeters(m: number, lang: Lang) {
  const bn = lang === 'bn';
  if (m < 1000) {
    const v = Math.round(m / 10) * 10;
    return { value: String(v), unit: bn ? 'মি' : 'm' };
  }
  return { value: (m / 1000).toFixed(m < 10000 ? 1 : 0), unit: bn ? 'কিমি' : 'km' };
}
