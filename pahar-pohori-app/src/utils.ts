import { Linking, Platform } from 'react-native';
import { digits, type Lang, type StringKey } from './i18n';
import type { Hill, Level, Shelter } from './types';

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function timeAgo(lang: Lang, t: (k: StringKey) => string, iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return t('justNow');
  if (diff < 60) return `${digits(lang, Math.round(diff))} ${t('minAgo')}`;
  if (diff < 60 * 24) return `${digits(lang, Math.round(diff / 60))} ${t('hAgo')}`;
  return `${digits(lang, Math.round(diff / 1440))} ${t('dAgo')}`;
}

export function formatDateTime(lang: Lang, iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export const pct = (p: number | null | undefined) => (p == null ? '—' : `${Math.round(p * 100)}%`);

export const LEVEL_ORDER: Record<Level, number> = { DANGER: 0, WATCH: 1, SAFE: 2, NO_DATA: 3 };

export function sortByRisk(hills: Hill[]): Hill[] {
  return [...hills].sort(
    (a, b) =>
      LEVEL_ORDER[a.status.level] - LEVEL_ORDER[b.status.level] ||
      (b.status.probability ?? 0) - (a.status.probability ?? 0),
  );
}

/** Guidance shown on the hill page: headline, body and action list per level. */
export function guidanceFor(level: Level): { headline: StringKey; body: StringKey; items: StringKey[] } {
  switch (level) {
    case 'DANGER':
      return { headline: 'dangerHeadline', body: 'dangerBody', items: ['danger1', 'danger2', 'danger3', 'danger4'] };
    case 'WATCH':
      return { headline: 'watchHeadline', body: 'watchBody', items: ['watch1', 'watch2', 'watch3', 'watch4'] };
    case 'SAFE':
      return { headline: 'safeHeadline', body: 'safeBody', items: ['safe1', 'safe2', 'safe3'] };
    default:
      return { headline: 'nodataHeadline', body: 'nodataBody', items: ['safe1', 'safe2'] };
  }
}

/** Risk zone radius on the map (metres) grows with probability. */
export const riskRadius = (p: number | null) => 1200 + (p ?? 0) * 3800;

export function nearestShelters(lat: number, lon: number, shelters: Shelter[], n = 3): Shelter[] {
  return shelters
    .map((s) => ({ ...s, distance_km: Math.round(haversineKm(lat, lon, s.lat, s.lon) * 100) / 100 }))
    .sort((a, b) => a.distance_km! - b.distance_km!)
    .slice(0, n);
}

/** Rough travel estimate for hill terrain: path ≈ straight line × 1.3. */
export function routeEstimate(km: number) {
  const pathKm = km * 1.3;
  return {
    pathKm,
    walkMin: Math.round((pathKm / 3.5) * 60),
    driveMin: Math.max(1, Math.round((pathKm / 25) * 60)),
  };
}

export function formatDuration(lang: Lang, min: number): string {
  if (min < 60) return `${digits(lang, min)} ${lang === 'bn' ? 'মিনিট' : 'min'}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return lang === 'bn' ? `${digits(lang, h)} ঘ ${digits(lang, m)} মি` : `${h} hr ${String(m).padStart(2, '0')} min`;
}

export function arrivalTime(min: number): string {
  const d = new Date(Date.now() + min * 60000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function openDirections(
  dest: { lat: number; lon: number },
  origin?: { lat: number; lon: number } | null,
  mode: 'walking' | 'driving' = 'walking',
) {
  const o = origin ? `&origin=${origin.lat},${origin.lon}` : '';
  const url = `https://www.google.com/maps/dir/?api=1${o}&destination=${dest.lat},${dest.lon}&travelmode=${mode}`;
  return Linking.openURL(url);
}

export function callNumber(num: string) {
  return Linking.openURL(`tel:${num}`).catch(() => undefined);
}

export function mapsLink(lat: number, lon: number) {
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lon.toFixed(5)}`;
}

export const isWeb = Platform.OS === 'web';
