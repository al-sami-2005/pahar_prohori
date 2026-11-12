import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { ThemeCtx, resolvePalette, useSystemScheme, type Palette, type ThemeMode } from './theme';
import { api, defaultApiUrl, demo, summarize } from './api';
import { translate, type Lang, type StringKey } from './i18n';
import type {
  Alert, CommunityReport, Contact, DataLayer, Hill, MapType, ReportInput, RiskTimeline, SavedPlace, Shelter, Source, Summary,
} from './types';

const SETTINGS_KEY = 'pp:settings:v1';
const CACHE_KEY = 'pp:cache:v1';
const QUEUE_KEY = 'pp:reportQueue:v1';
const SEEN_ALERT_KEY = 'pp:lastAlertId:v1';
const POLL_MS = 15_000; // keep map status / latest sensors feeling live

export interface Settings {
  lang: Lang;
  apiUrl: string;
  notifications: boolean;
  autoRefresh: boolean;
  theme: ThemeMode;
  mapType: MapType;
  layer: DataLayer;
  pitch3d: boolean;
  voice: boolean;
  showShelters: boolean;
  showReports: boolean;
  saved: SavedPlace[];
  recents: string[];
}

interface Data {
  hills: Hill[];
  alerts: Alert[];
  summary: Summary;
  shelters: Shelter[];
  contacts: Contact[];
  reports: CommunityReport[];
}

export interface Coords { lat: number; lon: number }

interface Ctx extends Data {
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  t: (k: StringKey) => string;
  lang: Lang;
  source: Source;
  lastSync: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  location: Coords | null;
  locationDenied: boolean;
  requestLocation: () => Promise<Coords | null>;
  submitReport: (r: ReportInput) => Promise<'sent' | 'queued'>;
  pendingReports: number;
  ready: boolean;
  palette: Palette;
  loadTimeline: () => Promise<RiskTimeline | null>;
  isSaved: (key: string) => boolean;
  toggleSaved: (p: SavedPlace) => void;
  addRecent: (q: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);

const demoData: Data = {
  hills: demo.hills,
  alerts: demo.alerts,
  summary: demo.summary,
  shelters: demo.shelters,
  contacts: demo.contacts,
  reports: [],
};

// Notifications are optional: loaded lazily so the web build and Expo Go never crash on them.
async function notify(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    const N = await import('expo-notifications');
    const perm = await N.getPermissionsAsync();
    if (!perm.granted) {
      const req = await N.requestPermissionsAsync();
      if (!req.granted) return;
    }
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
      }),
    });
    await N.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: null });
  } catch {
    /* notifications unavailable on this platform */
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    lang: 'en', apiUrl: defaultApiUrl(), notifications: true, autoRefresh: true,
    theme: 'system', mapType: 'standard', layer: 'risk', pitch3d: false, voice: true,
    showShelters: true, showReports: true, saved: [], recents: [],
  });
  const system = useSystemScheme();
  const palette = useMemo(() => resolvePalette(settings.theme, system), [settings.theme, system]);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(demoData);
  const [source, setSource] = useState<Source>('demo');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Coords | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [queue, setQueue] = useState<ReportInput[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const t = useCallback((k: StringKey) => translate(settings.lang, k), [settings.lang]);

  // ---------- boot: settings, cache, queued reports ----------
  useEffect(() => {
    (async () => {
      try {
        const [s, c, q] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(CACHE_KEY),
          AsyncStorage.getItem(QUEUE_KEY),
        ]);
        if (s) setSettings((prev) => ({ ...prev, ...JSON.parse(s) }));
        if (c) {
          const parsed = JSON.parse(c) as Data & { savedAt: string };
          setData({ ...demoData, ...parsed });
          setSource('cache');
          setLastSync(parsed.savedAt);
        }
        if (q) setQueue(JSON.parse(q));
      } catch {
        /* storage unavailable — keep defaults */
      }
      setReady(true);
    })();
  }, []);

  const updateSettings = useCallback((p: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...p };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const flushQueue = useCallback(async (base: string, items: ReportInput[]) => {
    if (!items.length) return;
    const left: ReportInput[] = [];
    for (const r of items) {
      try { await api.submitReport(base, r); } catch { left.push(r); }
    }
    setQueue(left);
    AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(left)).catch(() => undefined);
  }, []);

  const checkNewAlerts = useCallback(async (alerts: Alert[]) => {
    if (!alerts.length) return;
    const newest = alerts[0];
    try {
      const seen = Number((await AsyncStorage.getItem(SEEN_ALERT_KEY)) ?? 0);
      if (newest.id > seen) {
        await AsyncStorage.setItem(SEEN_ALERT_KEY, String(newest.id));
        if (seen > 0 && settingsRef.current.notifications) {
          const bn = settingsRef.current.lang === 'bn';
          await notify(bn ? '⚠️ ভূমিধস সতর্কতা' : '⚠️ Landslide alert', bn ? newest.message_bn : newest.message_en);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    const base = settingsRef.current.apiUrl;
    setLoading(true);
    try {
      const [hills, alerts, shelters, contacts] = await Promise.all([
        api.hills(base), api.alerts(base), api.shelters(base), api.contacts(base),
      ]);
      let summary: Summary;
      try { summary = await api.summary(base); } catch { summary = summarize(hills, alerts); }
      const reports = await api.reports(base).catch(() => [] as CommunityReport[]);
      const next: Data = { hills, alerts, summary, shelters, contacts, reports };
      const now = new Date().toISOString();
      setData(next);
      setSource('live');
      setLastSync(now);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, savedAt: now })).catch(() => undefined);
      checkNewAlerts(alerts);
      flushQueue(base, queueRef.current);
    } catch {
      // keep whatever we have; just mark that it is not live anymore
      if (sourceRef.current === 'live') setSource('cache');
    } finally {
      setLoading(false);
    }
  }, [checkNewAlerts, flushQueue]);

  // first load + whenever the server address changes
  useEffect(() => {
    if (ready) refresh();
  }, [ready, settings.apiUrl, refresh]);

  // polling while the app is in the foreground
  useEffect(() => {
    if (!ready || !settings.autoRefresh) return;
    let id = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      clearInterval(id);
      if (s === 'active') { refresh(); id = setInterval(refresh, POLL_MS); }
    });
    return () => { clearInterval(id); sub.remove(); };
  }, [ready, settings.autoRefresh, refresh]);

  const requestLocation = useCallback(async (): Promise<Coords | null> => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setLocationDenied(true); return null; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setLocation(c);
      setLocationDenied(false);
      return c;
    } catch {
      setLocationDenied(true);
      return null;
    }
  }, []);

  const submitReport = useCallback(async (r: ReportInput): Promise<'sent' | 'queued'> => {
    try {
      await api.submitReport(settingsRef.current.apiUrl, r);
      return 'sent';
    } catch {
      setQueue((q) => {
        const next = [...q, r];
        AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      return 'queued';
    }
  }, []);

  const timelineRef = useRef<RiskTimeline | null>(null);
  const loadTimeline = useCallback(async () => {
    try {
      const tl = await api.timeline(settingsRef.current.apiUrl);
      timelineRef.current = tl;
      return tl;
    } catch {
      return timelineRef.current ?? demo.timeline ?? null;
    }
  }, []);

  const isSaved = useCallback((key: string) => settings.saved.some((x) => x.key === key), [settings.saved]);
  const toggleSaved = useCallback((p: SavedPlace) => {
    const cur = settingsRef.current.saved;
    updateSettings({ saved: cur.some((x) => x.key === p.key) ? cur.filter((x) => x.key !== p.key) : [p, ...cur].slice(0, 50) });
  }, [updateSettings]);
  const addRecent = useCallback((q: string) => {
    const v = q.trim();
    if (!v) return;
    updateSettings({ recents: [v, ...settingsRef.current.recents.filter((x) => x !== v)].slice(0, 8) });
  }, [updateSettings]);

  const value = useMemo<Ctx>(() => ({
    ...data, settings, updateSettings, t, lang: settings.lang, source, lastSync, loading, refresh,
    location, locationDenied, requestLocation, submitReport, pendingReports: queue.length, ready,
    palette, loadTimeline, isSaved, toggleSaved, addRecent,
  }), [data, settings, updateSettings, t, source, lastSync, loading, refresh, location, locationDenied,
    requestLocation, submitReport, queue.length, ready, palette, loadTimeline, isSaved, toggleSaved, addRecent]);

  return (
    <ThemeCtx.Provider value={palette}>
      <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
    </ThemeCtx.Provider>
  );
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}
