import { useCallback, useEffect, useRef, useState } from 'react';
import { api, demo } from '../api';
import { useApp } from '../store';
import type { CommunityReport, HillDetail, Reading, Shelter, Source } from '../types';
import { nearestShelters } from '../utils';

const DETAIL_POLL_MS = 12_000;

/** Loads hill page data and keeps sensors/charts moving while auto-refresh is on. */
export function useHillDetail(hillId: number) {
  const { settings, hills, shelters, source: appSource } = useApp();
  const [detail, setDetail] = useState<HillDetail | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [near, setNear] = useState<Shelter[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<Source>('live');
  const first = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const base = settings.apiUrl;
    try {
      const [d, h, s] = await Promise.all([
        api.hill(base, hillId), api.history(base, hillId), api.hillShelters(base, hillId),
      ]);
      setDetail(d); setHistory(h); setNear(s); setSource('live');
      api.reports(base, hillId).then(setReports).catch(() => setReports([]));
    } catch {
      const fromList = hills.find((x) => x.hill_id === hillId);
      const demoDetail = demo.details[String(hillId)];
      const d: HillDetail | null = fromList
        ? { ...fromList, nisar: demoDetail?.nisar ?? fromList.nisar ?? null }
        : demoDetail ?? null;
      setDetail(d);
      setHistory(demo.history?.[String(hillId)] ?? []);
      setNear(d ? nearestShelters(d.lat, d.lon, shelters, 3) : []);
      setSource(appSource === 'live' ? 'cache' : appSource);
    } finally {
      if (!quiet) setLoading(false);
      first.current = false;
    }
  }, [hillId, settings.apiUrl, hills, shelters, appSource]);

  useEffect(() => {
    first.current = true;
    load(false);
  }, [hillId, settings.apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quiet poll so tiles/charts keep advancing without a loading flash
  useEffect(() => {
    if (!settings.autoRefresh) return;
    const id = setInterval(() => load(true), DETAIL_POLL_MS);
    return () => clearInterval(id);
  }, [settings.autoRefresh, load]);

  // Map/list refresh often lands first — merge fresher latest_reading/status into open detail
  useEffect(() => {
    const fromList = hills.find((x) => x.hill_id === hillId);
    if (!fromList) return;
    setDetail((prev) => {
      if (!prev) return prev;
      const newer = fromList.latest_reading?.ts && prev.latest_reading?.ts
        && fromList.latest_reading.ts > prev.latest_reading.ts;
      if (!newer && fromList.status.updated_at === prev.status.updated_at) return prev;
      return {
        ...prev,
        ...fromList,
        nisar: fromList.nisar ?? prev.nisar,
        status: fromList.status,
        latest_reading: fromList.latest_reading ?? prev.latest_reading,
      };
    });
  }, [hills, hillId]);

  return { detail, history, near, reports, loading, source, reload: () => load(false) };
}
