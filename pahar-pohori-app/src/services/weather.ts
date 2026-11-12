/**
 * Rain forecast from Open-Meteo (free, no key): hourly precipitation, probability and
 * modelled top-soil moisture for the past 2 days + next 3 days at each hill.
 * Cached per hill on the device so it still shows when offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { RainForecast } from '../types';

const TTL_MS = 30 * 60 * 1000;
const mem = new Map<string, RainForecast>();

export type RainLevel = 'none' | 'light' | 'moderate' | 'heavy' | 'veryHeavy';

/**
 * BMD-style bands, but ignore drizzle (&lt; 5 mm / 24h) so the UI does not
 * scream "rain expected" when Open-Meteo only has a few tip-buckets.
 */
export function rainLevel(mm24: number): RainLevel {
  if (mm24 >= 89) return 'veryHeavy';
  if (mm24 >= 44) return 'heavy';
  if (mm24 >= 11) return 'moderate';
  if (mm24 >= 5) return 'light';
  return 'none';
}

export async function fetchRain(lat: number, lon: number): Promise<RainForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&hourly=precipitation,precipitation_probability,soil_moisture_0_to_1cm' +
    '&past_days=2&forecast_days=3&timezone=Asia%2FDhaka';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  const res = await fetch(url, { signal: ctrl.signal });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = (await res.json()) as {
    utc_offset_seconds: number;
    hourly: { time: string[]; precipitation: (number | null)[]; precipitation_probability: (number | null)[]; soil_moisture_0_to_1cm: (number | null)[] };
  };
  const h = j.hourly;
  // Open-Meteo stamps are Asia/Dhaka wall-clock (no Z) — match that, not a hacked UTC ISO.
  const nowLocal = new Date()
    .toLocaleString('sv-SE', { timeZone: 'Asia/Dhaka' })
    .slice(0, 13)
    .replace(' ', 'T');
  let nowIndex = h.time.findIndex((t) => t.slice(0, 13) === nowLocal);
  if (nowIndex < 0) {
    nowIndex = h.time.findIndex((t) => t.slice(0, 13) >= nowLocal);
    if (nowIndex < 0) nowIndex = Math.min(48, Math.max(0, h.time.length - 1));
  }
  const rain = h.precipitation.map((v) => v ?? 0);
  const sum = (a: number, b: number) => rain.slice(Math.max(0, a), Math.max(0, b)).reduce((x, y) => x + y, 0);
  const future = rain.slice(nowIndex, nowIndex + 72);
  const peak = Math.max(0, ...future);
  const peakIdx = future.indexOf(peak);
  return {
    times: h.time,
    rain,
    prob: h.precipitation_probability.map((v) => v ?? 0),
    soil: h.soil_moisture_0_to_1cm.map((v) => v ?? 0),
    nowIndex,
    next24: sum(nowIndex, nowIndex + 24),
    next72: sum(nowIndex, nowIndex + 72),
    past48: sum(nowIndex - 48, nowIndex),
    peakHour: peak,
    // only call out a "heaviest hour" when it is meaningful rain
    peakTime: peak >= 0.5 ? h.time[nowIndex + peakIdx] : null,
    fetchedAt: new Date().toISOString(),
  };
}

export function useRainForecast(lat?: number, lon?: number) {
  const [data, setData] = useState<RainForecast | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'cached' | 'error'>('loading');

  useEffect(() => {
    if (lat == null || lon == null) return;
    let alive = true;
      const key = `pp:rain:v2:${lat.toFixed(3)},${lon.toFixed(3)}`;
    (async () => {
      const m = mem.get(key);
      if (m && Date.now() - new Date(m.fetchedAt).getTime() < TTL_MS) { setData(m); setStatus('ok'); return; }
      try {
        const f = await fetchRain(lat, lon);
        mem.set(key, f);
        AsyncStorage.setItem(key, JSON.stringify(f)).catch(() => undefined);
        if (alive) { setData(f); setStatus('ok'); }
      } catch {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw && alive) { setData(JSON.parse(raw)); setStatus('cached'); return; }
        } catch { /* ignore */ }
        if (alive) setStatus('error');
      }
    })();
    return () => { alive = false; };
  }, [lat, lon]);

  return { data, status };
}
