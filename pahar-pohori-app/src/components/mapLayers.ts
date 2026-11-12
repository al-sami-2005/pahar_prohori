/** Shared logic for what each data layer draws on a hill (used by native + web maps). */
import { statusColor } from '../theme';
import type { DataLayer, Hill, Level } from '../types';
import { riskRadius } from '../utils';

export interface HillOverride { p: number; level: Level }

export interface HillVisual {
  color: string;
  radius: number;      // metres
  fillAlpha: number;   // 0..1
  label: string;       // text in the marker pill
}

const hex = (a: number) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
export const withAlpha = (color: string, a: number) => `${color}${hex(a)}`;

export function hillVisual(h: Hill, layer: DataLayer, ov?: HillOverride): HillVisual {
  if (layer === 'creep') {
    const v = h.nisar?.los_velocity_mm_month ?? 0;
    const color = v >= 300 ? '#E5484D' : v >= 150 ? '#F2A33A' : '#7C5CFF';
    return { color, radius: 900 + Math.min(v, 400) * 11, fillAlpha: 0.28, label: `${Math.round(v)} mm/mo` };
  }
  if (layer === 'soil') {
    const sm = h.latest_reading?.soil_moisture ?? 0;
    const wet = Math.max(0, Math.min(1, (sm - 0.15) / 0.3));
    return { color: '#2F80ED', radius: 2600, fillAlpha: 0.12 + wet * 0.5, label: sm.toFixed(2) };
  }
  const level = ov?.level ?? h.status.level;
  const p = ov?.p ?? h.status.probability;
  return {
    color: statusColor[level],
    radius: riskRadius(p),
    fillAlpha: 0.22,
    label: p == null ? '—' : `${Math.round(p * 100)}%`,
  };
}

/** Pin colour always follows the (possibly replayed) risk level. */
export const pinColor = (h: Hill, ov?: HillOverride) => statusColor[ov?.level ?? h.status.level];
