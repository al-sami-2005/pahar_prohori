import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HillRow } from '../components/HillCard';
import { Button, Card, Chip, EmptyState, ListenButton, Screen, SectionTitle, SourceBanner, T, digits, useResponsive } from '../components/ui';
import { speak, stopSpeaking } from '../services/speech';
import { hillName } from '../i18n';
import type { RootStack } from '../navigation';
import { useApp } from '../store';
import { font, makeStyles, space, useTheme } from '../theme';
import { formatDateTime, nearestShelters, pct, timeAgo } from '../utils';

export default function AlertsScreen() {
  const colors = useTheme();
  const styles = useStyles();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { alerts, hills, shelters, t, lang } = useApp();
  const { cols } = useResponsive();
  const [hillFilter, setHillFilter] = useState<number | null>(null);
  const [bothLangs, setBothLangs] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const alertHills = useMemo(() => Array.from(new Map(alerts.map((a) => [a.hill_id, a.hill_name])).entries()), [alerts]);
  const list = alerts.filter((a) => hillFilter == null || a.hill_id === hillFilter);
  const activeDanger = hills.filter((h) => h.status.level === 'DANGER');
  const dayAgo = Date.now() - 864e5;
  const recent = alerts.filter((a) => new Date(a.created_at).getTime() > dayAgo).length;
  const twoCol = cols(1, 2, 2) === 2;

  const toShelter = (hillId: number) => {
    const h = hills.find((x) => x.hill_id === hillId);
    const s = h && nearestShelters(h.lat, h.lon, shelters, 1)[0];
    if (!s) { Alert.alert(t('tabShelters'), t('noShelterNearby')); return; }
    nav.navigate('Route', { shelterId: s.shelter_id, fromHillId: hillId });
  };

  return (
    <Screen title={t('alertsTitle')} subtitle={t('alertsSubtitle')} refreshable>
      <SourceBanner />

      {activeDanger.length > 0 && (
        <View style={styles.activeBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.sm }}>
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 }}>
              {lang === 'bn'
                ? `এখন ${digits(lang, activeDanger.length)}টি পাহাড় বিপদে`
                : `${activeDanger.length} hill${activeDanger.length > 1 ? 's' : ''} in Danger now`}
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            {activeDanger.map((h) => (
              <HillRow key={h.hill_id} hill={h} onPress={() => nav.navigate('HillDetail', { hillId: h.hill_id })} />
            ))}
          </View>
        </View>
      )}

      <SectionTitle
        title={`${t('alertsTitle')} · ${digits(lang, recent)} ${t('last24h')}`}
        right={<Chip label={bothLangs ? 'EN + বাং' : lang === 'bn' ? 'বাং' : 'EN'} icon="language" onPress={() => setBothLangs((v) => !v)} active={bothLangs} />}
      />
      {alertHills.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: space.md }}>
          <Chip label={t('allHills')} active={hillFilter == null} onPress={() => setHillFilter(null)} />
          {alertHills.map(([id, name]) => (
            <Chip key={id} label={hillName(lang, name)} active={hillFilter === id} onPress={() => setHillFilter(id)} />
          ))}
        </ScrollView>
      )}

      {list.length === 0 ? (
        <EmptyState icon="shield-checkmark" title={t('noAlerts')} body={t('noAlertsBody')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {list.map((a) => (
            <Card key={a.id} style={[styles.alert, { width: twoCol ? '48.8%' : '100%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.alertIcon}><Ionicons name="warning" size={18} color={colors.danger} /></View>
                <View style={{ flex: 1 }}>
                  <T style={font.h3} numberOfLines={1}>{hillName(lang, a.hill_name)}</T>
                  <T style={[font.tiny, { color: colors.muted }]}>
                    {timeAgo(lang, t, a.created_at)} · {formatDateTime(lang, a.created_at)}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 18 }}>{digits(lang, pct(a.probability))}</Text>
                  <T style={[font.tiny, { color: colors.muted }]}>{t('probability')}</T>
                </View>
              </View>
              <T style={[font.body, { lineHeight: 22 }]}>{lang === 'bn' ? a.message_bn : a.message_en}</T>
              {bothLangs && (
                <T style={[font.small, { color: colors.muted, lineHeight: 20 }]}>{lang === 'bn' ? a.message_en : a.message_bn}</T>
              )}
              <View style={{ flexDirection: 'row' }}>
                <ListenButton speaking={speakingId === a.id} label={speakingId === a.id ? t('stop') : t('listen')} onPress={() => {
                  if (speakingId === a.id) { stopSpeaking(); setSpeakingId(null); return; }
                  setSpeakingId(a.id);
                  speak(lang === 'bn' ? a.message_bn : a.message_en, lang, () => setSpeakingId(null));
                }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button compact variant="danger" icon="navigate" label={t('nearestShelter')} onPress={() => toShelter(a.hill_id)} style={{ flex: 1 }} />
                <Button compact variant="soft" icon="open-outline" label={t('openHill')}
                  onPress={() => nav.navigate('HillDetail', { hillId: a.hill_id })} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  activeBox: { backgroundColor: colors.danger, borderRadius: 22, padding: space.md, marginBottom: space.sm },
  alert: { gap: space.md, borderLeftWidth: 4, borderLeftColor: colors.danger },
  alertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tint.DANGER, alignItems: 'center', justifyContent: 'center' },
}));
