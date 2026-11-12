/**
 * Live watch: sensors → NISAR → model scores → alerts.
 * Numbers from GET /api/system-status and /api/live-feed.
 */
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { api, demo } from '../api';
import { Card, Screen, SectionTitle, StatusBadge, T, digits, useResponsive, type IconName } from '../components/ui';
import { hillName, type Lang } from '../i18n';
import type { RootStack } from '../navigation';
import { useApp } from '../store';
import { font, light, radius, space, statusColor, useTheme } from '../theme';
import type { LiveEvent, ModelInfo, SystemStatus } from '../types';

const L = (lang: Lang, en: string, bn: string) => (lang === 'bn' ? bn : en);
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, monospace' });

const FEATURE_LABEL: Record<string, { en: string; bn: string }> = {
  nisar_soil_moisture: { en: 'Satellite soil moisture', bn: 'উপগ্রহের মাটির আর্দ্রতা' },
  los_velocity_mm_month: { en: 'Satellite ground creep', bn: 'উপগ্রহে মাটির সরণ' },
  humidity_mean: { en: 'Air humidity', bn: 'বাতাসের আর্দ্রতা' },
  soil_moisture_now: { en: 'Sensor soil moisture', bn: 'সেন্সরের মাটির আর্দ্রতা' },
  accel_max: { en: 'Peak ground shaking', bn: 'সর্বোচ্চ কম্পন' },
  coherence: { en: 'Radar signal quality', bn: 'রাডার সংকেতের মান' },
  soil_moisture_change: { en: 'Soil wetting speed', bn: 'মাটি ভেজার গতি' },
  slope_deg: { en: 'Slope steepness', bn: 'ঢালের খাড়াভাব' },
  wind_max: { en: 'Peak wind', bn: 'সর্বোচ্চ বাতাস' },
  accel_mean: { en: 'Average shaking', bn: 'গড় কম্পন' },
  temperature_mean: { en: 'Temperature', bn: 'তাপমাত্রা' },
};

/* ---------------- data hook: polls status + feed ---------------- */
function useLiveSystem() {
  const { settings } = useApp();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [offset, setOffset] = useState(0); // server clock − device clock (ms)
  const lastId = useRef(0);

  useEffect(() => {
    let alive = true;
    const loadStatus = async () => {
      try {
        const s = await api.systemStatus(settings.apiUrl);
        if (!alive) return;
        setStatus(s);
        setOffset(new Date(s.server_time).getTime() - Date.now());
        setOnline(true);
      } catch {
        if (alive) setOnline(false);
      }
    };
    const loadFeed = async () => {
      try {
        const ev = await api.liveFeed(settings.apiUrl, lastId.current);
        if (!alive || !ev.length) return;
        lastId.current = ev[ev.length - 1].id;
        setEvents((prev) => [...ev.reverse(), ...prev].slice(0, 40));
      } catch { /* status handles offline */ }
    };
    loadStatus(); loadFeed();
    const a = setInterval(loadStatus, 4000);
    const b = setInterval(loadFeed, 2000);
    return () => { alive = false; clearInterval(a); clearInterval(b); };
  }, [settings.apiUrl]);

  return { status, events, online, offset };
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

/** Smoothly counts up to the new value. */
function useTween(target: number, dur = 700) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = Date.now();
    const a = from.current;
    let raf = 0;
    const tick = () => {
      const k = Math.min(1, (Date.now() - start) / dur);
      const val = a + (target - a) * (1 - (1 - k) ** 3);
      setV(val);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

const ago = (lang: Lang, sec: number) => {
  if (sec < 0) sec = 0;
  if (sec < 60) return L(lang, `${Math.round(sec)} s ago`, `${digits(lang, Math.round(sec))} সে. আগে`);
  if (sec < 3600) return L(lang, `${Math.floor(sec / 60)} min ago`, `${digits(lang, Math.floor(sec / 60))} মি. আগে`);
  return L(lang, `${Math.floor(sec / 3600)} h ago`, `${digits(lang, Math.floor(sec / 3600))} ঘ. আগে`);
};
const fmtUptime = (s: number) => {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/* ====================================================================== */
export default function LiveSystemScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { t, lang, settings } = useApp();
  const c = useTheme();
  const { cols } = useResponsive();
  const { status, events, online, offset } = useLiveSystem();
  const now = useNow();
  const [info, setInfo] = useState<ModelInfo>(demo.modelInfo);
  useEffect(() => { api.modelInfo(settings.apiUrl).then(setInfo).catch(() => undefined); }, [settings.apiUrl]);

  const serverNow = now + offset;
  const lastEvent = events[0];
  const nodesOnline = status?.nodes.filter((n) => n.online).length ?? 0;
  const uptime = status ? status.uptime_s + (serverNow - new Date(status.server_time).getTime()) / 1000 : 0;

  const pulseKind = lastEvent && serverNow - new Date(lastEvent.ts).getTime() < 2500 ? lastEvent.kind : null;

  return (
    <Screen back backTo="Map" title={t('moreModel')}
      subtitle={L(lang, 'Sensors, NISAR, model, then alerts', 'সেন্সর, NISAR, মডেল, তারপর সতর্কতা')}
      right={<OnlinePill online={online} />}>

      {/* ---------- pipeline ---------- */}
      <Card style={{ paddingVertical: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Stage icon="hardware-chip" color={c.safe} active={pulseKind === 'reading'}
            title={L(lang, 'Sensors', 'সেন্সর')}
            line1={status ? `${digits(lang, nodesOnline)}/${digits(lang, status.nodes.length)} ${L(lang, 'online', 'অনলাইন')}` : '—'}
            line2={status ? `${digits(lang, status.readings.per_min)}/${L(lang, 'min', 'মিনিট')}` : ''} />
          <Flow color={c.safe} on={!!online} />
          <Stage icon="planet" color={c.info} active={pulseKind === 'model'}
            title="NISAR"
            line1={status ? `${digits(lang, status.nisar.hills_covered)} ${L(lang, 'hills', 'পাহাড়')}` : '—'}
            line2={status?.nisar.latest_pass ?? ''} />
          <Flow color={c.info} on={!!online} delay={300} />
          <Stage icon="sparkles" color={c.violet} active={pulseKind === 'model'}
            title={L(lang, 'Model', 'মডেল')}
            line1={status ? `${digits(lang, status.model.trees ?? '')} ${L(lang, 'trees', 'ট্রি')}` : '—'}
            line2={status?.model.avg_ms != null ? `${digits(lang, Math.round(status.model.avg_ms))} ms` : ''} />
          <Flow color={c.violet} on={!!online} delay={600} />
          <Stage icon="warning" color={c.danger} active={pulseKind === 'alert'}
            title={L(lang, 'Alerts', 'সতর্কতা')}
            line1={status ? `${digits(lang, status.alerts.total)} ${L(lang, 'sent', 'পাঠানো')}` : '—'}
            line2={status ? `${digits(lang, status.nodes.filter((n) => n.level === 'DANGER').length)} ${L(lang, 'active', 'সক্রিয়')}` : ''} />
        </View>
      </Card>

      {online === false && (
        <Card style={{ marginTop: space.md, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.tint.WATCH }}>
          <Ionicons name="cloud-offline" size={20} color={c.watch} />
          <T style={[font.small, { flex: 1 }]}>
            {L(lang, 'Server offline. Start the backend to see live data.', 'সার্ভার অফলাইন। লাইভ দেখতে ব্যাকএন্ড চালু করুন।')}
          </T>
        </Card>
      )}

      {/* ---------- KPIs ---------- */}
      {status && (
        <>
          <SectionTitle title={L(lang, 'Right now', 'এই মুহূর্তে')}
            right={<T muted style={font.tiny}>{fmtUptime(uptime)}</T>} />
          <Grid n={cols(2, 4, 4)}>
            <Kpi icon="speedometer" color={c.teal} label={L(lang, 'Readings / min', 'রিডিং / মিনিট')} value={status.readings.per_min} dec={1} />
            <Kpi icon="flash" color={c.watch} label={L(lang, 'Model ms', 'মডেল ms')} value={status.model.avg_ms ?? 0} />
            <Kpi icon="warning" color={c.danger} label={L(lang, 'Danger alerts', 'বিপদ সতর্কতা')} value={status.alerts.total} />
            <Kpi icon="server" color={c.safe} label={L(lang, 'Stored readings', 'সংরক্ষিত রিডিং')} value={status.readings.total} />
          </Grid>

          {/* ---------- per hill ---------- */}
          <SectionTitle title={L(lang, 'Each hill', 'প্রতিটি পাহাড়')}
            right={<T muted style={font.tiny}>{L(lang, `scored every ${status.intervals.model_s}s`, `প্রতি ${digits(lang, status.intervals.model_s)} সে. হিসাব`)}</T>} />
          <Grid n={cols(1, 2, 3)}>
            {status.nodes.map((n) => {
              const age = n.last_ts ? (serverNow - new Date(n.last_ts).getTime()) / 1000 : null;
              const scored = n.scored_at ? (serverNow - new Date(n.scored_at).getTime()) / 1000 : null;
              const fresh = lastEvent?.device_id === n.device_id && pulseKind === 'reading';
              return (
                <Card key={n.hill_id} style={{ gap: 10, borderColor: fresh ? c.safe : c.line }}
                  onPress={() => nav.navigate('HillDetail', { hillId: n.hill_id })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Dot on={n.online} />
                    <View style={{ flex: 1 }}>
                      <T style={font.h3} numberOfLines={1}>{hillName(lang, n.hill_name)}</T>
                      <Text style={{ fontFamily: MONO, fontSize: 11, color: c.muted }}>{n.device_id} · {digits(lang, n.readings_total)} {L(lang, 'pkts', 'প্যাকেট')}</Text>
                    </View>
                    <StatusBadge level={n.level} size="sm" />
                  </View>
                  <Spark values={n.soil_trend} color={c.water} />
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Mini label={L(lang, 'Soil', 'মাটি')} value={n.latest?.soil_moisture.toFixed(3) ?? '—'} hot={(n.latest?.soil_moisture ?? 0) >= 0.32} />
                    <Mini label={L(lang, 'Shaking', 'কম্পন')} value={`${n.latest?.acceleration.toFixed(3) ?? '—'} g`} hot={(n.latest?.acceleration ?? 0) >= 0.02} />
                    <Mini label={L(lang, 'Humidity', 'আর্দ্রতা')} value={`${n.latest?.humidity.toFixed(0) ?? '—'}%`} />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <T muted style={font.tiny}>{L(lang, 'Landslide chance', 'ধসের সম্ভাবনা')}{n.verified_by_nisar ? ' · NISAR ✓' : ''}</T>
                      <Text style={{ color: statusColor[n.level], fontWeight: '800', fontSize: 13 }}>
                        {n.probability == null ? '—' : `${digits(lang, (n.probability * 100).toFixed(1))}%`}
                      </Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.chip, overflow: 'hidden' }}>
                      <View style={{ width: `${(n.probability ?? 0) * 100}%`, height: 8, backgroundColor: statusColor[n.level] }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <T muted style={font.tiny}>{L(lang, 'Reading', 'রিডিং')} {age != null ? ago(lang, age) : '—'}</T>
                    <T muted style={font.tiny}>{L(lang, 'Scored', 'স্কোর')} {scored != null ? ago(lang, scored) : '—'}</T>
                  </View>
                </Card>
              );
            })}
          </Grid>
        </>
      )}

      {/* ---------- live log ---------- */}
      <SectionTitle title={L(lang, 'Live event log', 'লাইভ ইভেন্ট লগ')} right={<OnlinePill online={online} small />} />
      <View style={{ backgroundColor: '#0B0C0E', borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: '#23252A', minHeight: 140 }}>
        {events.length === 0 && <Text style={{ color: '#6B6F78', fontFamily: MONO, fontSize: 12 }}>{L(lang, 'waiting for events…', 'ইভেন্টের অপেক্ষা…')}</Text>}
        {events.slice(0, 18).map((e, i) => (
          <Text key={e.id} numberOfLines={2} style={{ fontFamily: MONO, fontSize: 12, lineHeight: 19, color: KIND_COLOR[e.kind] ?? '#C8CBD2', opacity: 1 - i * 0.035 }}>
            <Text style={{ color: '#6B6F78' }}>{new Date(e.ts).toLocaleTimeString('en-GB')} </Text>
            <Text style={{ fontWeight: '700' }}>{KIND_TAG[e.kind] ?? e.kind} </Text>
            {e.text}
          </Text>
        ))}
      </View>
      {status?.simulated && (
        <T muted style={[font.tiny, { marginTop: 8 }]}>
          {L(lang,
            'Field nodes replay the 7-day archive until sensors POST to /api/ingest. The model, NISAR check and alerts still run on that stream.',
            'সেন্সর POST /api/ingest-এ তথ্য না পাঠানো পর্যন্ত নোডগুলো ৭ দিনের আর্কাইভ রিপ্লে করে। মডেল, NISAR যাচাই ও সতর্কতা এই স্ট্রিমেই চলে।')}
        </T>
      )}

      <SectionTitle title={t('modelTitle')} />
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: c.infoTint, padding: space.md, borderRadius: radius.md }}>
          <Ionicons name="shield-checkmark" size={18} color={c.info} />
          <T style={[font.small, { flex: 1, lineHeight: 20, color: c.inkSoft }]}>{t('modelRule')}</T>
        </View>
        {status && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              `${status.model.type}`,
              `${status.model.window_hours ?? 5}h ${L(lang, 'window', 'উইন্ডো')}`,
              `DANGER ≥ ${Math.round(status.model.danger_threshold * 100)}% + NISAR`,
              ...status.nisar.products,
            ].map((x) => (
              <View key={x} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.chip }}>
                <Text style={{ color: c.inkSoft, fontSize: 12, fontWeight: '600' }}>{x}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: c.ink, letterSpacing: -1 }}>{digits(lang, info.roc_auc.toFixed(2))}</Text>
          <T muted style={[font.small, { flex: 1 }]}>{t('modelAccuracy')}</T>
        </View>
        <FeatureBars info={info} />
      </Card>
    </Screen>
  );
}

const KIND_COLOR: Record<string, string> = { reading: '#7EE2A8', model: '#B8A4FF', alert: '#FF8A8E', system: '#7FB6FF', error: '#FFB547' };
const KIND_TAG: Record<string, string> = { reading: 'RX', model: 'MODEL', alert: 'ALERT', system: 'SYS', error: 'ERR' };

/* ---------------- pieces ---------------- */
function OnlinePill({ online, small }: { online: boolean | null; small?: boolean }) {
  const c = useTheme();
  const { lang } = useApp();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const col = online === false ? c.danger : online ? c.safe : c.muted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: small ? 10 : 12, paddingVertical: small ? 5 : 8, borderRadius: 999, backgroundColor: online === false ? c.tint.DANGER : c.tint.SAFE }}>
      <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
        {online && (
          <Animated.View style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: col,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }} />
        )}
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
      </View>
      <Text style={{ color: col, fontWeight: '800', fontSize: small ? 11 : 12, letterSpacing: 0.6 }}>
        {online === false ? L(lang, 'OFFLINE', 'অফলাইন') : online ? L(lang, 'LIVE', 'লাইভ') : '…'}
      </Text>
    </View>
  );
}

function Stage({ icon, color, title, line1, line2, active }: { icon: IconName; color: string; title: string; line1: string; line2: string; active?: boolean }) {
  const c = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [active, scale]);
  return (
    <View style={{ alignItems: 'center', gap: 6, width: 78 }}>
      <Animated.View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center',
        borderWidth: active ? 2 : 0, borderColor: color, transform: [{ scale }] }}>
        <Ionicons name={icon} size={26} color={color} />
      </Animated.View>
      <Text style={{ color: c.ink, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{title}</Text>
      <Text style={{ color: c.inkSoft, fontSize: 11, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>{line1}</Text>
      <Text style={{ color: c.muted, fontSize: 10, textAlign: 'center' }} numberOfLines={1}>{line2}</Text>
    </View>
  );
}

/** Animated data packets travelling along a connector. */
function Flow({ color, on, delay = 0 }: { color: string; on: boolean; delay?: number }) {
  const [w, setW] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on, anim, delay]);
  return (
    <View style={{ flex: 1, height: 54, justifyContent: 'center' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ height: 2, backgroundColor: `${color}40`, borderRadius: 1 }} />
      {on && [0, 0.33, 0.66].map((o) => (
        <Animated.View key={o} style={{
          position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color,
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [o * w, o * w + w / 3] }) }],
          opacity: anim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        }} />
      ))}
    </View>
  );
}

function Grid({ n, children }: { n: number; children: React.ReactNode }) {
  const [w, setW] = useState(0);
  const items = React.Children.toArray(children);
  const cw = w ? Math.floor((w - 10 * (n - 1)) / n) - 1 : undefined;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {items.map((ch, i) => <View key={i} style={{ width: cw ?? '100%' }}>{ch}</View>)}
    </View>
  );
}

function Kpi({ icon, color, label, value, text, dec = 0, suffix = '' }: {
  icon: IconName; color: string; label: string; value?: number; text?: string; dec?: number; suffix?: string;
}) {
  const c = useTheme();
  const { lang } = useApp();
  const v = useTween(value ?? 0);
  const shown = text ?? `${v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${suffix}`;
  return (
    <Card style={{ gap: 6, padding: space.md }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: '700', color: c.ink, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{digits(lang, shown)}</Text>
      <T muted style={font.tiny} numberOfLines={2}>{label}</T>
    </Card>
  );
}

function Mini({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: hot ? c.tint.DANGER : c.surfaceAlt, borderRadius: 10, padding: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: hot ? c.danger : c.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 10, color: c.muted }}>{label}</Text>
    </View>
  );
}

function Dot({ on }: { on: boolean }) {
  const c = useTheme();
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? c.safe : c.danger, borderWidth: 2, borderColor: on ? c.tint.SAFE : c.tint.DANGER }} />;
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const [w, setW] = useState(0);
  const h = 36;
  const pts = useMemo(() => {
    if (!w || values.length < 2) return '';
    const lo = Math.min(...values); const hi = Math.max(...values); const span = hi - lo || 0.001;
    return values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - lo) / span) * (h - 6)}`).join(' ');
  }, [values, w]);
  return (
    <View style={{ height: h }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && <Svg width={w} height={h}><Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" /></Svg>}
    </View>
  );
}

function FeatureBars({ info }: { info: ModelInfo }) {
  const c = useTheme();
  const { lang } = useApp();
  const feats = Object.entries(info.feature_importance).sort((a, b) => b[1] - a[1]);
  const maxV = feats[0]?.[1] ?? 1;
  const isSat = (k: string) => k.startsWith('nisar') || k === 'los_velocity_mm_month' || k === 'coherence';
  return (
    <Card style={{ gap: 12 }}>
      {feats.map(([k, v]) => (
        <View key={k} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T style={font.small}>{FEATURE_LABEL[k]?.[lang] ?? k}</T>
            <T muted style={font.small}>{digits(lang, Math.round(v * 100))}%</T>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.chip, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 4, width: `${(v / maxV) * 100}%`, backgroundColor: isSat(k) ? light.info : light.safe }} />
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: space.lg, marginTop: 4, flexWrap: 'wrap' }}>
        {[[light.info, L(lang, 'Satellite (NISAR)', 'উপগ্রহ (NISAR)')], [light.safe, L(lang, 'Ground sensors & terrain', 'মাঠের সেন্সর ও ভূপ্রকৃতি')]].map(([col, lab]) => (
          <View key={lab} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: col }} />
            <T muted style={font.tiny}>{lab}</T>
          </View>
        ))}
      </View>
    </Card>
  );
}
