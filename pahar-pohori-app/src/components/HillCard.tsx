import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { districtName, hillName } from '../i18n';
import { useRainForecast } from '../services/weather';
import { useApp } from '../store';
import { font, makeStyles, radius, shadow, space, statusColor, useTheme } from '../theme';
import type { Hill } from '../types';
import { timeAgo } from '../utils';
import { ProbabilityRing, StatusBadge, T, digits } from './ui';

/** Floating property-style card (Aurex sample) for the selected hill. */
export function HillCard({ hill, onOpen, onRoute, onClose, floating = true }: {
  hill: Hill; onOpen: () => void; onRoute?: () => void; onClose?: () => void; floating?: boolean;
}) {
  const { lang, t } = useApp();
  const c = useTheme();
  const s = useStyles();
  const st = hill.status;
  const r = hill.latest_reading;
  const { data: rain } = useRainForecast(hill.lat, hill.lon);
  return (
    <Pressable onPress={onOpen} style={[s.card, floating && shadow]} accessibilityRole="button"
      accessibilityLabel={`${hill.name}, ${t(st.level)}`}>
      <View style={[s.thumb, { backgroundColor: c.tint[st.level] }]}>
        <Ionicons name="triangle" size={22} color={statusColor[st.level]} style={s.thumbBack} />
        <Ionicons name="triangle" size={36} color={statusColor[st.level]} />
        <Text style={[s.thumbPct, { color: statusColor[st.level] }]}>{t(st.level)}</Text>
        <View style={[s.thumbBar, { backgroundColor: statusColor[st.level] }]} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={s.row}>
          <StatusBadge level={st.level} size="sm" />
          {st.verified_by_nisar && (
            <View style={s.sat}><Ionicons name="planet" size={11} color={c.info} /><Text style={s.satText}>NISAR</Text></View>
          )}
          <View style={{ flex: 1 }} />
          {onClose && (
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('close')}>
              <Ionicons name="close" size={18} color={c.muted} />
            </Pressable>
          )}
        </View>
        <View style={[s.row, { alignItems: 'flex-end' }]}>
          <View style={{ flex: 1 }}>
            <T style={font.h3} numberOfLines={1}>{hillName(lang, hill.name)}</T>
            <T muted style={font.small} numberOfLines={1}>
              {districtName(lang, hill.district)} · {t('updated')} {timeAgo(lang, t, st.updated_at)}
            </T>
          </View>
          <ProbabilityRing p={st.probability} level={st.level} size={46} />
        </View>
        <View style={[s.row, { flexWrap: 'wrap', gap: 6, marginTop: 2 }]}>
          <Tag icon="trending-up" text={`${digits(lang, hill.slope_deg)}°`} />
          {r && <Tag icon="water" text={r.soil_moisture.toFixed(2)} />}
          {r && <Tag icon="pulse" text={`${r.acceleration.toFixed(3)} g`} />}
          {rain && <Tag icon="rainy" text={`${digits(lang, Math.round(rain.next24))} mm/24h`} hot={rain.next24 >= 44} />}
        </View>
        {onRoute && st.level !== 'SAFE' && (
          <Pressable onPress={onRoute} style={[s.routeBtn, st.level === 'DANGER' && { backgroundColor: c.danger }]} accessibilityRole="button">
            <Ionicons name="navigate" size={14} color={st.level === 'DANGER' ? '#fff' : c.chipOnText} />
            <Text style={{ color: st.level === 'DANGER' ? '#fff' : c.chipOnText, fontWeight: '600', fontSize: 13 }}>{t('nearestShelter')}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function Tag({ icon, text, hot }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; hot?: boolean }) {
  const s = useStyles();
  const c = useTheme();
  return (
    <View style={[s.tag, hot && { borderColor: c.danger }]}>
      <Ionicons name={icon} size={11} color={hot ? c.danger : c.inkSoft} />
      <Text style={[s.tagText, hot && { color: c.danger }]}>{text}</Text>
    </View>
  );
}

/** Compact row version for lists (side panel / alerts). */
export function HillRow({ hill, onPress, selected }: { hill: Hill; onPress: () => void; selected?: boolean }) {
  const { lang, t } = useApp();
  const c = useTheme();
  const s = useStyles();
  const st = hill.status;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.rowItem, selected && { borderColor: c.ink }, pressed && { opacity: 0.8 }]}>
      <View style={[s.rowStripe, { backgroundColor: statusColor[st.level] }]} />
      <View style={{ flex: 1 }}>
        <T style={[font.h3, { fontSize: 15 }]} numberOfLines={1}>{hillName(lang, hill.name)}</T>
        <T muted style={font.small}>{districtName(lang, hill.district)} · {t('slope')} {digits(lang, hill.slope_deg)}°</T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <StatusBadge level={st.level} size="sm" />
        <T muted style={font.tiny}>
          {st.probability == null ? '—' : `${digits(lang, Math.round(st.probability * 100))}% ${t('risk')}`}
        </T>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: 'row', gap: space.md, backgroundColor: c.surface, borderRadius: radius.xl,
    padding: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line,
  },
  thumb: { width: 92, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 116, gap: 4 },
  thumbBack: { position: 'absolute', left: 14, top: 36, opacity: 0.4 },
  thumbPct: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  thumbBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sat: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.infoTint, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  satText: { fontSize: 10, fontWeight: '700', color: c.info },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.line,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  tagText: { fontSize: 11, color: c.inkSoft, fontWeight: '500' },
  routeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: c.chipOn, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  rowItem: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.surface,
    borderRadius: radius.md, padding: space.md, paddingLeft: space.lg, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden',
  },
  rowStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
}));
