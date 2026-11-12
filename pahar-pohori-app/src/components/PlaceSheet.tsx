/**
 * Content of the map's bottom sheet / desktop side panel, in a familiar maps-app layout:
 * title → status line → action pills (Directions, Start, Call, Save, Share, Listen) → tabs.
 */
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { districtName, facilityKey, hazardKey, hillName, severityKey, translateReason, type Lang } from '../i18n';
import type { RootStack } from '../navigation';
import { useSpeaker } from '../services/speech';
import { rainLevel, useRainForecast } from '../services/weather';
import { useApp } from '../store';
import { font, radius, space, statusColor, useTheme } from '../theme';
import type { GeoResult, Hill, Level, Shelter } from '../types';
import { callNumber, guidanceFor, haversineKm, mapsLink, nearestShelters, pct, sortByRisk, timeAgo } from '../utils';
import { HillRow } from './HillCard';
import RainChart from './RainChart';
import { StatusBadge, T, digits, type IconName } from './ui';

const L = (lang: Lang, en: string, bn: string) => (lang === 'bn' ? bn : en);
type Nav = NativeStackNavigationProp<RootStack>;

/* ---------------- shared bits ---------------- */
export function ActionPill({ icon, label, onPress, primary, active }: {
  icon: IconName; label: string; onPress: () => void; primary?: boolean; active?: boolean;
}) {
  const c = useTheme();
  const blue = '#1A73E8';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingHorizontal: 16, borderRadius: 999,
        backgroundColor: primary ? blue : c.dark ? '#1C2A3D' : '#E8F0FE',
      }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={17} color={primary ? '#fff' : c.dark ? '#8AB4F8' : blue} />
      <Text style={{ color: primary ? '#fff' : c.dark ? '#8AB4F8' : blue, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      {active && <Ionicons name="checkmark" size={14} color={primary ? '#fff' : blue} />}
    </Pressable>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.xl, paddingVertical: space.md }}>
      {children}
    </ScrollView>
  );
}

function Tabs<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const c = useTheme();
  const blue = c.dark ? '#8AB4F8' : '#1A73E8';
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line }}>
      {tabs.map((tb) => {
        const on = tb.key === value;
        return (
          <Pressable key={tb.key} onPress={() => onChange(tb.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderColor: on ? blue : 'transparent' }}>
            <Text style={{ color: on ? blue : c.muted, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{tb.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Header({ title, sub, onClose, right }: { title: string; sub: React.ReactNode; onClose: () => void; right?: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: space.xl, gap: 10 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <T style={[font.h1, { fontSize: 23 }]} numberOfLines={2}>{title}</T>
        {sub}
      </View>
      {right}
      <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"
        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={20} color={c.inkSoft} />
      </Pressable>
    </View>
  );
}

function InfoRow({ icon, color, title, sub, onPress, right }: {
  icon: IconName; color?: string; title: string; sub?: string; onPress?: () => void; right?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: space.xl, paddingVertical: 12 }, pressed && { backgroundColor: c.surfaceAlt }]}>
      <Ionicons name={icon} size={20} color={color ?? (c.dark ? '#8AB4F8' : '#1A73E8')} />
      <View style={{ flex: 1 }}>
        <T style={font.body}>{title}</T>
        {!!sub && <T muted style={font.small}>{sub}</T>}
      </View>
      {right}
    </Pressable>
  );
}

const levelLine = (lang: Lang, t: (k: never) => string, level: Level, p: number | null) =>
  `${p == null ? '—' : digits(lang, Math.round(p * 100)) + '%'} ${L(lang, 'chance in 24 h', 'সম্ভাবনা, ২৪ ঘণ্টায়')}`;

/* ====================================================================== */
/*  HILL                                                                   */
/* ====================================================================== */
export function HillPlace({ hill, onClose }: { hill: Hill; onClose: () => void }) {
  const nav = useNavigation<Nav>();
  const { t, lang, shelters, reports, location, isSaved, toggleSaved } = useApp();
  const c = useTheme();
  const [tab, setTab] = useState<'overview' | 'sensors' | 'rain' | 'reports'>('overview');
  const speaker = useSpeaker();
  const { data: rain, status: rainStatus } = useRainForecast(hill.lat, hill.lon);
  const st = hill.status;
  const g = guidanceFor(st.level);
  const near = nearestShelters(hill.lat, hill.lon, shelters, 3);
  const key = `hill:${hill.hill_id}`;
  const saved = isSaved(key);
  const hillReports = reports.filter((r) => r.hill_id === hill.hill_id);
  const r = hill.latest_reading;

  const directions = (live = false) => {
    const from = location ?? { lat: hill.lat, lon: hill.lon };
    const s = nearestShelters(from.lat, from.lon, shelters, 1)[0];
    if (s) nav.navigate('Route', { shelterId: s.shelter_id, fromHillId: location ? undefined : hill.hill_id, live });
  };
  const share = () => Share.share({ message: `${hillName(lang, hill.name)}: ${t(st.level)} — ${pct(st.probability)}. ${t(g.headline)}. ${mapsLink(hill.lat, hill.lon)}` }).catch(() => undefined);
  const speech = `${hillName(lang, hill.name)}. ${t(st.level)}. ${t('riskChance')} ${pct(st.probability)}. ${t(g.headline)}. ${g.items.map((k) => t(k)).join('. ')}`;

  return (
    <View>
      <Header title={hillName(lang, hill.name)} onClose={onClose} sub={
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ color: statusColor[st.level], fontWeight: '800', fontSize: 15 }}>{levelLine(lang, t as never, st.level, st.probability)}</Text>
            <StatusBadge level={st.level} size="sm" />
          </View>
          <T muted style={font.small}>
            {L(lang, 'Hill', 'পাহাড়')} · {districtName(lang, hill.district)} · {t('slope')} {digits(lang, hill.slope_deg)}° · {t('updated')} {timeAgo(lang, t, st.updated_at)}
          </T>
        </View>
      } />

      <Actions>
        <ActionPill primary icon="navigate" label={L(lang, 'Directions to shelter', 'আশ্রয়ের পথ')} onPress={() => directions(false)} />
        <ActionPill icon="navigate-circle" label={L(lang, 'Start', 'শুরু')} onPress={() => directions(true)} />
        <ActionPill icon={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? L(lang, 'Saved', 'সংরক্ষিত') : L(lang, 'Save', 'সংরক্ষণ')}
          onPress={() => toggleSaved({ key, kind: 'hill', id: hill.hill_id, name: hill.name, lat: hill.lat, lon: hill.lon })} />
        <ActionPill icon={speaker.speaking ? 'stop' : 'volume-high'} label={speaker.speaking ? t('stop') : t('listen')} onPress={() => speaker.toggle(speech, lang)} />
        <ActionPill icon="share-social" label={t('share')} onPress={share} />
        <ActionPill icon="megaphone" label={L(lang, 'Report', 'রিপোর্ট')} onPress={() => nav.navigate('Report', { hillId: hill.hill_id })} />
      </Actions>

      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'overview', label: L(lang, 'Overview', 'সারসংক্ষেপ') },
        { key: 'sensors', label: L(lang, 'Sensors', 'সেন্সর') },
        { key: 'rain', label: L(lang, 'Rain', 'বৃষ্টি') },
        { key: 'reports', label: `${L(lang, 'Reports', 'রিপোর্ট')}${hillReports.length ? ` (${digits(lang, hillReports.length)})` : ''}` },
      ]} />

      {tab === 'overview' && (
        <View style={{ paddingTop: space.md }}>
          <View style={{ marginHorizontal: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.tint[st.level], gap: 8 }}>
            <T style={[font.h3, { color: statusColor[st.level] }]}>{t(g.headline)}</T>
            {g.items.map((k, i) => (
              <View key={k} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ color: statusColor[st.level], fontWeight: '800' }}>{digits(lang, i + 1)}.</Text>
                <T style={[font.small, { flex: 1 }]}>{t(k)}</T>
              </View>
            ))}
          </View>
          {st.reasons.slice(0, 4).map((x) => (
            <InfoRow key={x} icon={/disagree/.test(x) ? 'alert-circle' : 'information-circle'} color={/disagree/.test(x) ? c.watch : statusColor[st.level]} title={translateReason(lang, x)} />
          ))}
          <InfoRow icon="planet" title={t(st.verified_by_nisar ? 'verifiedByNisar' : 'notVerified')}
            sub={hill.nisar ? `NISAR ${hill.nisar.nisar_date} · ${Math.round(hill.nisar.los_velocity_mm_month)} mm/mo` : undefined} />
          {rain && (
            <InfoRow icon="rainy" color={rain.next24 >= 44 ? c.danger : undefined} title={`${digits(lang, Math.round(rain.next24))} mm ${L(lang, 'rain in next 24 h', 'বৃষ্টি, আগামী ২৪ ঘণ্টায়')}`}
              sub={t(({ none: 'rainNone', light: 'rainLight', moderate: 'rainModerate', heavy: 'rainHeavy', veryHeavy: 'rainVeryHeavy' } as const)[rainLevel(rain.next24)])}
              onPress={() => setTab('rain')} />
          )}
          {near.map((s) => (
            <InfoRow key={s.shelter_id} icon="home" title={lang === 'bn' ? s.name_bn : s.name}
              sub={`${digits(lang, s.distance_km!.toFixed(1))} km · ${digits(lang, s.capacity)} ${t('capacity')}`}
              onPress={() => nav.navigate('Route', { shelterId: s.shelter_id, fromHillId: location ? undefined : hill.hill_id })}
              right={<Ionicons name="navigate" size={18} color={c.dark ? '#8AB4F8' : '#1A73E8'} />} />
          ))}
          <InfoRow icon="call" color={c.danger} title={L(lang, 'Emergency 999', 'জরুরি ৯৯৯')} onPress={() => callNumber('999')} />
          <InfoRow icon="open-outline" title={L(lang, 'Full details, 7-day charts & satellite data', 'বিস্তারিত, ৭ দিনের চার্ট ও উপগ্রহ তথ্য')}
            onPress={() => nav.navigate('HillDetail', { hillId: hill.hill_id })} right={<Ionicons name="chevron-forward" size={18} color={c.muted} />} />
        </View>
      )}

      {tab === 'sensors' && (
        <View style={{ padding: space.xl, gap: 10 }}>
          <T muted style={font.small}>{hill.device_id} · {r ? timeAgo(lang, t, r.ts) : '—'}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {r && ([
              ['water', t('soilMoisture'), r.soil_moisture.toFixed(3), 'm³/m³', r.soil_moisture >= 0.32],
              ['pulse', t('acceleration'), r.acceleration.toFixed(3), 'g', r.acceleration >= 0.02],
              ['cloud', t('humidity'), r.humidity.toFixed(0), '%', false],
              ['thermometer', t('temperature'), r.temperature.toFixed(1), '°C', false],
              ['flag', t('wind'), r.wind_speed.toFixed(1), 'm/s', false],
            ] as [IconName, string, string, string, boolean][]).map(([ic, lab, v, u, hot]) => (
              <View key={lab} style={{ width: '47%', flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: hot ? c.tint.DANGER : c.surfaceAlt, gap: 4 }}>
                <Ionicons name={ic} size={16} color={hot ? c.danger : c.info} />
                <Text style={{ color: hot ? c.danger : c.ink, fontSize: 20, fontWeight: '700' }}>{v}<Text style={{ fontSize: 12, color: c.muted }}> {u}</Text></Text>
                <T muted style={font.tiny}>{lab}</T>
              </View>
            ))}
          </View>
          <Pressable onPress={() => nav.navigate('HillDetail', { hillId: hill.hill_id })}>
            <Text style={{ color: c.dark ? '#8AB4F8' : '#1A73E8', fontWeight: '600' }}>{L(lang, 'See 7-day charts →', '৭ দিনের চার্ট দেখুন →')}</Text>
          </Pressable>
        </View>
      )}

      {tab === 'rain' && (
        <View style={{ padding: space.xl, gap: 10 }}>
          {rain ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([[t('past48h'), rain.past48], [t('next24h'), rain.next24], [t('next72h'), rain.next72]] as [string, number][]).map(([lab, v]) => (
                  <View key={lab} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: c.surfaceAlt }}>
                    <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>{digits(lang, Math.round(v))}<Text style={{ fontSize: 11, color: c.muted }}> mm</Text></Text>
                    <T muted style={font.tiny}>{lab}</T>
                  </View>
                ))}
              </View>
              <RainChart times={rain.times} rain={rain.rain} nowIndex={rain.nowIndex} locale={lang === 'bn' ? 'bn-BD' : 'en-GB'} />
              <T muted style={font.tiny}>{t('forecastSource')}</T>
            </>
          ) : rainStatus === 'loading' ? <ActivityIndicator /> : <T muted>{t('forecastUnavailable')}</T>}
        </View>
      )}

      {tab === 'reports' && (
        <View style={{ paddingTop: space.sm }}>
          {hillReports.length === 0 && <T muted style={[font.small, { padding: space.xl }]}>{t('noReports')}</T>}
          {hillReports.slice(0, 8).map((rp) => (
            <InfoRow key={rp.id} icon="megaphone" color={rp.severity === 'high' ? c.danger : c.watch}
              title={`${t(hazardKey(rp.hazard_type))} · ${t(severityKey(rp.severity))}`} sub={`${rp.description ? rp.description + ' · ' : ''}${timeAgo(lang, t, rp.created_at)}`} />
          ))}
          <InfoRow icon="add-circle" title={t('reportHazardHere')} onPress={() => nav.navigate('Report', { hillId: hill.hill_id })} />
        </View>
      )}
    </View>
  );
}

/* ====================================================================== */
/*  SHELTER                                                                */
/* ====================================================================== */
export function ShelterPlace({ shelter, onClose, onPickHill }: { shelter: Shelter; onClose: () => void; onPickHill: (h: Hill) => void }) {
  const nav = useNavigation<Nav>();
  const { t, lang, hills, location, isSaved, toggleSaved } = useApp();
  const c = useTheme();
  const key = `shelter:${shelter.shelter_id}`;
  const saved = isSaved(key);
  const dist = location ? haversineKm(location.lat, location.lon, shelter.lat, shelter.lon) : null;
  const nearHills = hills.map((h) => ({ h, km: haversineKm(shelter.lat, shelter.lon, h.lat, h.lon) })).sort((a, b) => a.km - b.km).slice(0, 3);
  const name = lang === 'bn' ? shelter.name_bn : shelter.name;
  return (
    <View>
      <Header title={name} onClose={onClose} sub={
        <T muted style={font.small}>
          {L(lang, 'Emergency shelter', 'জরুরি আশ্রয়কেন্দ্র')} · {districtName(lang, shelter.district)} · {digits(lang, shelter.capacity)} {t('capacity')}
          {dist != null ? ` · ${digits(lang, dist.toFixed(1))} km` : ''}
        </T>
      } />
      <Actions>
        <ActionPill primary icon="navigate" label={L(lang, 'Directions', 'পথ')} onPress={() => nav.navigate('Route', { shelterId: shelter.shelter_id })} />
        <ActionPill icon="navigate-circle" label={L(lang, 'Start', 'শুরু')} onPress={() => nav.navigate('Route', { shelterId: shelter.shelter_id, live: true })} />
        <ActionPill icon="call" label={`${t('call')} ${digits(lang, shelter.phone)}`} onPress={() => callNumber(shelter.phone)} />
        <ActionPill icon={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? L(lang, 'Saved', 'সংরক্ষিত') : L(lang, 'Save', 'সংরক্ষণ')}
          onPress={() => toggleSaved({ key, kind: 'shelter', id: shelter.shelter_id, name: shelter.name, lat: shelter.lat, lon: shelter.lon })} />
        <ActionPill icon="share-social" label={t('share')} onPress={() => Share.share({ message: `${name}: ${mapsLink(shelter.lat, shelter.lon)}` }).catch(() => undefined)} />
      </Actions>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: space.xl, paddingBottom: space.md }}>
        {shelter.facilities.map((f) => (
          <View key={f} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: c.line }}>
            <Text style={{ color: c.inkSoft, fontSize: 12 }}>✓ {t(facilityKey(f))}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: c.line }} />
      <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700', paddingHorizontal: space.xl, paddingTop: space.md, textTransform: 'uppercase' }}>
        {L(lang, 'Hills near this shelter', 'এই আশ্রয়ের কাছের পাহাড়')}
      </Text>
      {nearHills.map(({ h, km }) => (
        <InfoRow key={h.hill_id} icon="triangle" color={statusColor[h.status.level]} title={hillName(lang, h.name)}
          sub={`${digits(lang, km.toFixed(1))} km · ${t(h.status.level)} · ${pct(h.status.probability)}`} onPress={() => onPickHill(h)} />
      ))}
      <InfoRow icon="location" title={`${shelter.lat.toFixed(5)}, ${shelter.lon.toFixed(5)}`} />
      {shelter.source === 'demo' && <T muted style={[font.tiny, { paddingHorizontal: space.xl }]}>{t('demoShelterNote')}</T>}
    </View>
  );
}

/* ====================================================================== */
/*  SEARCHED PLACE                                                         */
/* ====================================================================== */
export function GeoPlace({ place, onClose, onPickHill }: { place: GeoResult; onClose: () => void; onPickHill: (h: Hill) => void }) {
  const nav = useNavigation<Nav>();
  const { t, lang, hills, shelters, isSaved, toggleSaved } = useApp();
  const c = useTheme();
  const key = `place:${place.id}`;
  const nearHills = hills.map((h) => ({ h, km: haversineKm(place.lat, place.lon, h.lat, h.lon) })).sort((a, b) => a.km - b.km).slice(0, 3);
  const shelter = nearestShelters(place.lat, place.lon, shelters, 1)[0];
  const worst = nearHills.find((x) => x.km < 10 && x.h.status.level === 'DANGER');
  return (
    <View>
      <Header title={place.name} onClose={onClose} sub={<T muted style={font.small} numberOfLines={2}>{place.address}</T>} />
      <Actions>
        {shelter && <ActionPill primary icon="navigate" label={L(lang, 'Nearest shelter', 'নিকটতম আশ্রয়')}
          onPress={() => nav.navigate('Route', { shelterId: shelter.shelter_id, fromLat: place.lat, fromLon: place.lon, fromLabel: place.name })} />}
        <ActionPill icon={isSaved(key) ? 'bookmark' : 'bookmark-outline'} label={isSaved(key) ? L(lang, 'Saved', 'সংরক্ষিত') : L(lang, 'Save', 'সংরক্ষণ')}
          onPress={() => toggleSaved({ key, kind: 'place', id: place.id, name: place.name, lat: place.lat, lon: place.lon })} />
        <ActionPill icon="share-social" label={t('share')} onPress={() => Share.share({ message: `${place.name}: ${mapsLink(place.lat, place.lon)}` }).catch(() => undefined)} />
      </Actions>
      <View style={{ marginHorizontal: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: worst ? c.tint.DANGER : c.tint.SAFE, gap: 4 }}>
        <T style={[font.h3, { color: worst ? c.danger : c.safe }]}>
          {worst ? L(lang, `Danger hill ${worst.km.toFixed(1)} km away`, `${digits(lang, worst.km.toFixed(1))} কিমি দূরে বিপদজনক পাহাড়`) : L(lang, 'No Danger hill within 10 km', '১০ কিমির মধ্যে কোনো বিপদজনক পাহাড় নেই')}
        </T>
        <T muted style={font.small}>{L(lang, 'Safety check for this place, from the monitored hills nearby.', 'কাছের পর্যবেক্ষিত পাহাড় থেকে এই স্থানের নিরাপত্তা যাচাই।')}</T>
      </View>
      {nearHills.map(({ h, km }) => (
        <InfoRow key={h.hill_id} icon="triangle" color={statusColor[h.status.level]} title={hillName(lang, h.name)}
          sub={`${digits(lang, km.toFixed(1))} km · ${t(h.status.level)} · ${pct(h.status.probability)}`} onPress={() => onPickHill(h)} />
      ))}
      {shelter && <InfoRow icon="home" title={lang === 'bn' ? shelter.name_bn : shelter.name} sub={`${digits(lang, shelter.distance_km!.toFixed(1))} km`} />}
    </View>
  );
}

/* ====================================================================== */
/*  EXPLORE (nothing selected)                                             */
/* ====================================================================== */
export function ExploreContent({ onPickHill, onReplay, onSaved, savedOpen }: {
  onPickHill: (h: Hill) => void; onReplay: () => void; onSaved: (p: { lat: number; lon: number; key: string }) => void; savedOpen?: boolean;
}) {
  const nav = useNavigation<Nav>();
  const { t, lang, hills, summary, settings, source } = useApp();
  const c = useTheme();
  const quick: { icon: IconName; label: string; color: string; onPress: () => void }[] = [
    { icon: 'call', label: 'SOS 999', color: c.danger, onPress: () => nav.navigate('Tabs', { screen: 'SOS' }) },
    { icon: 'home', label: t('tabShelters'), color: c.info, onPress: () => nav.navigate('Tabs', { screen: 'Shelters' }) },
    { icon: 'pulse', label: L(lang, 'Live system', 'লাইভ সিস্টেম'), color: c.safe, onPress: () => nav.navigate('AboutModel') },
    { icon: 'time', label: t('replay'), color: c.violet, onPress: onReplay },
    { icon: 'megaphone', label: L(lang, 'Report', 'রিপোর্ট'), color: c.watch, onPress: () => nav.navigate('Report') },
    { icon: 'book', label: L(lang, 'Safety', 'নিরাপত্তা'), color: c.teal, onPress: () => nav.navigate('SafetyGuide') },
  ];
  return (
    <View>
      <View style={{ paddingHorizontal: space.xl, gap: 2 }}>
        <T style={[font.h2]}>{L(lang, 'Chittagong Hill Tracts', 'পার্বত্য চট্টগ্রাম')}</T>
        <T muted style={font.small}>
          {digits(lang, summary.total_hills)} {t('hillsMonitored')} · {source === 'live' ? L(lang, 'live data', 'সরাসরি তথ্য') : source === 'cache' ? L(lang, 'offline copy', 'অফলাইন কপি') : L(lang, 'demo data', 'ডেমো তথ্য')}
        </T>
      </View>
      <View style={{ flexDirection: 'row', marginHorizontal: space.xl, marginTop: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line }}>
        {(['DANGER', 'WATCH', 'SAFE'] as Level[]).map((l, i) => (
          <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i ? 1 : 0, borderColor: c.line }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: statusColor[l] }}>{digits(lang, summary.counts[l] ?? 0)}</Text>
            <Text style={{ fontSize: 11, color: c.muted }}>{t(l)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.md, paddingTop: space.md }}>
        {quick.map((q) => (
          <Pressable key={q.label} onPress={q.onPress} style={{ width: '33.33%', alignItems: 'center', gap: 6, paddingVertical: 10 }} accessibilityRole="button">
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: `${q.color}1F`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={q.icon} size={22} color={q.color} />
            </View>
            <Text style={{ color: c.inkSoft, fontSize: 12, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {(savedOpen || settings.saved.length > 0) && (
        <>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700', paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 4, textTransform: 'uppercase' }}>
            {L(lang, 'Saved', 'সংরক্ষিত')}
          </Text>
          {settings.saved.length === 0 && <T muted style={[font.small, { paddingHorizontal: space.xl }]}>{L(lang, 'Tap Save on any hill, shelter or place.', 'যেকোনো পাহাড়, আশ্রয় বা স্থানে "সংরক্ষণ" চাপুন।')}</T>}
          {settings.saved.map((s) => {
            const h = s.kind === 'hill' ? hills.find((x) => x.hill_id === s.id) : undefined;
            return (
              <InfoRow key={s.key} icon={s.kind === 'hill' ? 'triangle' : s.kind === 'shelter' ? 'home' : 'location'}
                color={h ? statusColor[h.status.level] : undefined}
                title={s.kind === 'hill' ? hillName(lang, s.name) : s.name}
                sub={h ? `${t(h.status.level)} · ${pct(h.status.probability)}` : undefined}
                onPress={() => onSaved({ lat: s.lat, lon: s.lon, key: s.key })} />
            );
          })}
        </>
      )}

      <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700', paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 8, textTransform: 'uppercase' }}>
        {L(lang, 'Hills by risk', 'ঝুঁকি অনুযায়ী পাহাড়')}
      </Text>
      <View style={{ paddingHorizontal: space.lg, gap: 8 }}>
        {sortByRisk(hills).map((h) => <HillRow key={h.hill_id} hill={h} onPress={() => onPickHill(h)} />)}
      </View>
    </View>
  );
}
