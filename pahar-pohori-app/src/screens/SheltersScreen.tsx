import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ShelterCard } from '../components/ShelterCard';
import { Chip, EmptyState, Screen, T, useResponsive } from '../components/ui';
import { districtName } from '../i18n';
import type { RootStack } from '../navigation';
import { useApp } from '../store';
import { font, makeStyles, radius, space, useTheme } from '../theme';
import { haversineKm } from '../utils';

export default function SheltersScreen() {
  const colors = useTheme();
  const styles = useStyles();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { shelters, t, lang, location, requestLocation, locationDenied } = useApp();
  const { cols } = useResponsive();
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const n = cols(1, 2, 3);
  const [w, setW] = useState(0);
  const cardW = w ? Math.floor((w - space.md * (n - 1)) / n) - 1 : undefined;

  const districts = useMemo(() => Array.from(new Set(shelters.map((s) => s.district))).sort(), [shelters]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let l = shelters
      .filter((s) => !district || s.district === district)
      .filter((s) => !query || s.name.toLowerCase().includes(query) || s.name_bn.includes(query) ||
        s.district.toLowerCase().includes(query));
    if (location) {
      l = l.map((s) => ({ ...s, distance_km: Math.round(haversineKm(location.lat, location.lon, s.lat, s.lon) * 10) / 10 }))
        .sort((a, b) => a.distance_km! - b.distance_km!);
    } else {
      l = [...l].sort((a, b) => a.district.localeCompare(b.district) || b.capacity - a.capacity);
    }
    return l;
  }, [shelters, district, q, location]);

  const isDemo = shelters.some((s) => s.source === 'demo');

  return (
    <Screen title={t('sheltersTitle')} subtitle={t('sheltersSubtitle')} refreshable>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('searchShelters')} placeholderTextColor={colors.muted}
          style={styles.input} accessibilityLabel={t('searchShelters')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: space.md }}>
        <Chip label={location ? t('nearMe') : t('useMyLocation')} icon={location ? 'navigate' : 'locate'} active={!!location}
          onPress={requestLocation} />
        <Chip label={t('allDistricts')} active={!district} onPress={() => setDistrict(null)} />
        {districts.map((d) => (
          <Chip key={d} label={districtName(lang, d)} active={district === d} onPress={() => setDistrict(d)} />
        ))}
      </ScrollView>

      {!location && (
        <Pressable onPress={requestLocation} style={styles.note}>
          <Ionicons name="location-outline" size={16} color={colors.inkSoft} />
          <T style={[font.small, { flex: 1, color: colors.inkSoft }]}>
            {locationDenied ? t('locationOff') : t('sheltersSubtitle')}
          </T>
        </Pressable>
      )}

      {list.length === 0 ? (
        <EmptyState icon="home" title={t('noSheltersMatch')} />
      ) : (
        <View style={styles.grid} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {list.map((s) => (
            <View key={s.shelter_id} style={{ width: cardW ?? '100%' }}>
              <ShelterCard shelter={s} onRoute={() => nav.navigate('Route', { shelterId: s.shelter_id })} />
            </View>
          ))}
        </View>
      )}

      {isDemo && (
        <View style={[styles.note, { marginTop: space.lg }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <T style={[font.tiny, { flex: 1, color: colors.muted }]}>{t('demoShelterNote')}</T>
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: 14, height: 46, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  input: { flex: 1, fontSize: 15, color: colors.ink, height: 46, outlineStyle: 'none' } as object,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  note: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: space.md, marginBottom: space.md,
  },
}));
