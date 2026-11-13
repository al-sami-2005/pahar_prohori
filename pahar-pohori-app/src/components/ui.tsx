import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
  useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { digits } from '../i18n';
import { goBackSmart } from '../navigation/back';
import { useApp } from '../store';
import { font, makeStyles, radius, shadowSoft, space, statusColor, statusIcon, useTheme } from '../theme';
import type { Level } from '../types';
import { timeAgo } from '../utils';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Breakpoints: phone < 768 ≤ tablet < 1100 ≤ desktop */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1100;
  return {
    width, height, isTablet, isDesktop,
    gutter: isTablet ? 24 : 16,
    contentMax: isDesktop ? 1080 : 760,
    cols: (phone: number, tablet: number, desktop = tablet) => (isDesktop ? desktop : isTablet ? tablet : phone),
  };
}

/* ---------------- text ---------------- */
export function T({ style, children, numberOfLines, muted }: {
  style?: StyleProp<TextStyle>; children: React.ReactNode; numberOfLines?: number; muted?: boolean;
}) {
  const c = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ color: muted ? c.muted : c.ink, ...font.body }, style]}>{children}</Text>;
}

/* ---------------- screen shell ---------------- */
export function Screen({
  title, subtitle, back, backTo = 'Map', right, children, refreshable, scroll = true,
}: {
  title?: string; subtitle?: string; back?: boolean; backTo?: 'Map' | 'More';
  right?: React.ReactNode; children: React.ReactNode;
  refreshable?: boolean; scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const c = useTheme();
  const { gutter, contentMax } = useResponsive();
  const { refresh, loading } = useApp();
  const header = (title || back) && (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space.md, paddingBottom: space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 }}>
        {back && <IconBtn icon="chevron-back" onPress={() => goBackSmart(nav, backTo)} label="Back" />}
        <View style={{ flex: 1 }}>
          {!!title && <T style={font.h1}>{title}</T>}
          {!!subtitle && <T muted style={[font.small, { marginTop: 2 }]}>{subtitle}</T>}
        </View>
      </View>
      {right}
    </View>
  );
  const inner = (
    <View style={{ width: '100%', maxWidth: contentMax, alignSelf: 'center', paddingHorizontal: gutter }}>
      {header}
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          refreshControl={refreshable ? <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.muted} /> : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : inner}
    </View>
  );
}

/* ---------------- building blocks ---------------- */
export function Card({ children, style, onPress }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void;
}) {
  const s = useStyles();
  const base = [s.card, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        base,
        pressed && { opacity: 0.88, transform: [{ scale: 0.992 }] },
        Platform.select({
          web: { cursor: 'pointer', transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1), opacity 0.15s ease' } as object,
          default: {},
        }),
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, color, count }: {
  label: string; active?: boolean; onPress?: () => void; icon?: IconName; color?: string; count?: number;
}) {
  const s = useStyles();
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={[s.chip, active && { backgroundColor: c.chipOn }, { cursor: 'pointer' as const }]}
    >
      {color && <View style={[s.dot, { backgroundColor: color }]} />}
      {icon && <Ionicons name={icon} size={14} color={active ? c.chipOnText : c.inkSoft} />}
      <Text style={[s.chipText, active && { color: c.chipOnText }]}>{label}</Text>
      {count != null && (
        <View style={[s.chipCount, active && { backgroundColor: 'rgba(127,127,127,0.25)' }]}>
          <Text style={[s.chipCountText, active && { color: c.chipOnText }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function StatusBadge({ level, size = 'md' }: { level: Level; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useApp();
  const c = useTheme();
  const fs = size === 'lg' ? 15 : size === 'sm' ? 11 : 13;
  return (
    <View style={[
      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', backgroundColor: c.tint[level] },
      size === 'lg' && { paddingVertical: 7, paddingHorizontal: 12 },
    ]}>
      <Ionicons name={statusIcon[level]} size={fs + 1} color={statusColor[level]} />
      <Text style={{ color: statusColor[level], fontSize: fs, fontWeight: '700' }}>{t(level)}</Text>
    </View>
  );
}

export function IconBtn({ icon, onPress, label, size = 44, color, bg, active }: {
  icon: IconName; onPress?: () => void; label: string; size?: number; color?: string; bg?: string; active?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={10}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: 999, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' as const },
        { backgroundColor: bg ?? (active ? c.chipOn : c.elevated) },
        !bg && shadowSoft,
        !bg && c.dark && { borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={size * 0.45} color={color ?? (active ? c.chipOnText : c.ink)} pointerEvents="none" />
    </Pressable>
  );
}

export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, style, compact }: {
  label: string; onPress?: () => void; icon?: IconName; variant?: 'primary' | 'danger' | 'outline' | 'soft' | 'blue';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; compact?: boolean;
}) {
  const c = useTheme();
  const bg = { primary: c.chipOn, danger: c.danger, outline: 'transparent', soft: c.chip, blue: '#2563EB' }[variant];
  const fg = variant === 'primary' ? c.chipOnText : variant === 'danger' || variant === 'blue' ? '#fff' : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.pill },
        compact && { paddingVertical: 9, paddingHorizontal: 14 },
        { backgroundColor: bg },
        variant === 'outline' && { borderWidth: 1, borderColor: c.line },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] },
        Platform.select({
          web: { cursor: 'pointer', transition: 'transform 0.12s cubic-bezier(0.2, 0, 0, 1), opacity 0.12s ease' } as object,
          default: {},
        }),
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon && <Ionicons name={icon} size={compact ? 16 : 18} color={fg} />}
      <Text style={{ color: fg, fontSize: compact ? 14 : 15, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, right, style }: { title: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.md, gap: 8 }, style]}>
      <T style={[font.h3, { flexShrink: 1 }]}>{title}</T>
      {right}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.tint.SAFE, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm }}>
        <Ionicons name={icon} size={28} color={c.safe} />
      </View>
      <T style={[font.h3, { textAlign: 'center' }]}>{title}</T>
      {!!body && <T muted style={[font.small, { textAlign: 'center', maxWidth: 320 }]}>{body}</T>}
      {action}
    </View>
  );
}

/** Shows whether data is live, cached (offline) or demo. */
export function SourceBanner({ compact }: { compact?: boolean }) {
  const { source, t, lang, lastSync, refresh, loading } = useApp();
  const c = useTheme();
  if (source === 'live') {
    if (compact) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.sm }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.safe }} />
        <T muted style={font.tiny}>{t('sourceLive')} · {t('lastSync')} {timeAgo(lang, t, lastSync)}</T>
      </View>
    );
  }
  const isDemo = source === 'demo';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10, paddingHorizontal: 14,
      borderRadius: radius.md, marginBottom: space.md, backgroundColor: isDemo ? c.infoTint : c.tint.WATCH,
    }}>
      <Ionicons name={isDemo ? 'flask' : 'cloud-offline'} size={16} color={isDemo ? c.info : c.watch} />
      <T style={[font.small, { flex: 1, color: c.inkSoft }]} numberOfLines={2}>
        {t(isDemo ? 'sourceDemo' : 'sourceCache')}
        {!isDemo && lastSync ? ` · ${timeAgo(lang, t, lastSync)}` : ''}
      </T>
      <Pressable onPress={refresh} disabled={loading} hitSlop={8}>
        {loading ? <ActivityIndicator size="small" /> : <T style={[font.small, { fontWeight: '700' }]}>{t('retry')}</T>}
      </Pressable>
    </View>
  );
}

export function ProbabilityRing({ p, level, size = 64 }: { p: number | null; level: Level; size?: number }) {
  const { lang } = useApp();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: statusColor[level], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.3 }}>
        {p == null ? '—' : digits(lang, Math.round(p * 100))}
        <Text style={{ fontSize: size * 0.17 }}>{p == null ? '' : '%'}</Text>
      </Text>
    </View>
  );
}

/** Segmented control used for theme, map style, travel mode … */
export function Segmented<K extends string>({ value, options, onChange, small }: {
  value: K; options: { key: K; label: string; icon?: IconName }[]; onChange: (k: K) => void; small?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.chip, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [
              { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', paddingVertical: small ? 8 : 11, borderRadius: radius.pill, backgroundColor: on ? c.chipOn : 'transparent' },
              pressed && { opacity: 0.82 },
              Platform.select({
                web: { cursor: 'pointer', transition: 'background-color 0.18s cubic-bezier(0.2, 0, 0, 1), opacity 0.12s ease' } as object,
                default: {},
              }),
            ]}
          >
            {o.icon && <Ionicons name={o.icon} size={15} color={on ? c.chipOnText : c.inkSoft} />}
            <Text style={{ fontWeight: '600', fontSize: small ? 13 : 14, color: on ? c.chipOnText : c.inkSoft }} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small "Listen" pill that reads text aloud. */
export function ListenButton({ speaking, onPress, label }: { speaking: boolean; onPress: () => void; label: string }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: speaking ? c.info : c.infoTint }}>
      <Ionicons name={speaking ? 'stop' : 'volume-high'} size={15} color={speaking ? '#fff' : c.info} />
      <Text style={{ color: speaking ? '#fff' : c.info, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.line,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36,
    borderRadius: radius.pill, backgroundColor: c.chip,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: c.inkSoft },
  chipCount: { backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  chipCountText: { fontSize: 11, fontWeight: '700', color: c.inkSoft },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));

export { digits };
