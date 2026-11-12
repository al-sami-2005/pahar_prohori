import { useCallback, useEffect, useState } from 'react';
import { api, demo } from '../api';
import { useApp } from '../store';
import type { CommunityReport, HillDetail, Reading, Shelter, Source } from '../types';
import { nearestShelters } from '../utils';

/** Loads everything the hill page needs, falling back to cached list data or the demo snapshot. */
export function useHillDetail(hillId: number) {
  const { settings, hills, shelters, source: appSource } = useApp();
  const [detail, setDetail] = useState<HillDetail | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [near, setNear] = useState<Shelter[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<Source>('live');

  const load = useCallback(async () => {
    setLoading(true);
    const base = settings.apiUrl;
    try {
      const [d, h, s] = await Promise.all([
        api.hill(base, hillId), api.history(base, hillId), api.hillShelters(base, hillId),
      ]);
      setDetail(d); setHistory(h); setNear(s); setSource('live');
      api.reports(base, hillId).then(setReports).catch(() => setReports([]));
    } catch {
      // offline: build from what we have
      const fromList = hills.find((x) => x.hill_id === hillId);
      const demoDetail = demo.details[String(hillId)];
      const d: HillDetail | null = fromList
        ? { ...fromList, nisar: demoDetail?.nisar ?? null }
        : demoDetail ?? null;
      setDetail(d);
      setHistory(demo.history[String(hillId)] ?? []);
      setNear(d ? nearestShelters(d.lat, d.lon, shelters, 3) : []);
      setSource(appSource === 'live' ? 'cache' : appSource);
    } finally {
      setLoading(false);
    }
  }, [hillId, settings.apiUrl, hills, shelters, appSource]);

  useEffect(() => { load(); }, [hillId, settings.apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return { detail, history, near, reports, loading, source, reload: load };
}
