import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StringKey } from '../i18n';
import { useApp } from '../store';
import { font, radius, shadow, space, statusColor, useTheme } from '../theme';
import type { DataLayer, MapType, RiskTimeline } from '../types';
import { Segmented, T, digits, type IconName } from './ui';

/* ------------------------------------------------------------------ */
/* Layers sheet: map style · data layer · overlays · 3D · theme        */
/* ------------------------------------------------------------------ */

const STYLES: { key: MapType; label: StringKey; icon: IconName; preview: string[] }[] = [
  { key: 'standard', label: 'mapStandard', icon: 'map', preview: ['#E9E5DC', '#FFFFFF', '#B9D7A8'] },
  { key: 'satellite', label: 'mapSatellite', icon: 'earth', preview: ['#2F4A2A', '#5C6B3A', '#1D2B1A'] },
  { key: 'terrain', label: 'mapTerrain', icon: 'triangle', preview: ['#D8E3C4', '#B9A27C', '#F2EFE6'] },
];
const LAYERS: { key: DataLayer; label: StringKey; icon: IconName; color: string; legend: StringKey }[] = [
  { key: 'risk', label: 'layerRisk', icon: 'warning', color: statusColor.DANGER, legend: 'riskLegend' },
  { key: 'creep', label: 'layerCreep', icon: 'planet', color: '#7C5CFF', legend: 'creepLegend' },
  { key: 'soil', label: 'layerSoil', icon: 'water', color: '#2F80ED', legend: 'soilLegend' },
];

export function LayerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, settings, updateSettings } = useApp();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.backdrop, justifyContent: 'flex-end', alignItems: 'center' }} onPress={onClose}>
        <Pressable onPress={() => undefined} style={[{
          width: '100%', maxWidth: 560, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.md,
        }, shadow]}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.line, marginTop: -8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T style={[font.h2, { flex: 1 }]}>{t('layers')}</T>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={c.muted} /></Pressable>
          </View>

          <T muted style={font.small}>{t('mapStyle')}</T>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {STYLES.map((s) => {
              const on = settings.mapType === s.key;
              return (
                <Pressable key={s.key} onPress={() => updateSettings({ mapType: s.key })} style={{ flex: 1, alignItems: 'center', gap: 6 }}
                  accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <View style={{ width: '100%', aspectRatio: 1.3, borderRadius: 16, overflow: 'hidden', borderWidth: on ? 3 : 1, borderColor: on ? c.info : c.line }}>
                    <View style={{ flex: 1, backgroundColor: s.preview[0] }} />
                    <View style={{ position: 'absolute', left: '15%', top: '30%', width: '70%', height: 6, borderRadius: 3, backgroundColor: s.preview[1], transform: [{ rotate: '-18deg' }] }} />
                    <View style={{ position: 'absolute', right: 8, bottom: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: s.preview[2] }} />
                    <Ionicons name={s.icon} size={18} color={s.key === 'satellite' ? '#fff' : '#333'} style={{ position: 'absolute', left: 8, top: 8 }} />
                  </View>
                  <Text style={{ color: on ? c.info : c.inkSoft, fontWeight: '600', fontSize: 13 }}>{t(s.label)}</Text>
                </Pressable>
              );
            })}
          </View>

          <T muted style={[font.small, { marginTop: space.sm }]}>{t('dataLayer')}</T>
          <View style={{ gap: 8 }}>
            {LAYERS.map((l) => {
              const on = settings.layer === l.key;
              return (
                <Pressable key={l.key} onPress={() => updateSettings({ layer: l.key })} accessibilityRole="radio" accessibilityState={{ checked: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: on ? l.color : c.line, backgroundColor: on ? `${l.color}14` : 'transparent' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${l.color}22`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={l.icon} size={18} color={l.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={font.h3}>{t(l.label)}</T>
                    <T muted style={font.tiny}>{t(l.legend)}</T>
                  </View>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? l.color : c.muted} />
                </Pressable>
              );
            })}
          </View>

          <T muted style={[font.small, { marginTop: space.sm }]}>{t('overlays')}</T>
          <ToggleRow icon="home" color={c.info} label={t('shelters')} value={settings.showShelters} onChange={(v) => updateSettings({ showShelters: v })} />
          <ToggleRow icon="megaphone" color={c.watch} label={t('reportsLayer')} value={settings.showReports} onChange={(v) => updateSettings({ showReports: v })} />
          {Platform.OS !== 'web' && (
            <ToggleRow icon="cube" color={c.violet} label={t('view3d')} sub={t('view3dBody')} value={settings.pitch3d} onChange={(v) => updateSettings({ pitch3d: v })} />
          )}

          <T muted style={[font.small, { marginTop: space.sm }]}>{t('theme')}</T>
          <Segmented small value={settings.theme} onChange={(v) => updateSettings({ theme: v })} options={[
            { key: 'system', label: t('themeSystem'), icon: 'phone-portrait-outline' },
            { key: 'light', label: t('themeLight'), icon: 'sunny' },
            { key: 'dark', label: t('themeDark'), icon: 'moon' },
          ]} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ToggleRow({ icon, color, label, sub, value, onChange }: {
  icon: IconName; color: string; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ionicons name={icon} size={18} color={color} />
      <View style={{ flex: 1 }}>
        <T style={font.body}>{label}</T>
        {!!sub && <T muted style={font.tiny}>{sub}</T>}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Replay bar: scrub / play the 7-day model replay                     */
/* ------------------------------------------------------------------ */

export function ReplayBar({ timeline, index, onIndex, playing, onPlay, onClose }: {
  timeline: RiskTimeline; index: number; onIndex: (i: number) => void; playing: boolean; onPlay: (p: boolean) => void; onClose: () => void;
}) {
  const { t, lang } = useApp();
  const c = useTheme();
  const [w, setW] = useState(0);
  const n = timeline.times.length;
  const frac = n > 1 ? index / (n - 1) : 1;
  const when = timeline.times[index] ? new Date(timeline.times[index]) : null;
  const pick = (x: number) => onIndex(Math.round(Math.max(0, Math.min(1, x / Math.max(w, 1))) * (n - 1)));

  // danger band: hours where any hill was DANGER
  const danger = timeline.times.map((_, i) => Object.values(timeline.hills).some((h) => h.level[i] === 'DANGER'));
  const counts = Object.values(timeline.hills).reduce((a, h) => { a[h.level[index]] = (a[h.level[index]] ?? 0) + 1; return a; }, {} as Record<string, number>);

  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.xl, padding: space.lg, gap: 10, borderWidth: 1, borderColor: c.line }, shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => onPlay(!playing)} accessibilityLabel={playing ? 'Pause' : 'Play'}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.chipOn, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={c.chipOnText} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <T style={font.h3}>{t('replayTitle')} · {when ? when.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</T>
          <T muted style={font.tiny} numberOfLines={1}>{t('replayBody')}</T>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.tint.SAFE }}>
          <Text style={{ color: c.safe, fontWeight: '700', fontSize: 12 }}>● {t('live')}</Text>
        </Pressable>
      </View>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => { onPlay(false); pick(e.nativeEvent.locationX); }}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        style={{ height: 28, justifyContent: 'center' }}
      >
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.chip, flexDirection: 'row', overflow: 'hidden' }}>
          {danger.map((d, i) => <View key={i} style={{ flex: 1, backgroundColor: d ? `${c.danger}88` : 'transparent' }} />)}
        </View>
        <View style={{ position: 'absolute', left: 0, width: `${frac * 100}%`, height: 8, borderRadius: 4, backgroundColor: `${c.ink}30` }} pointerEvents="none" />
        <View pointerEvents="none" style={{ position: 'absolute', left: Math.max(0, frac * w - 11), width: 22, height: 22, borderRadius: 11, backgroundColor: c.chipOn, borderWidth: 3, borderColor: c.surface }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {(['DANGER', 'WATCH', 'SAFE'] as const).map((l) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor[l] }} />
            <T style={font.small}>{digits(lang, counts[l] ?? 0)} {t(l)}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
