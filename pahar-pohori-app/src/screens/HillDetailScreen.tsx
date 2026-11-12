import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, Text, View } from 'react-native';
import LineChart from '../components/LineChart';
import RainChart from '../components/RainChart';
import { ShelterCard } from '../components/ShelterCard';
import {
  Button, Card, Chip, EmptyState, IconBtn, ListenButton, ProbabilityRing, Screen, SectionTitle, StatusBadge, T, digits,
  useResponsive, type IconName,
} from '../components/ui';
import { useHillDetail } from '../hooks/useHillDetail';
import { districtName, hazardKey, hillName, severityKey, translateReason, type StringKey } from '../i18n';
import type { RootStack } from '../navigation';
import { useSpeaker } from '../services/speech';
import { rainLevel, useRainForecast, type RainLevel } from '../services/weather';
import { useApp } from '../store';
import { font, makeStyles, radius, space, statusColor, useTheme } from '../theme';
import type { Reading } from '../types';
import { formatDateTime, guidanceFor, mapsLink, pct, timeAgo } from '../utils';

type Props = NativeStackScreenProps<RootStack, 'HillDetail'>;

type MetricKey = 'soil_moisture' | 'acceleration' | 'humidity' | 'temperature' | 'wind_speed';
const METRICS: { key: MetricKey; label: StringKey; icon: IconName; unit: string; dec: number; threshold?: number; color: string }[] = [
  { key: 'soil_moisture', label: 'soilMoisture', icon: 'water', unit: 'm³/m³', dec: 2, threshold: 0.32, color: '#2F80ED' },
  { key: 'acceleration', label: 'acceleration', icon: 'pulse', unit: 'g', dec: 3, threshold: 0.02, color: '#E5484D' },
  { key: 'humidity', label: 'humidity', icon: 'cloud', unit: '%', dec: 0, color: '#7C5CFF' },
  { key: 'temperature', label: 'temperature', icon: 'thermometer', unit: '°C', dec: 1, color: '#F2A33A' },
  { key: 'wind_speed', label: 'wind', icon: 'flag', unit: 'm/s', dec: 1, color: '#14A3B8' },
];

const RAIN_KEY: Record<RainLevel, StringKey> = {
  none: 'rainNone', light: 'rainLight', moderate: 'rainModerate', heavy: 'rainHeavy', veryHeavy: 'rainVeryHeavy',
};

export default function HillDetailScreen({ route, navigation }: Props) {
  const { hillId } = route.params;
  const { t, lang, location } = useApp();
  const c = useTheme();
  const s = useStyles();
  const { isTablet, cols } = useResponsive();
  const { detail, history, near, reports, loading } = useHillDetail(hillId);
  const { data: rain, status: rainStatus } = useRainForecast(detail?.lat, detail?.lon);
  const speaker = useSpeaker();
  const [metric, setMetric] = useState<MetricKey>('soil_moisture');
  const [tilesW, setTilesW] = useState(0);

  const series = useMemo(() => ({
    values: history.map((r) => r[metric] as number),
    times: history.map((r) => r.ts),
  }), [history, metric]);

  if (loading && !detail) {
    return <Screen back title={t('loading')}><ActivityIndicator style={{ marginTop: 40 }} /></Screen>;
  }
  if (!detail) {
    return <Screen back title={t('error')}><EmptyState icon="alert-circle" title={t('error')} /></Screen>;
  }

  const st = detail.status;
  const g = guidanceFor(st.level);
  const r = detail.latest_reading;
  const m = METRICS.find((x) => x.key === metric)!;
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  const rl = rain ? rainLevel(rain.next24) : null;

  const spoken = [
    `${hillName(lang, detail.name)}. ${t(st.level)}. ${t('riskChance')} ${pct(st.probability)}.`,
    `${t(g.headline)}. ${t(g.body)}`,
    ...g.items.map((k) => t(k)),
    rain && rl ? `${t('rainOutlook')}: ${t(RAIN_KEY[rl])}. ${t('next24h')} ${Math.round(rain.next24)} mm.` : '',
  ].join(' ');

  const share = () => {
    const msg = lang === 'bn'
      ? `${hillName(lang, detail.name)} (${districtName(lang, detail.district)}): ${t(st.level)} — ধসের সম্ভাবনা ${pct(st.probability)}। ${t(g.headline)}। ${mapsLink(detail.lat, detail.lon)}`
      : `${detail.name} (${detail.district}): ${t(st.level)} — landslide chance ${pct(st.probability)}. ${t(g.headline)}. ${mapsLink(detail.lat, detail.lon)}`;
    Share.share({ message: msg }).catch(() => undefined);
  };

  const goShelter = () => {
    if (near[0]) navigation.navigate('Route', { shelterId: near[0].shelter_id, fromHillId: location ? undefined : hillId });
  };

  /* ---------- left column ---------- */
  const hero = (
    <View style={[s.hero, { backgroundColor: c.tint[st.level] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <ProbabilityRing p={st.probability} level={st.level} size={84} />
        <View style={{ flex: 1, gap: 6 }}>
          <StatusBadge level={st.level} size="lg" />
          <T style={[font.small, { color: c.inkSoft }]}>{t('riskChance')}</T>
          <T muted style={font.tiny}>{t('updated')} {timeAgo(lang, t, st.updated_at)}</T>
        </View>
      </View>
      <View style={s.heroChips}>
        <View style={s.heroChip}>
          <Ionicons name={st.verified_by_nisar ? 'planet' : 'planet-outline'} size={14} color={st.verified_by_nisar ? c.info : c.muted} />
          <Text style={s.heroChipText}>{t(st.verified_by_nisar ? 'verifiedByNisar' : 'notVerified')}</Text>
        </View>
        {st.danger_until && (
          <View style={s.heroChip}>
            <Ionicons name="time" size={14} color={c.danger} />
            <Text style={s.heroChipText}>{t('dangerUntil')} {formatDateTime(lang, st.danger_until)}</Text>
          </View>
        )}
        <ListenButton speaking={speaker.speaking} onPress={() => speaker.toggle(spoken, lang)} label={speaker.speaking ? t('stop') : t('listen')} />
      </View>
      {st.level !== 'SAFE' && near[0] && (
        <Button
          label={`${t('nearestShelter')} · ${digits(lang, near[0].distance_km?.toFixed(1) ?? '')} km`}
          icon="navigate"
          variant={st.level === 'DANGER' ? 'danger' : 'primary'}
          onPress={goShelter}
          style={{ marginTop: space.md }}
        />
      )}
    </View>
  );

  const guidance = (
    <>
      <SectionTitle title={t('whatToDo')} />
      <Card style={{ gap: space.md, borderLeftWidth: 4, borderLeftColor: statusColor[st.level] }}>
        <View>
          <T style={font.h3}>{t(g.headline)}</T>
          <T muted style={[font.small, { marginTop: 2 }]}>{t(g.body)}</T>
        </View>
        {g.items.map((k, i) => (
          <View key={k} style={s.step}>
            <View style={[s.stepNum, { backgroundColor: statusColor[st.level] }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{digits(lang, i + 1)}</Text>
            </View>
            <T style={[font.body, { flex: 1 }]}>{t(k)}</T>
          </View>
        ))}
      </Card>
    </>
  );

  const reasons = st.reasons.length > 0 && (
    <>
      <SectionTitle title={t('whyThisStatus')} />
      <Card style={{ gap: 10 }}>
        {st.reasons.map((x) => {
          const warn = /disagree/.test(x);
          return (
            <View key={x} style={s.step}>
              <Ionicons name={warn ? 'alert-circle' : 'ellipse'} size={warn ? 16 : 8}
                color={warn ? c.watch : statusColor[st.level]} style={{ marginTop: warn ? 2 : 6 }} />
              <T style={[font.body, { flex: 1 }]}>{translateReason(lang, x)}</T>
            </View>
          );
        })}
      </Card>
    </>
  );

  const rainCard = (
    <>
      <SectionTitle title={t('rainOutlook')} right={rainStatus === 'cached' ? <T muted style={font.tiny}>{t('sourceCache')}</T> : undefined} />
      <Card style={{ gap: space.md }}>
        {rain && rl ? (
          <>
            <View style={[s.rainBanner, { backgroundColor: rl === 'veryHeavy' || rl === 'heavy' ? c.tint.DANGER : rl === 'moderate' ? c.tint.WATCH : c.infoTint }]}>
              <Ionicons name={rl === 'none' ? 'partly-sunny' : 'rainy'} size={20} color={rl === 'veryHeavy' || rl === 'heavy' ? c.danger : rl === 'moderate' ? c.watch : c.info} />
              <T style={[font.body, { flex: 1, fontWeight: '600' }]}>{t(RAIN_KEY[rl])}</T>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <RainStat label={t('past48h')} value={rain.past48} />
              <RainStat label={t('next24h')} value={rain.next24} hot={rain.next24 >= 44} />
              <RainStat label={t('next72h')} value={rain.next72} hot={rain.next72 >= 89} />
            </View>
            <RainChart times={rain.times} rain={rain.rain} nowIndex={rain.nowIndex} locale={locale} />
            {rain.peakTime && (
              <T muted style={font.small}>
                {t('peakRain')}: {digits(lang, rain.peakHour.toFixed(1))} mm/h · {new Date(rain.peakTime).toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </T>
            )}
            <T muted style={font.tiny}>{t('forecastSource')}</T>
          </>
        ) : rainStatus === 'loading' ? (
          <ActivityIndicator />
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Ionicons name="cloud-offline" size={18} color={c.muted} />
            <T muted style={font.small}>{t('forecastUnavailable')}</T>
          </View>
        )}
      </Card>
    </>
  );

  /* ---------- right column ---------- */
  const nCols = cols(2, 3, 3);
  const tileW = tilesW ? Math.floor((tilesW - 10 * (nCols - 1)) / nCols) - 1 : 150;
  const sensors = r && (
    <>
      <SectionTitle title={t('liveSensors')} right={<T muted style={font.tiny}>{detail.device_id} · {timeAgo(lang, t, r.ts)}</T>} />
      <View style={s.tiles} onLayout={(e) => setTilesW(e.nativeEvent.layout.width)}>
        {METRICS.map((mm) => {
          const v = r[mm.key as keyof Reading] as number;
          const over = mm.threshold != null && v >= mm.threshold;
          return (
            <Card key={mm.key} style={[s.tile, { width: tileW }, over && { borderColor: c.danger, backgroundColor: c.tint.DANGER }]}
              onPress={() => setMetric(mm.key)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={mm.icon} size={16} color={over ? c.danger : mm.color} />
                <T muted style={[font.tiny, { flex: 1 }]} numberOfLines={1}>{t(mm.label)}</T>
              </View>
              <Text style={[s.tileVal, over && { color: c.danger }]}>
                {v.toFixed(mm.dec)}<Text style={s.tileUnit}> {mm.unit}</Text>
              </Text>
              {mm.threshold != null && (
                <T style={[font.tiny, { color: over ? c.danger : c.muted }]}>{t('threshold')} {mm.threshold}</T>
              )}
            </Card>
          );
        })}
      </View>
    </>
  );

  const chart = history.length > 0 && (
    <>
      <SectionTitle title={t('sevenDayTrend')} />
      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: space.md }}>
          {METRICS.map((mm) => (
            <Chip key={mm.key} label={t(mm.label)} icon={mm.icon} active={metric === mm.key} onPress={() => setMetric(mm.key)} />
          ))}
        </ScrollView>
        <LineChart values={series.values} times={series.times} color={m.color} threshold={m.threshold}
          thresholdLabel={t('threshold')} unit={m.unit} decimals={m.dec} locale={locale} />
      </Card>
    </>
  );

  const n = detail.nisar;
  const satellite = n && (
    <>
      <SectionTitle title={t('satellite')} right={<T muted style={font.tiny}>{t('satDate')} {n.nisar_date}</T>} />
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <SatStat icon="water" label={t('satSoil')} value={n.nisar_soil_moisture.toFixed(2)} unit="m³/m³" hot={n.nisar_soil_moisture >= 0.22} />
        <SatStat icon="trending-down" label={t('satCreep')} value={n.los_velocity_mm_month.toFixed(0)} unit="mm/mo" hot={n.los_velocity_mm_month >= 300} />
        <SatStat icon="radio" label={t('satCoherence')} value={n.coherence.toFixed(2)} unit="" />
      </Card>
    </>
  );

  const shelterList = near.length > 0 && (
    <>
      <SectionTitle title={t('nearestShelters')} />
      <View style={{ gap: space.md }}>
        {near.map((sh) => (
          <ShelterCard key={sh.shelter_id} shelter={sh} compact
            onRoute={() => navigation.navigate('Route', { shelterId: sh.shelter_id, fromHillId: location ? undefined : hillId })} />
        ))}
      </View>
    </>
  );

  const community = (
    <>
      <SectionTitle title={t('communityReports')} />
      <Card style={{ gap: space.md }}>
        {reports.length === 0 ? (
          <T muted style={font.small}>{t('noReports')}</T>
        ) : reports.slice(0, 5).map((rp) => (
          <View key={rp.id} style={s.step}>
            <Ionicons name="megaphone" size={16} color={rp.severity === 'high' ? c.danger : c.watch} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <T style={font.h3}>{t(hazardKey(rp.hazard_type))} · <T muted style={font.small}>{t(severityKey(rp.severity))}</T></T>
              {!!rp.description && <T style={[font.small, { color: c.inkSoft }]}>{rp.description}</T>}
              <T muted style={font.tiny}>{timeAgo(lang, t, rp.created_at)}</T>
            </View>
          </View>
        ))}
        <Button variant="outline" icon="megaphone-outline" label={t('reportHazardHere')} onPress={() => navigation.navigate('Report', { hillId })} />
      </Card>
    </>
  );

  return (
    <Screen
      back
      title={hillName(lang, detail.name)}
      subtitle={`${districtName(lang, detail.district)} · ${t('slope')} ${digits(lang, detail.slope_deg)}° · ${detail.lat.toFixed(3)}, ${detail.lon.toFixed(3)}`}
      right={<IconBtn icon="share-outline" label={t('shareStatus')} onPress={share} />}
    >
      {isTablet ? (
        <View style={{ flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>{hero}{guidance}{reasons}{rainCard}{shelterList}</View>
          <View style={{ flex: 1.2 }}>{sensors}{chart}{satellite}{community}</View>
        </View>
      ) : (
        <>{hero}{guidance}{rainCard}{reasons}{sensors}{chart}{satellite}{shelterList}{community}</>
      )}
    </Screen>
  );
}

function RainStat({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  const c = useTheme();
  const { lang } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: hot ? c.tint.DANGER : c.surfaceAlt, borderRadius: 14, padding: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: hot ? c.danger : c.ink }}>
        {digits(lang, Math.round(value))}<Text style={{ fontSize: 12, color: c.muted, fontWeight: '500' }}> mm</Text>
      </Text>
      <Text style={{ fontSize: 11, color: c.muted }}>{label}</Text>
    </View>
  );
}

function SatStat({ icon, label, value, unit, hot }: { icon: IconName; label: string; value: string; unit: string; hot?: boolean }) {
  const c = useTheme();
  const s = useStyles();
  return (
    <View style={{ flex: 1, minWidth: 110, gap: 4 }}>
      <Ionicons name={icon} size={18} color={hot ? c.danger : c.info} />
      <Text style={[s.tileVal, hot && { color: c.danger }]}>{value}<Text style={s.tileUnit}> {unit}</Text></Text>
      <T muted style={font.tiny}>{label}</T>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.md },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  heroChipText: { fontSize: 12, fontWeight: '600', color: c.inkSoft },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { padding: space.md, gap: 4 },
  tileVal: { fontSize: 22, fontWeight: '700', color: c.ink, letterSpacing: -0.4 },
  tileUnit: { fontSize: 12, fontWeight: '500', color: c.muted },
  rainBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
}));
