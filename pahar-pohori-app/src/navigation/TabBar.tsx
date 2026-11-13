import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const BRAND_MARK = require('../../assets/brand-mark.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StringKey } from '../i18n';
import { useApp } from '../store';
import { makeStyles, shadow, useTheme } from '../theme';
import type { IconName } from '../components/ui';

const BAR_H = 66;

const TABS: Record<string, { icon: IconName; iconActive: IconName; label: StringKey }> = {
  Map: { icon: 'map-outline', iconActive: 'map', label: 'tabMap' },
  Alerts: { icon: 'notifications-outline', iconActive: 'notifications', label: 'tabAlerts' },
  SOS: { icon: 'call', iconActive: 'call', label: 'tabSOS' },
  Shelters: { icon: 'home-outline', iconActive: 'home', label: 'tabShelters' },
  More: { icon: 'grid-outline', iconActive: 'grid', label: 'tabMore' },
};

/** Space screens must leave at the bottom so content is not hidden behind the floating bar. */
export const RAIL_BREAKPOINT = 900;
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (width >= RAIL_BREAKPOINT) return 0; // desktop: navigation rail on the left instead
  return BAR_H + Math.max(insets.bottom, 12) + 4;
}

/** Desktop navigation rail (left edge), like big-screen maps apps. */
function Rail({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t, alerts } = useApp();
  const c = useTheme();
  const recent = alerts.filter((a) => new Date(a.created_at).getTime() > Date.now() - 864e5).length;
  return (
    <View style={{ width: 84, backgroundColor: c.surface, borderRightWidth: 1, borderColor: c.line, paddingTop: insets.top + 14, alignItems: 'center', gap: 6 }}>
      <Pressable
        onPress={() => navigation.navigate('Map')}
        accessibilityRole="button"
        accessibilityLabel={t('appName')}
        style={({ pressed }) => ({
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: c.dark ? c.surfaceAlt : '#FFFFFF',
          borderWidth: 1, borderColor: c.line,
          alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Image source={BRAND_MARK} style={{ width: 32, height: 32 }} resizeMode="contain" />
      </Pressable>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const cfg = TABS[route.name];
        const sos = route.name === 'SOS';
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(cfg.label)}
            style={({ pressed }) => [
              { alignItems: 'center', gap: 4, paddingVertical: 8, width: 76 },
              pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
              Platform.select({ web: { cursor: 'pointer', transition: 'transform 0.12s ease, opacity 0.12s ease' } as object, default: {} }),
            ]}
          >
            <View style={{ width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              backgroundColor: sos ? c.danger : focused ? (c.dark ? '#1C2A3D' : '#E8F0FE') : 'transparent' }}>
              <Ionicons name={focused ? cfg.iconActive : cfg.icon} size={21} color={sos ? '#fff' : focused ? (c.dark ? '#8AB4F8' : '#1A73E8') : c.inkSoft} />
              {route.name === 'Alerts' && recent > 0 && (
                <View style={{ position: 'absolute', top: 0, right: 10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{recent}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11, fontWeight: focused || sos ? '700' : '500', color: sos ? c.danger : focused ? c.ink : c.muted }} numberOfLines={1}>{t(cfg.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Floating pill tab bar (Aurex sample) with a raised red SOS button in the centre (nav sample). */
export default function TabBar(props: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  if (width >= RAIL_BREAKPOINT) return <Rail {...props} />;
  return <BottomBar {...props} />;
}

function BottomBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t, alerts } = useApp();
  const colors = useTheme();
  const styles = useStyles();
  const dayAgo = Date.now() - 864e5;
  const recentAlerts = alerts.filter((a) => new Date(a.created_at).getTime() > dayAgo).length;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.bar, shadow]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const cfg = TABS[route.name];
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          if (route.name === 'SOS') {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.item,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] },
                  Platform.select({ web: { cursor: 'pointer', transition: 'transform 0.12s ease, opacity 0.12s ease' } as object, default: {} }),
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('tabSOS')}
              >
                <View style={styles.sos}><Ionicons name="call" size={24} color="#fff" /></View>
                <Text style={[styles.label, { color: colors.danger, fontWeight: '700' }]}>{t('tabSOS')}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] },
                Platform.select({ web: { cursor: 'pointer', transition: 'transform 0.12s ease, opacity 0.12s ease' } as object, default: {} }),
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(cfg.label)}
            >
              <View>
                <Ionicons name={focused ? cfg.iconActive : cfg.icon} size={22} color={focused ? colors.ink : colors.muted} />
                {route.name === 'Alerts' && recentAlerts > 0 && (
                  <View style={styles.dot}><Text style={styles.dotText}>{recentAlerts}</Text></View>
                )}
              </View>
              <Text style={[styles.label, focused && { color: colors.ink, fontWeight: '700' }]} numberOfLines={1}>
                {t(cfg.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 34, height: BAR_H, width: '100%',
    maxWidth: 560, alignItems: 'center', paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
  label: { fontSize: 11, color: colors.muted, fontWeight: '500' },
  sos: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.danger, alignItems: 'center',
    justifyContent: 'center', marginTop: -26, borderWidth: 4, borderColor: colors.surface,
  },
  dot: {
    position: 'absolute', top: -4, right: -9, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.surface,
  },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
}));
