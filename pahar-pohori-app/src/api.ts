import Constants from 'expo-constants';
import { Platform } from 'react-native';
import demoJson from './data/demoSnapshot.json';
import type {
  Alert, CommunityReport, Contact, DemoSnapshot, Hill, HillDetail, ModelInfo,
  LiveEvent, Reading, ReportInput, RiskTimeline, Shelter, Summary, SystemStatus,
} from './types';

export const demo = demoJson as unknown as DemoSnapshot;

/**
 * Pick a sensible backend URL:
 *  1. EXPO_PUBLIC_API_URL if set
 *  2. On a phone running Expo Go: the same LAN IP as the Metro dev server, port 8000
 *  3. Android emulator: 10.0.2.2 ; everything else: localhost
 * Users can override it in More → Settings.
 */
export function defaultApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname, port, origin } = window.location;
      if (port === '8081' || port === '19006') return `${protocol}//${hostname}:8000`;
      return origin;
    }
    return 'http://localhost:8000';
  }
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:8000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

async function request<T>(base: string, path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  hills: (b: string) => request<Hill[]>(b, '/api/hills'),
  hill: (b: string, id: number) => request<HillDetail>(b, `/api/hills/${id}`),
  history: (b: string, id: number, limit = 1100) =>
    request<Reading[]>(b, `/api/hills/${id}/history?limit=${limit}`),
  hillShelters: (b: string, id: number) => request<Shelter[]>(b, `/api/hills/${id}/shelters?limit=3`),
  alerts: (b: string) => request<Alert[]>(b, '/api/alerts'),
  summary: (b: string) => request<Summary>(b, '/api/summary'),
  shelters: (b: string) => request<Shelter[]>(b, '/api/shelters'),
  contacts: (b: string) => request<Contact[]>(b, '/api/emergency-contacts'),
  modelInfo: (b: string) => request<ModelInfo>(b, '/api/model-info'),
  reports: (b: string, hillId?: number) =>
    request<CommunityReport[]>(b, `/api/reports${hillId != null ? `?hill_id=${hillId}` : ''}`),
  submitReport: (b: string, body: ReportInput) =>
    request<{ id: number; created_at: string }>(b, '/api/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  timeline: (b: string) => request<RiskTimeline>(b, '/api/risk-timeline?step_hours=1', undefined, 15000),
  systemStatus: (b: string) => request<SystemStatus>(b, '/api/system-status', undefined, 6000),
  liveFeed: (b: string, after: number) => request<LiveEvent[]>(b, `/api/live-feed?after=${after}&limit=60`, undefined, 6000),
  ping: (b: string) => request<{ status: string }>(b, '/api/health', undefined, 4000),
};

/** Build a summary locally when only the hill list is available (cache/demo). */
export function summarize(hills: Hill[], alerts: Alert[]): Summary {
  const counts = { SAFE: 0, WATCH: 0, DANGER: 0, NO_DATA: 0 };
  let updated: string | null = null;
  for (const h of hills) {
    counts[h.status.level] += 1;
    if (h.status.updated_at && (!updated || h.status.updated_at > updated)) updated = h.status.updated_at;
  }
  const dayAgo = Date.now() - 864e5;
  return {
    total_hills: hills.length,
    counts,
    alerts_24h: alerts.filter((a) => new Date(a.created_at).getTime() > dayAgo).length,
    updated_at: updated,
  };
}
