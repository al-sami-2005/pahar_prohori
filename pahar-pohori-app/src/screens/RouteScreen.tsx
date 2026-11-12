import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { goBackSmart } from '../navigation/back';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RouteMap from '../components/RouteMap';
import { digits, useResponsive } from '../components/ui';
import { hillName } from '../i18n';
import type { RootStack } from '../navigation';
import { fetchRoute, formatMeters, maneuverIcon, progressOnRoute, type Profile } from '../services/routing';
import { speak, stopSpeaking } from '../services/speech';
import { useApp } from '../store';
import { nav, radius, space } from '../theme';
import type { MapType, RoadRoute } from '../types';
import { callNumber, formatDuration, haversineKm, mapsLink, openDirections } from '../utils';

type Props = NativeStackScreenProps<RootStack, 'Route'>;
type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const clock = (sec: number) => {
  const d = new Date(Date.now() + sec * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function RouteScreen({ route: navRoute, navigation }: Props) {
  const { shelterId, fromHillId, fromLat, fromLon, fromLabel, live: autoLive } = navRoute.params;
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const { shelters, hills, location, requestLocation, t, lang, settings, updateSettings } = useApp();
  const shelter = shelters.find((s) => s.shelter_id === shelterId);

  const [expanded, setExpanded] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const [profile, setProfile] = useState<Profile>('foot');
  const [mapType, setMapType] = useState<MapType>('standard');
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lon: number; heading: number | null } | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const [arrived, setArrived] = useState(false);
  const announced = useRef<Set<string>>(new Set());
  const lastReroute = useRef(0);
  const voice = settings.voice;

  useEffect(() => { if (!location && !fromHillId && fromLat == null) requestLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fromHill = hills.find((h) => h.hill_id === fromHillId);
  const origin = useMemo(() => {
    if (fromLat != null && fromLon != null) return { lat: fromLat, lon: fromLon, label: fromLabel ?? '' };
    if (location) return { lat: location.lat, lon: location.lon, label: t('yourLocation') };
    const h = fromHill ?? (shelter && [...hills].sort((a, b) =>
      haversineKm(shelter.lat, shelter.lon, a.lat, a.lon) - haversineKm(shelter.lat, shelter.lon, b.lat, b.lon))[0]);
    return h ? { lat: h.lat, lon: h.lon, label: hillName(lang, h.name) } : null;
  }, [location, fromHill, shelter, hills, lang, t, fromLat, fromLon, fromLabel]);

  // ---- fetch the road route (overview) ----
  const originKey = origin ? `${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}` : '';
  useEffect(() => {
    if (!origin || !shelter || live) return;
    let alive = true;
    setLoading(true);
    fetchRoute(origin, shelter, profile, lang).then((r) => { if (alive) { setRoute(r); setLoading(false); } });
    return () => { alive = false; };
  }, [originKey, shelterId, profile, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- live navigation: GPS watch ----
  useEffect(() => {
    if (!live) return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setLive(false); return; }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 4, timeInterval: 2000 },
        (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, heading: p.coords.heading != null && p.coords.heading >= 0 ? p.coords.heading : null }),
      );
    })();
    return () => { sub?.remove(); };
  }, [live]);

  const prog = route && pos ? progressOnRoute(route, pos.lat, pos.lon) : null;

  // ---- voice prompts, re-routing and arrival ----
  useEffect(() => {
    if (!live || !route || !pos || !prog || !shelter) return;
    // arrived only when really at the shelter (not just beside the end of the line while off-route)
    if (haversineKm(pos.lat, pos.lon, shelter.lat, shelter.lon) < 0.04 || (prog.remaining < 30 && prog.offRoute < 40)) {
      setArrived(true);
      setLive(false);
      if (voice) speak(t('arrived'), lang);
      return;
    }
    if (prog.offRoute > 60 && Date.now() - lastReroute.current > 20000) {
      lastReroute.current = Date.now();
      setRerouting(true);
      if (voice) speak(t('rerouting'), lang);
      fetchRoute(pos, shelter, profile, lang).then((r) => { setRoute(r); setRerouting(false); announced.current.clear(); });
      return;
    }
    const st = prog.next;
    if (!st || !voice) return;
    const near = prog.toNext < (profile === 'foot' ? 40 : 120);
    const ahead = prog.toNext < (profile === 'foot' ? 200 : 600);
    const key = `${st.cumDist}:${near ? 'now' : ahead ? 'soon' : ''}`;
    if ((near || ahead) && !announced.current.has(key)) {
      announced.current.add(key);
      const m = formatMeters(prog.toNext, lang);
      speak(near ? st.instruction : lang === 'bn' ? `${m.value} ${m.unit} ${t('inMeters')}, ${st.instruction}` : `In ${m.value} ${m.unit === 'm' ? 'metres' : 'kilometres'}, ${st.instruction}`, lang);
    }
  }, [pos?.lat, pos?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopSpeaking(); }, []);
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoLive && route && !autoStarted.current) { autoStarted.current = true; announced.current.clear(); setExpanded(false); setLive(true); }
  }, [autoLive, route]);

  if (!shelter || !origin) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingHorizontal: 16 }]}>
        <RoundBtn icon="chevron-back" onPress={() => goBackSmart(navigation)} label={t('back')} />
      </View>
    );
  }

  const startLive = () => {
    announced.current.clear();
    setArrived(false);
    setExpanded(false);
    setLive(true);
    if (voice && route) speak(`${t('navigating')}. ${route.steps[0]?.instruction ?? ''}`, lang);
  };
  const stopLive = () => { setLive(false); setPos(null); stopSpeaking(); setExpanded(true); };

  const shelterName = lang === 'bn' ? shelter.name_bn : shelter.name;
  const dist = prog ? prog.remaining : route?.distance ?? haversineKm(origin.lat, origin.lon, shelter.lat, shelter.lon) * 1300;
  const dur = route ? (route.duration * dist) / Math.max(route.distance, 1) : dist / (profile === 'foot' ? 0.97 : 6.9);
  const next = prog?.next ?? route?.steps.find((s) => s.type !== 'depart') ?? route?.steps[0];
  const toNext = prog ? prog.toNext : next?.cumDist ?? dist;
  const nm = formatMeters(toNext, lang);
  const dm = formatMeters(dist, lang);
  const sheetH = live ? 230 : expanded ? 520 : 240;

  const share = () => {
    const where = pos ? mapsLink(pos.lat, pos.lon) : mapsLink(origin.lat, origin.lon);
    Share.share({ message: `${t('safeMessage')} ${where}\n→ ${shelterName}: ${mapsLink(shelter.lat, shelter.lon)}` }).catch(() => undefined);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RouteMap origin={origin} dest={shelter} route={route} user={live ? pos : null} follow={live && !!pos}
        mapType={mapType} bottomInset={sheetH} />

      {/* top controls */}
      <View style={[styles.topBar, { top: insets.top + 10 }]} pointerEvents="box-none">
        <RoundBtn icon="chevron-back" onPress={() => { stopLive(); goBackSmart(navigation); }} label={t('back')} />
        <View style={{ flex: 1 }} />
        <RoundBtn icon={mapType === 'satellite' ? 'map' : 'earth'} label={t('mapSatellite')}
          onPress={() => setMapType(mapType === 'satellite' ? 'standard' : 'satellite')} />
        <RoundBtn icon={voice ? 'volume-high' : 'volume-mute'} label={t('voiceGuidance')}
          onPress={() => { if (voice) stopSpeaking(); updateSettings({ voice: !voice }); }} />
      </View>

      {/* live maneuver banner */}
      {live && next && (
        <View style={[styles.maneuver, { top: insets.top + 64 }]}>
          <MaterialCommunityIcons name={maneuverIcon(next.type, next.modifier) as MCIName} size={44} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.manDist}>{digits(lang, nm.value)} <Text style={{ fontSize: 18 }}>{nm.unit}</Text></Text>
            <Text style={styles.manText} numberOfLines={2}>{rerouting ? t('rerouting') : next.instruction}</Text>
          </View>
          {!pos && <ActivityIndicator color="#fff" />}
        </View>
      )}

      {/* bottom sheet (nav sample) */}
      <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <View style={[styles.sheet, isTablet && { maxWidth: 480, alignSelf: 'flex-start', marginLeft: 24 }]}>
          {arrived && (
            <View style={[styles.row, { backgroundColor: '#14301F' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#22A06B" />
              <Text style={[styles.rowMain, { flex: 1 }]}>{t('arrived')}</Text>
            </View>
          )}

          {!live && (
            <Pressable style={styles.sheetHead} onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
              <Text style={styles.sheetTitle}>{t('routeDetails')}</Text>
              <View style={styles.chev}><Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color={nav.ink} /></View>
            </Pressable>
          )}

          {expanded && !live && (
            <>
              <View style={[styles.row, { backgroundColor: nav.yellowRow }]}>
                <View style={[styles.rowIcon, { backgroundColor: nav.yellow }]}><Ionicons name="home" size={18} color="#1d1d1d" /></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>{shelterName}</Text>
                    <Text style={styles.rowLabel}>{digits(lang, shelter.capacity)} {t('capacity')}</Text>
                  </View>
                  <Text style={styles.rowMain}>
                    {digits(lang, dm.value)} {dm.unit} · {formatDuration(lang, Math.max(1, Math.round(dur / 60)))} · {digits(lang, clock(dur))}
                  </Text>
                </View>
              </View>
              <View style={[styles.row, { backgroundColor: nav.surface2 }]}>
                <View style={[styles.rowIcon, { backgroundColor: nav.surface }]}><Ionicons name="location" size={18} color="#E5484D" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel} numberOfLines={1}>{t('from')}: {origin.label}</Text>
                  <View style={styles.modeRow}>
                    {(['foot', 'car'] as Profile[]).map((p) => (
                      <Pressable key={p} onPress={() => setProfile(p)} style={[styles.mode, profile === p && styles.modeOn]}>
                        <Ionicons name={p === 'foot' ? 'walk' : 'car'} size={15} color={profile === p ? '#111' : nav.ink} />
                        <Text style={{ color: profile === p ? '#111' : nav.ink, fontWeight: '600', fontSize: 13 }}>{t(p === 'foot' ? 'walk' : 'drive')}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* big next-maneuver line */}
          <View style={styles.big}>
            {loading ? <ActivityIndicator color={nav.blue} /> : (
              <MaterialCommunityIcons name={(next ? maneuverIcon(next.type, next.modifier) : 'arrow-up') as MCIName} size={46} color={nav.blue} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.bigNum}>{digits(lang, live ? dm.value : nm.value)}<Text style={styles.bigUnit}> {live ? dm.unit : nm.unit}</Text></Text>
              <Text style={styles.bigSub} numberOfLines={1}>
                {live ? `${t('remaining')} · ${t('arrive')} ${digits(lang, clock(dur))}` : next?.instruction ?? ''}
              </Text>
            </View>
          </View>

          {!live && expanded && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={[styles.navBtn, { flex: 1 }]} onPress={startLive} disabled={!route} accessibilityRole="button">
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.navText}>{t('startLive')}</Text>
              </Pressable>
              <Pressable style={styles.gmBtn} onPress={() => openDirections(shelter, origin, profile === 'foot' ? 'walking' : 'driving')} accessibilityRole="button">
                <Ionicons name="open-outline" size={16} color={nav.ink} />
                <Text style={{ color: nav.ink, fontWeight: '600', fontSize: 13 }}>{t('openInMaps')}</Text>
              </Pressable>
            </View>
          )}

          {!live && expanded && route && (
            <>
              <Pressable onPress={() => setShowSteps((v) => !v)} style={styles.stepsHead}>
                <MaterialCommunityIcons name="format-list-numbered" size={16} color={nav.muted} />
                <Text style={styles.note}>{t('steps')} · {digits(lang, route.steps.length)} · {route.real ? t('realRoad') : t('approxLine')}</Text>
                <Ionicons name={showSteps ? 'chevron-up' : 'chevron-down'} size={14} color={nav.muted} />
              </Pressable>
              {showSteps && (
                <ScrollView style={{ maxHeight: 160 }}>
                  {route.steps.map((st, i) => {
                    const m = formatMeters(st.distance, lang);
                    return (
                      <View key={i} style={styles.stepRow}>
                        <MaterialCommunityIcons name={maneuverIcon(st.type, st.modifier) as MCIName} size={20} color={nav.blue} />
                        <Text style={styles.stepText} numberOfLines={2}>{st.instruction}</Text>
                        {st.distance > 0 && <Text style={styles.stepDist}>{digits(lang, m.value)} {m.unit}</Text>}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.actions}>
            <Action icon="share-social" label={t('share')} onPress={share} />
            <Pressable style={{ alignItems: 'center', gap: 6 }} onPress={() => (live ? stopLive() : goBackSmart(navigation))} accessibilityRole="button">
              <View style={styles.finish}><Ionicons name="close" size={30} color="#fff" /></View>
              <Text style={styles.actionLabel}>{live ? t('stopLive') : t('finish')}</Text>
            </Pressable>
            <Action icon="call" label={`${t('call')} ${digits(lang, shelter.phone)}`} onPress={() => callNumber(shelter.phone)} />
          </View>
        </View>
      </View>
    </View>
  );
}

function RoundBtn({ icon, onPress, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityRole="button" hitSlop={6}
      style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={nav.ink} />
    </Pressable>
  );
}

function Action({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable style={{ alignItems: 'center', gap: 6, width: 90 }} onPress={onPress} accessibilityRole="button">
      <View style={styles.actionBtn}><Ionicons name={icon} size={22} color={nav.ink} /></View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nav.bg },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(38,39,43,0.95)', alignItems: 'center', justifyContent: 'center' },
  maneuver: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1F6F43', borderRadius: 24, padding: 16, maxWidth: 520,
  },
  manDist: { color: '#fff', fontSize: 30, fontWeight: '700' },
  manText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '500' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  sheet: {
    backgroundColor: 'rgba(29,30,33,0.97)', borderRadius: 30, padding: space.lg, gap: 10, width: '100%',
    borderWidth: StyleSheet.hairlineWidth, borderColor: nav.surface2,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  sheetTitle: { color: nav.ink, fontSize: 19, fontWeight: '500' },
  chev: { width: 40, height: 40, borderRadius: 20, backgroundColor: nav.surface2, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: radius.lg, padding: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: nav.muted, fontSize: 14 },
  rowMain: { color: nav.ink, fontSize: 16, fontWeight: '500', marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: nav.surface },
  modeOn: { backgroundColor: nav.yellow },
  big: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 6, paddingHorizontal: 4 },
  bigNum: { color: nav.ink, fontSize: 42, fontWeight: '500', letterSpacing: -1 },
  bigUnit: { fontSize: 22, fontWeight: '400' },
  bigSub: { color: nav.muted, fontSize: 14 },
  navBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', borderRadius: 999, paddingVertical: 14 },
  navText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  gmBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: nav.surface2, borderRadius: 999, paddingHorizontal: 14 },
  stepsHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: nav.surface2 },
  stepText: { color: nav.ink, flex: 1, fontSize: 13 },
  stepDist: { color: nav.muted, fontSize: 12 },
  note: { color: nav.muted, fontSize: 12, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: nav.surface2, marginVertical: 2 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  actionBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: nav.surface2, alignItems: 'center', justifyContent: 'center' },
  finish: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: nav.ink, fontSize: 12 },
});
