import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { Button, Card, Chip, Screen, SectionTitle, T, digits, useResponsive, type IconName } from '../components/ui';
import { hazardKey, hillName, severityKey } from '../i18n';
import type { RootStack } from '../navigation';
import { useApp } from '../store';
import { font, makeStyles, radius, space, useTheme, light } from '../theme';
import type { CommunityReport, HazardType, Severity } from '../types';
import { callNumber, timeAgo } from '../utils';

type Props = NativeStackScreenProps<RootStack, 'Report'>;

const HAZARDS: { key: HazardType; icon: IconName }[] = [
  { key: 'crack', icon: 'git-branch' },
  { key: 'seepage', icon: 'water' },
  { key: 'tilting', icon: 'leaf' },
  { key: 'rockfall', icon: 'cube' },
  { key: 'small_slide', icon: 'trending-down' },
  { key: 'other', icon: 'ellipsis-horizontal' },
];
const SEVERITIES: { key: Severity; color: string }[] = [
  { key: 'low', color: light.safe },
  { key: 'medium', color: light.watch },
  { key: 'high', color: light.danger },
];

export default function ReportScreen({ route }: Props) {
  const colors = useTheme();
  const styles = useStyles();
  const { hills, t, lang, submitReport, requestLocation, location, pendingReports, settings, source } = useApp();
  const { cols } = useResponsive();
  const [hillId, setHillId] = useState<number | null>(route.params?.hillId ?? null);
  const [hazard, setHazard] = useState<HazardType | null>(null);
  const [severity, setSeverity] = useState<Severity>('medium');
  const [desc, setDesc] = useState('');
  const [attachLoc, setAttachLoc] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'sent' | 'queued' | null>(null);
  const [recent, setRecent] = useState<CommunityReport[]>([]);
  const [gridW, setGridW] = useState(0);
  const n = cols(2, 3, 3);
  const cellW = gridW ? Math.floor((gridW - 10 * (n - 1)) / n) - 1 : 140;

  const loadRecent = () => api.reports(settings.apiUrl).then(setRecent).catch(() => setRecent([]));
  useEffect(() => { loadRecent(); }, [settings.apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!hazard) return;
    setBusy(true);
    let c = location;
    if (attachLoc && !c) c = await requestLocation();
    const res = await submitReport({
      hill_id: hillId, hazard_type: hazard, severity, description: desc.trim(),
      lat: attachLoc ? c?.lat ?? null : null, lon: attachLoc ? c?.lon ?? null : null,
      reporter_name: name.trim() || null, reporter_phone: phone.trim() || null,
    });
    setBusy(false);
    setResult(res);
    if (res === 'sent') {
      setHazard(null); setDesc(''); setSeverity('medium');
      loadRecent();
    }
  };

  return (
    <Screen back backTo="More" title={t('reportTitle')} subtitle={t('reportSubtitle')}>
      <Pressable style={styles.callout} onPress={() => callNumber('999')}>
        <Ionicons name="call" size={16} color={colors.danger} />
        <T style={[font.small, { flex: 1, color: colors.inkSoft }]}>{t('ifDangerCall')}</T>
        <Text style={{ color: colors.danger, fontWeight: '800' }}>{digits(lang, '999')}</Text>
      </Pressable>

      {result && (
        <View style={[styles.result, { backgroundColor: result === 'sent' ? colors.tint.SAFE : colors.tint.WATCH }]}>
          <Ionicons name={result === 'sent' ? 'checkmark-circle' : 'time'} size={20} color={result === 'sent' ? colors.safe : colors.watch} />
          <T style={[font.body, { flex: 1 }]}>{t(result === 'sent' ? 'reportSent' : 'reportQueued')}</T>
        </View>
      )}
      {pendingReports > 0 && (
        <T style={[font.small, { color: colors.watch, marginBottom: space.sm }]}>
          {digits(lang, pendingReports)} {t('pendingReports')}
        </T>
      )}

      <SectionTitle title={`1. ${t('whichHill')}`} style={{ marginTop: space.md }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={t('notSure')} active={hillId == null} onPress={() => setHillId(null)} />
        {hills.map((h) => (
          <Chip key={h.hill_id} label={hillName(lang, h.name)} active={hillId === h.hill_id} onPress={() => setHillId(h.hill_id)} />
        ))}
      </ScrollView>

      <SectionTitle title={`2. ${t('whatDidYouSee')}`} />
      <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
        {HAZARDS.map((h) => {
          const on = hazard === h.key;
          return (
            <Pressable key={h.key} onPress={() => setHazard(h.key)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={[styles.hz, { width: cellW }, on && styles.hzOn]}>
              <Ionicons name={h.icon} size={24} color={on ? colors.chipOnText : colors.ink} />
              <Text style={[styles.hzText, on && { color: colors.chipOnText }]}>{t(hazardKey(h.key))}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title={`3. ${t('howSerious')}`} />
      <View style={styles.segment}>
        {SEVERITIES.map((s) => {
          const on = severity === s.key;
          return (
            <Pressable key={s.key} onPress={() => setSeverity(s.key)} style={[styles.seg, on && { backgroundColor: s.color }]}
              accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Text style={[styles.segText, on && { color: '#fff' }]}>{t(severityKey(s.key))}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title={`4. ${t('details')}`} />
      <Card style={{ gap: space.md }}>
        <TextInput value={desc} onChangeText={setDesc} placeholder={t('detailsPlaceholder')} placeholderTextColor={colors.muted}
          multiline maxLength={1000} style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        <View style={styles.switchRow}>
          <Ionicons name="location" size={18} color={colors.info} />
          <T style={[font.body, { flex: 1 }]}>{t('attachLocation')}</T>
          <Switch value={attachLoc} onValueChange={setAttachLoc} />
        </View>
        <TextInput value={name} onChangeText={setName} placeholder={t('yourName')} placeholderTextColor={colors.muted}
          maxLength={80} style={styles.input} />
        <TextInput value={phone} onChangeText={setPhone} placeholder={t('yourPhone')} placeholderTextColor={colors.muted}
          keyboardType="phone-pad" maxLength={20} style={styles.input} />
      </Card>

      <Button label={busy ? t('sending') : t('submit')} icon="send" onPress={submit} disabled={!hazard} loading={busy}
        style={{ marginTop: space.xl }} />

      {source !== 'demo' && recent.length > 0 && (
        <>
          <SectionTitle title={t('recentReports')} />
          <View style={{ gap: space.sm }}>
            {recent.slice(0, 10).map((r) => (
              <Card key={r.id} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.md }}>
                <View style={[styles.dot, { backgroundColor: SEVERITIES.find((s) => s.key === r.severity)?.color }]} />
                <View style={{ flex: 1 }}>
                  <T style={font.h3}>{t(hazardKey(r.hazard_type))}{r.hill_name ? ` · ${hillName(lang, r.hill_name)}` : ''}</T>
                  {!!r.description && <T style={[font.small, { color: colors.inkSoft }]} numberOfLines={2}>{r.description}</T>}
                </View>
                <T style={[font.tiny, { color: colors.muted }]}>{timeAgo(lang, t, r.created_at)}</T>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  callout: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.tint.DANGER, padding: space.md,
    borderRadius: radius.md,
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.md, borderRadius: radius.md, marginTop: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hz: {
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 10, alignItems: 'center',
    gap: 8, borderWidth: 1, borderColor: colors.line,
  },
  hzOn: { backgroundColor: colors.chipOn, borderColor: colors.chipOn },
  hzText: { fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  segment: { flexDirection: 'row', backgroundColor: colors.chip, borderRadius: radius.pill, padding: 4 },
  seg: { flex: 1, paddingVertical: 11, borderRadius: radius.pill, alignItems: 'center' },
  segText: { fontWeight: '600', color: colors.inkSoft },
  input: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.ink,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
}));
