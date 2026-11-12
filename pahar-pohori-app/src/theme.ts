import { createContext, useContext, useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import type { Level } from './types';

/* ------------------------------------------------------------------
 * Design tokens. Two palettes with identical keys; screens read the
 * active one through useTheme() / makeStyles(), so the whole app
 * switches between light and dark instantly.
 * ------------------------------------------------------------------ */

const shared = {
  danger: '#E5484D',
  watch: '#F2A33A',
  safe: '#22A06B',
  nodata: '#9AA0A6',
  info: '#3B82F6',
  violet: '#7C5CFF',
  teal: '#14A3B8',
  water: '#2F80ED',
};

export const light = {
  ...shared,
  dark: false,
  bg: '#F1F1EF',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F6F4',
  elevated: '#FFFFFF',
  ink: '#111214',
  inkSoft: '#3A3B3E',
  muted: '#8B8D92',
  line: '#E6E6E3',
  chip: '#ECECEA',
  chipOn: '#111214',
  chipOnText: '#FFFFFF',
  input: '#F4F4F2',
  backdrop: 'rgba(0,0,0,0.28)',
  infoTint: '#EAF1FF',
  tint: { SAFE: '#E6F5EE', WATCH: '#FDF1DF', DANGER: '#FCE7E8', NO_DATA: '#EEEFF1' } as Record<Level, string>,
  glass: 'rgba(255,255,255,0.92)',
};

export const dark: typeof light = {
  ...shared,
  dark: true,
  bg: '#0C0D0F',
  surface: '#17181B',
  surfaceAlt: '#1F2024',
  elevated: '#202125',
  ink: '#F3F4F6',
  inkSoft: '#C8CBD2',
  muted: '#8A8D96',
  line: '#2A2C31',
  chip: '#24262B',
  chipOn: '#F3F4F6',
  chipOnText: '#111214',
  input: '#202227',
  backdrop: 'rgba(0,0,0,0.55)',
  infoTint: '#172338',
  tint: { SAFE: '#11291D', WATCH: '#33270F', DANGER: '#3A1416', NO_DATA: '#24262A' } as Record<Level, string>,
  glass: 'rgba(23,24,27,0.92)',
};

export type Palette = typeof light;
export type ThemeMode = 'system' | 'light' | 'dark';

/** The route/navigation screen is always dark (nav sample). */
export const nav = {
  bg: '#121315',
  surface: '#1D1E21',
  surface2: '#26272B',
  ink: '#F4F4F5',
  muted: '#8E9097',
  blue: '#4DA3FF',
  yellow: '#F5C842',
  yellowRow: '#3A3424',
};

export const statusColor: Record<Level, string> = {
  SAFE: shared.safe,
  WATCH: shared.watch,
  DANGER: shared.danger,
  NO_DATA: shared.nodata,
};

export const statusIcon: Record<Level, 'shield-checkmark' | 'eye' | 'warning' | 'help-circle'> = {
  SAFE: 'shield-checkmark',
  WATCH: 'eye',
  DANGER: 'warning',
  NO_DATA: 'help-circle',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const font = {
  display: { fontSize: 34, fontWeight: '600' as const, letterSpacing: -0.8 },
  h1: { fontSize: 26, fontWeight: '600' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },
};

export const shadow = Platform.select({
  web: { boxShadow: '0 8px 28px rgba(0,0,0,0.16)' } as object,
  default: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
}) as object;

export const shadowSoft = Platform.select({
  web: { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as object,
  default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
}) as object;

/* ------------------------------------------------------------------ */

/** Resolve the active palette from the user's choice (store) + the OS setting. */
export function resolvePalette(mode: ThemeMode, system: 'light' | 'dark' | null | undefined): Palette {
  if (mode === 'dark') return dark;
  if (mode === 'light') return light;
  return system === 'dark' ? dark : light;
}

// The store owns the mode and provides the resolved palette through ThemeCtx.
export const ThemeCtx = createContext<Palette>(light);
export const useTheme = () => useContext(ThemeCtx);
export const useSystemScheme = useColorScheme;

/** Theme-aware StyleSheet factory: const useStyles = makeStyles((c) => ({ ... })) */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
export function makeStyles<T extends NamedStyles<T>>(fn: (c: Palette) => T & NamedStyles<any>) {
  return () => {
    const c = useTheme();
    return useMemo(() => StyleSheet.create(fn(c)), [c]);
  };
}

/* ---------------- native map styles (Google / Android) ---------------- */
export const lightMapStyle = [
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1b1c1f' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8d93' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1b1c1f' }] },
  { featureType: 'landscape.natural.terrain', elementType: 'geometry', stylers: [{ color: '#202326' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#1d2a22' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2e33' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3c42' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9a9da3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a24' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
