import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { districtName, hillName } from '../i18n';
import { searchPlaces } from '../services/geocode';
import { useApp } from '../store';
import { font, space, statusColor, useTheme } from '../theme';
import type { GeoResult, Hill, Shelter } from '../types';
import { T, digits, type IconName } from './ui';

export type SearchPick =
  | { kind: 'hill'; hill: Hill }
  | { kind: 'shelter'; shelter: Shelter }
  | { kind: 'place'; place: GeoResult }
  | { kind: 'district'; district: string };

/** Full-screen search like a maps app: local hills/shelters/districts instantly + any place via OpenStreetMap. */
export function SearchOverlay({ initial, onPick, onClose, inline }: {
  initial: string; onPick: (p: SearchPick) => void; onClose: () => void; inline?: boolean;
}) {
  const { hills, shelters, lang, t, settings, addRecent } = useApp();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState(initial);
  const [places, setPlaces] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const query = q.trim().toLowerCase();

  useEffect(() => {
    if (query.length < 3) { setPlaces([]); return; }
    setBusy(true);
    const id = setTimeout(() => {
      searchPlaces(q, lang).then((r) => { setPlaces(r); setBusy(false); });
    }, 550);
    return () => clearTimeout(id);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const match = (...xs: string[]) => !query || xs.some((x) => x.toLowerCase().includes(query));
  const hillHits = useMemo(() => hills.filter((h) => match(h.name, hillName('bn', h.name), h.district, districtName('bn', h.district))), [hills, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const shelterHits = useMemo(() => shelters.filter((s) => match(s.name, s.name_bn, s.district)).slice(0, 6), [shelters, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const districts = useMemo(() => Array.from(new Set(hills.map((h) => h.district))).filter((d) => match(d, districtName('bn', d))), [hills, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (p: SearchPick, label: string) => { addRecent(label); onPick(p); };

  return (
    <View style={[{ backgroundColor: c.surface }, inline ? { flex: 1 } : { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingTop: insets.top, zIndex: 50 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 60, borderBottomWidth: 1, borderColor: c.line }}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('back')} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={22} color={c.ink} />
        </Pressable>
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder={t('searchHills')} placeholderTextColor={c.muted}
          style={{ flex: 1, fontSize: 17, color: c.ink, height: 56, outlineStyle: 'none' } as object} returnKeyType="search"
          onSubmitEditing={() => { const f = hillHits[0]; if (f) pick({ kind: 'hill', hill: f }, f.name); else if (places[0]) pick({ kind: 'place', place: places[0] }, places[0].name); }} />
        {busy ? <ActivityIndicator size="small" /> : !!q && (
          <Pressable onPress={() => setQ('')} hitSlop={10}><Ionicons name="close" size={22} color={c.muted} /></Pressable>
        )}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: inline ? 40 : 140 }}>
        {!query && settings.recents.length > 0 && (
          <>
            <Head label={lang === 'bn' ? 'সাম্প্রতিক' : 'Recent'} />
            {settings.recents.map((r) => (
              <Row key={r} icon="time-outline" iconBg={c.chip} iconColor={c.inkSoft} title={r} onPress={() => setQ(r)} />
            ))}
          </>
        )}

        {hillHits.length > 0 && <Head label={t('hillList')} />}
        {hillHits.map((h) => (
          <Row key={h.hill_id} icon="triangle" iconBg={`${statusColor[h.status.level]}22`} iconColor={statusColor[h.status.level]}
            title={hillName(lang, h.name)} sub={`${districtName(lang, h.district)} · ${t(h.status.level)} · ${h.status.probability == null ? '—' : digits(lang, Math.round(h.status.probability * 100)) + '%'}`}
            onPress={() => pick({ kind: 'hill', hill: h }, h.name)} />
        ))}

        {query.length > 0 && districts.length > 0 && <Head label={t('allDistricts')} />}
        {query.length > 0 && districts.map((d) => (
          <Row key={d} icon="business" iconBg={c.chip} iconColor={c.inkSoft} title={districtName(lang, d)}
            sub={`${hills.filter((h) => h.district === d).length} ${t('hills')}`} onPress={() => pick({ kind: 'district', district: d }, d)} />
        ))}

        {shelterHits.length > 0 && <Head label={t('shelters')} />}
        {shelterHits.map((s) => (
          <Row key={s.shelter_id} icon="home" iconBg={c.infoTint} iconColor={c.info} title={lang === 'bn' ? s.name_bn : s.name}
            sub={`${districtName(lang, s.district)} · ${digits(lang, s.capacity)} ${t('capacity')}`} onPress={() => pick({ kind: 'shelter', shelter: s }, s.name)} />
        ))}

        {places.length > 0 && <Head label={lang === 'bn' ? 'স্থান (OpenStreetMap)' : 'Places (OpenStreetMap)'} />}
        {places.map((p) => (
          <Row key={p.id} icon="location" iconBg={c.chip} iconColor={c.danger} title={p.name} sub={p.address}
            onPress={() => pick({ kind: 'place', place: p }, p.name)} />
        ))}

        {query.length >= 3 && !busy && !hillHits.length && !shelterHits.length && !places.length && (
          <T muted style={[font.small, { padding: space.xl, textAlign: 'center' }]}>{t('noHillsMatch')}</T>
        )}
      </ScrollView>
    </View>
  );
}

function Head({ label }: { label: string }) {
  const c = useTheme();
  return <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>;
}

function Row({ icon, iconBg, iconColor, title, sub, onPress }: {
  icon: IconName; iconBg: string; iconColor: string; title: string; sub?: string; onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 11 }, pressed && { backgroundColor: c.surfaceAlt }]}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={font.body} numberOfLines={1}>{title}</T>
        {!!sub && <T muted style={font.small} numberOfLines={1}>{sub}</T>}
      </View>
      <Ionicons name="arrow-up-outline" size={18} color={c.muted} style={{ transform: [{ rotate: '-45deg' }] }} />
    </Pressable>
  );
}
