import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, type Snap } from '../components/BottomSheet';
import { LayerSheet, ReplayBar } from '../components/MapControls';
import type { HillOverride } from '../components/mapLayers';
import { ExploreContent, GeoPlace, HillPlace, ShelterPlace } from '../components/PlaceSheet';
import RiskMap from '../components/RiskMap';
import { SearchOverlay, type SearchPick } from '../components/SearchOverlay';
import { T, digits, useResponsive, type IconName } from '../components/ui';
import { districtName, hillName } from '../i18n';
import type { RootStack } from '../navigation';
import { useTabBarSpace } from '../navigation/TabBar';
import { useApp } from '../store';
import { font, radius, shadow, shadowSoft, space, statusColor, useTheme } from '../theme';
import type { GeoResult, Level, RiskTimeline } from '../types';
import { haversineKm, nearestShelters } from '../utils';

type Sel = { kind: 'hill'; id: number } | { kind: 'shelter'; id: number } | { kind: 'place'; place: GeoResult } | null;
const NEARBY_KM = 8;
const BLUE = '#1A73E8';

export default function MapScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { width, height } = useResponsive();
  const wide = width >= 900;
  const c = useTheme();
  const {
    hills, shelters, reports, summary, t, lang, settings, updateSettings, location, requestLocation, loadTimeline, source,
  } = useApp();

  const [sel, setSel] = useState<Sel>(null);
  const [levelFilter, setLevelFilter] = useState<Level | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [nearbyDismissed, setNearbyDismissed] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lon: number; zoom?: number; key: number } | null>(null);

  // ---- bottom sheet ----
  const peek = sel ? 250 : 190;
  const heights: [number, number, number] = [peek, Math.round(height * 0.5), Math.max(peek + 100, height - insets.top - 90)];
  const [snap, setSnap] = useState<Snap>(0);
  const sheetH = useRef(new Animated.Value(peek)).current;

  // ---- 7-day replay ----
  const [timeline, setTimeline] = useState<RiskTimeline | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [tIndex, setTIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const replay = !!timeline;
  const openReplay = async () => {
    setReplayLoading(true);
    const tl = await loadTimeline();
    setReplayLoading(false);
    if (!tl || !tl.times.length) {
      Alert.alert(t('replay'), t('replayUnavailable'));
      return;
    }
    setSel(null); setTimeline(tl); setTIndex(0); setPlaying(true);
    setFocus({ lat: 22.55, lon: 92.15, zoom: 9, key: Date.now() });
  };
  const closeReplay = () => { setTimeline(null); setPlaying(false); };
  useEffect(() => {
    if (!playing || !timeline) return;
    const id = setInterval(() => setTIndex((i) => { if (i >= timeline.times.length - 1) { setPlaying(false); return i; } return i + 1; }), 110);
    return () => clearInterval(id);
  }, [playing, timeline]);
  const overrides = useMemo<Record<number, HillOverride> | null>(() => {
    if (!timeline) return null;
    const o: Record<number, HillOverride> = {};
    Object.entries(timeline.hills).forEach(([id, v]) => { o[Number(id)] = { p: v.p[tIndex], level: v.level[tIndex] }; });
    return o;
  }, [timeline, tIndex]);

  // ---- data for the map ----
  const visibleHills = useMemo(() => hills.filter((h) =>
    (!levelFilter || h.status.level === levelFilter) && (!district || h.district === district)), [hills, levelFilter, district]);
  const selHill = sel?.kind === 'hill' ? hills.find((h) => h.hill_id === sel.id) ?? null : null;
  const selShelter = sel?.kind === 'shelter' ? shelters.find((s) => s.shelter_id === sel.id) ?? null : null;
  const pin = sel?.kind === 'place' ? { lat: sel.place.lat, lon: sel.place.lon, label: sel.place.name } : null;

  const nearbyDanger = useMemo(() => {
    if (!location) return null;
    return hills.filter((h) => h.status.level === 'DANGER')
      .map((h) => ({ h, km: haversineKm(location.lat, location.lon, h.lat, h.lon) }))
      .filter((x) => x.km <= NEARBY_KM).sort((a, b) => a.km - b.km)[0] ?? null;
  }, [location, hills]);

  // ---- actions ----
  const fly = (lat: number, lon: number, zoom = 12.5) => setFocus({ lat, lon, zoom, key: Date.now() });
  const selectHill = (id: number | null) => {
    if (id == null) { setSel(null); setSnap(0); return; }
    const h = hills.find((x) => x.hill_id === id);
    setSel({ kind: 'hill', id }); setSnap(0);
    if (h) fly(h.lat, h.lon);
  };
  const onPick = (p: SearchPick) => {
    setSearchOpen(false);
    if (p.kind === 'hill') selectHill(p.hill.hill_id);
    else if (p.kind === 'shelter') { setSel({ kind: 'shelter', id: p.shelter.shelter_id }); setSnap(0); fly(p.shelter.lat, p.shelter.lon, 14); }
    else if (p.kind === 'place') { setSel({ kind: 'place', place: p.place }); setSnap(0); fly(p.place.lat, p.place.lon, 13); }
    else if (p.kind === 'district') {
      setDistrict(p.district); setSel(null);
      const hs = hills.filter((h) => h.district === p.district);
      if (hs.length) fly(hs.reduce((a, h) => a + h.lat, 0) / hs.length, hs.reduce((a, h) => a + h.lon, 0) / hs.length, 10.5);
    }
  };
  const nearMe = async () => {
    const co = await requestLocation();
    if (!co) return;
    setNearbyDismissed(false);
    fly(co.lat, co.lon, 13);
  };
  const directionsFab = async () => {
    const from = location ?? (selHill ? { lat: selHill.lat, lon: selHill.lon } : await requestLocation());
    const target = from ?? { lat: hills[0]?.lat ?? 22.6, lon: hills[0]?.lon ?? 92.2 };
    const s = selShelter ?? nearestShelters(target.lat, target.lon, shelters, 1)[0];
    if (!s) { Alert.alert(t('tabShelters'), t('noShelterNearby')); return; }
    nav.navigate('Route', { shelterId: s.shelter_id, fromHillId: !location && selHill ? selHill.hill_id : undefined });
  };
  const toggleLevel = (l: Level) => setLevelFilter((cur) => (cur === l ? null : l));

  /* ------------------------------------------------------------ pieces */
  const searchPill = (
    <Pressable onPress={() => setSearchOpen(true)} accessibilityRole="search" accessibilityLabel={t('searchHills')}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, borderRadius: 28, paddingLeft: 8, paddingRight: 6,
        backgroundColor: c.elevated, borderWidth: c.dark ? 1 : 0, borderColor: c.line }, !wide && shadow]}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="triangle" size={16} color="#fff" />
      </View>
      <Text style={{ flex: 1, color: c.muted, fontSize: 16 }} numberOfLines={1}>
        {lang === 'bn' ? 'পাহাড়, আশ্রয় বা স্থান খুঁজুন' : 'Search hills, shelters, places'}
      </Text>
      <Pressable onPress={() => updateSettings({ lang: lang === 'en' ? 'bn' : 'en' })} accessibilityLabel={t('language')} hitSlop={6}
        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.chipOn, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.chipOnText, fontWeight: '800', fontSize: 12 }}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
      </Pressable>
    </Pressable>
  );

  const chip = (key: string, label: string, icon: IconName, on: boolean, onPress: () => void, color?: string, count?: number) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 13, borderRadius: 17,
        backgroundColor: on ? (c.dark ? '#1C2A3D' : '#E8F0FE') : c.elevated, borderWidth: 1, borderColor: on ? BLUE : c.dark ? c.line : 'transparent' }, shadowSoft]}>
      <Ionicons name={icon} size={15} color={color ?? (on ? BLUE : c.inkSoft)} />
      <Text style={{ color: on ? (c.dark ? '#8AB4F8' : BLUE) : c.ink, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      {count != null && <Text style={{ color: c.muted, fontWeight: '700', fontSize: 12 }}>{digits(lang, count)}</Text>}
    </Pressable>
  );

  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: wide ? 0 : 16, paddingVertical: 4 }}>
      {chip('d', t('DANGER'), 'warning', levelFilter === 'DANGER', () => toggleLevel('DANGER'), statusColor.DANGER, summary.counts.DANGER)}
      {chip('w', t('WATCH'), 'eye', levelFilter === 'WATCH', () => toggleLevel('WATCH'), statusColor.WATCH, summary.counts.WATCH)}
      {chip('s', t('SAFE'), 'shield-checkmark', levelFilter === 'SAFE', () => toggleLevel('SAFE'), statusColor.SAFE, summary.counts.SAFE)}
      {chip('sh', t('tabShelters'), 'home', settings.showShelters, () => updateSettings({ showShelters: !settings.showShelters }), c.info)}
      {chip('rp', t('reportsLayer'), 'megaphone', settings.showReports, () => updateSettings({ showReports: !settings.showReports }), c.watch)}
      {chip('soil', t('layerSoil'), 'water', settings.layer === 'soil', () => updateSettings({ layer: settings.layer === 'soil' ? 'risk' : 'soil' }))}
      {chip('creep', 'NISAR', 'planet', settings.layer === 'creep', () => updateSettings({ layer: settings.layer === 'creep' ? 'risk' : 'creep' }))}
      {chip('rep', t('replay'), 'time', replay, replay ? closeReplay : openReplay)}
      {chip('sv', lang === 'bn' ? 'সংরক্ষিত' : 'Saved', 'bookmark', savedOpen, () => { setSavedOpen((v) => !v); setSel(null); setSnap(1); })}
      {chip('dist', district ? districtName(lang, district) : t('allDistricts'), 'business', !!district, () => setDistrictOpen(true))}
    </ScrollView>
  );

  const onlineNodes = hills.filter((h) => h.latest_reading).length;
  const livePill = (
    <Pressable onPress={() => nav.navigate('AboutModel')} accessibilityRole="button" accessibilityLabel={t('moreModel')}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: c.elevated }, shadowSoft]}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: source === 'live' ? c.safe : source === 'cache' ? c.watch : c.info }} />
      <Text style={{ color: c.ink, fontWeight: '700', fontSize: 12 }}>
        {source === 'live' ? (lang === 'bn' ? 'লাইভ' : 'LIVE') : source === 'cache' ? (lang === 'bn' ? 'অফলাইন' : 'OFFLINE') : (lang === 'bn' ? 'ডেমো' : 'DEMO')}
        {' · '}{digits(lang, onlineNodes)} {lang === 'bn' ? 'সেন্সর' : 'sensors'}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={c.muted} />
    </Pressable>
  );

  const roundBtn = (icon: IconName, label: string, onPress: () => void, color?: string, busy?: boolean) => (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityRole="button"
      style={[{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center',
        borderWidth: c.dark ? 1 : 0, borderColor: c.line }, shadowSoft]}>
      {busy ? <ActivityIndicator size="small" /> : <Ionicons name={icon} size={21} color={color ?? c.ink} />}
    </Pressable>
  );

  const dangerBanner = nearbyDanger && !nearbyDismissed && !replay && (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.danger, borderRadius: radius.lg, padding: 12 }, shadow]}>
      <Ionicons name="warning" size={22} color="#fff" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{t('dangerNearby')}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 12 }} numberOfLines={1}>
          {hillName(lang, nearbyDanger.h.name)} · {digits(lang, nearbyDanger.km.toFixed(1))} {t('kmFromYou')}
        </Text>
      </View>
      <Pressable onPress={directionsFab} style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 }}>
        <Text style={{ color: c.danger, fontWeight: '800', fontSize: 13 }}>{t('goToShelter')}</Text>
      </Pressable>
      <Pressable onPress={() => setNearbyDismissed(true)} hitSlop={10}><Ionicons name="close" size={18} color="#fff" /></Pressable>
    </View>
  );

  const sheetContent = selHill ? <HillPlace hill={selHill} onClose={() => selectHill(null)} />
    : selShelter ? <ShelterPlace shelter={selShelter} onClose={() => { setSel(null); setSnap(0); }} onPickHill={(h) => selectHill(h.hill_id)} />
    : sel?.kind === 'place' ? <GeoPlace place={sel.place} onClose={() => { setSel(null); setSnap(0); }} onPickHill={(h) => selectHill(h.hill_id)} />
    : <ExploreContent onPickHill={(h) => selectHill(h.hill_id)} onReplay={openReplay} savedOpen={savedOpen}
        onFilterLevel={toggleLevel}
        onSaved={(s) => {
          const [kind, id] = s.key.split(':');
          if (kind === 'hill') selectHill(Number(id));
          else if (kind === 'shelter') { setSel({ kind: 'shelter', id: Number(id) }); fly(s.lat, s.lon, 14); }
          else { fly(s.lat, s.lon, 13); }
          setSnap(0);
        }} />;

  const map = (
    <RiskMap
      hills={replay ? hills : visibleHills}
      shelters={settings.showShelters ? shelters : []}
      reports={settings.showReports ? reports : []}
      selectedId={selHill?.hill_id ?? null}
      onSelect={(id) => selectHill(id)}
      onSelectShelter={(s) => { setSel({ kind: 'shelter', id: s.shelter_id }); setSnap(0); fly(s.lat, s.lon, 14); }}
      user={location}
      focus={focus}
      bottomInset={wide ? 0 : heights[snap] + tabSpace}
      mapType={settings.mapType}
      layer={replay ? 'risk' : settings.layer}
      pitch3d={settings.pitch3d}
      overrides={overrides}
      pin={pin}
    />
  );

  const districtMenu = (
    <Modal transparent visible={districtOpen} animationType="fade" onRequestClose={() => setDistrictOpen(false)}>
      <Pressable style={{ flex: 1, backgroundColor: c.backdrop, justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setDistrictOpen(false)}>
        <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, paddingVertical: 6, width: '100%', maxWidth: 360 }, shadow]}>
          {[null, ...Array.from(new Set(hills.map((h) => h.district))).sort()].map((d) => (
            <Pressable key={d ?? 'all'} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 }}
              onPress={() => { setDistrict(d); setDistrictOpen(false); }}>
              <T style={[font.body, district === d && { fontWeight: '700' }]}>{d ? districtName(lang, d) : t('allDistricts')}</T>
              {district === d && <Ionicons name="checkmark" size={18} color={c.ink} />}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  const replayBar = timeline && (
    <ReplayBar timeline={timeline} index={tIndex} onIndex={setTIndex} playing={playing} onPlay={setPlaying} onClose={closeReplay} />
  );

  /* ------------------------------------------------------------ desktop / tablet landscape */
  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
        <View style={{ width: 420, backgroundColor: c.surface, borderRightWidth: 1, borderColor: c.line, paddingTop: insets.top }}>
          {searchOpen ? (
            <SearchOverlay inline initial="" onPick={onPick} onClose={() => setSearchOpen(false)} />
          ) : (
            <>
              <View style={{ padding: space.lg, paddingBottom: space.sm }}>{searchPill}</View>
              {dangerBanner && <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>{dangerBanner}</View>}
              <ScrollView key={sel ? `${sel.kind}:${sel.kind === 'place' ? sel.place.id : sel.id}` : 'explore'} contentContainerStyle={{ paddingTop: space.sm, paddingBottom: 40 }}>{sheetContent}</ScrollView>
            </>
          )}
        </View>
        <View style={{ flex: 1 }}>
          {map}
          <View style={{ position: 'absolute', top: insets.top + 14, left: 14, right: 14, gap: 10 }} pointerEvents="box-none">
            {chips}
            <View style={{ flexDirection: 'row', gap: 8 }} pointerEvents="box-none">{livePill}</View>
          </View>
          <View style={{ position: 'absolute', top: insets.top + 110, right: 14, gap: 10 }}>
            {roundBtn('layers', t('layers'), () => setLayersOpen(true))}
            {roundBtn(c.dark ? 'sunny' : 'moon', t('theme'), () => updateSettings({ theme: c.dark ? 'light' : 'dark' }))}
          </View>
          <View style={{ position: 'absolute', bottom: 28, right: 64, gap: 10, alignItems: 'flex-end' }}>
            {roundBtn('locate', t('nearMe'), nearMe, BLUE)}
            <DirectionsFab onPress={directionsFab} />
          </View>
          {replayBar && <View style={{ position: 'absolute', bottom: 24, left: 24, width: 460 }}>{replayBar}</View>}
        </View>
        {districtMenu}
        <LayerSheet visible={layersOpen} onClose={() => setLayersOpen(false)} />
      </View>
    );
  }

  /* ------------------------------------------------------------ phone / tablet portrait */
  const fabBottom = Animated.add(sheetH, tabSpace + 12);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {map}

      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: insets.top + 8, gap: 10 }} pointerEvents="box-none">
        <View style={{ paddingHorizontal: 16, maxWidth: 640 }}>{searchPill}</View>
        {chips}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }} pointerEvents="box-none">
          {livePill}
          <View style={{ gap: 10 }}>
            {roundBtn('layers', t('layers'), () => setLayersOpen(true))}
            {roundBtn(c.dark ? 'sunny' : 'moon', t('theme'), () => updateSettings({ theme: c.dark ? 'light' : 'dark' }))}
          </View>
        </View>
        {dangerBanner && <View style={{ paddingHorizontal: 16 }}>{dangerBanner}</View>}
      </View>

      {!replay && (
        <Animated.View style={{ position: 'absolute', right: 16, bottom: fabBottom, gap: 12, alignItems: 'flex-end' }}>
          {roundBtn('locate', t('nearMe'), nearMe, BLUE)}
          <DirectionsFab onPress={directionsFab} />
        </Animated.View>
      )}

      {replay ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: tabSpace + 8 }}>{replayBar}</View>
      ) : (
        <BottomSheet snap={snap} onSnap={setSnap} heights={heights} height={sheetH} bottom={tabSpace}
          contentKey={sel ? `${sel.kind}:${sel.kind === 'place' ? sel.place.id : sel.id}` : 'explore'}>
          {sheetContent}
        </BottomSheet>
      )}

      {replayLoading && (
        <View style={{ position: 'absolute', top: '45%', alignSelf: 'center', padding: 16, borderRadius: 16, backgroundColor: c.surface }}>
          <ActivityIndicator />
        </View>
      )}
      {searchOpen && <SearchOverlay initial="" onPick={onPick} onClose={() => setSearchOpen(false)} />}
      {districtMenu}
      <LayerSheet visible={layersOpen} onClose={() => setLayersOpen(false)} />
    </View>
  );
}

function DirectionsFab({ onPress }: { onPress: () => void }) {
  const { lang } = useApp();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Directions to nearest shelter"
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 18, borderRadius: 18, backgroundColor: BLUE }, shadow]}>
      <MaterialCommunityIcons name="directions" size={26} color="#fff" />
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{lang === 'bn' ? 'আশ্রয়ের পথ' : 'Shelter'}</Text>
    </Pressable>
  );
}
