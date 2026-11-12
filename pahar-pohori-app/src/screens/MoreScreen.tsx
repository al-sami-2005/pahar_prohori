import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, SectionTitle, Segmented, StatusBadge, T, type IconName } from '../components/ui';
import type { StringKey } from '../i18n';
import type { RootStack } from '../navigation';
import { useApp } from '../store';
import { font, makeStyles, radius, space, useTheme, light } from '../theme';
import type { Level } from '../types';

type Item = { icon: IconName; color: string; title: StringKey; body: StringKey; to: keyof RootStack };

const HELP: Item[] = [
  { icon: 'pulse', color: light.safe, title: 'moreModel', body: 'moreModelBody', to: 'AboutModel' },
  { icon: 'book', color: light.safe, title: 'moreSafety', body: 'moreSafetyBody', to: 'SafetyGuide' },
  { icon: 'megaphone', color: light.watch, title: 'moreReport', body: 'moreReportBody', to: 'Report' },
];
const APP: Item[] = [
  { icon: 'settings', color: light.inkSoft, title: 'moreSettings', body: 'moreSettingsBody', to: 'Settings' },
];

export default function MoreScreen() {
  const colors = useTheme();
  const styles = useStyles();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { t, lang, updateSettings, settings } = useApp();

  const renderItems = (items: Item[]) => (
    <Card style={{ padding: 0 }}>
      {items.map((it, i) => (
        <Pressable key={it.to} onPress={() => nav.navigate(it.to as never)}
          style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.icon, { backgroundColor: `${it.color}1A` }]}><Ionicons name={it.icon} size={20} color={it.color} /></View>
          <View style={{ flex: 1 }}>
            <T style={font.h3}>{t(it.title)}</T>
            <T style={[font.small, { color: colors.muted }]}>{t(it.body)}</T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </Card>
  );

  return (
    <Screen title={t('moreTitle')} subtitle={t('tagline')}>
      <View style={styles.brand}>
        <View style={styles.logo}><Ionicons name="triangle" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <T style={font.h2}>{t('appName')}</T>
          <T style={[font.small, { color: colors.muted }]}>NASA Space Apps · NISAR</T>
        </View>
        <View style={styles.langSwitch}>
          {(['en', 'bn'] as const).map((l) => (
            <Pressable key={l} onPress={() => updateSettings({ lang: l })} style={[styles.langBtn, lang === l && styles.langOn]}>
              <Text style={[styles.langText, lang === l && { color: colors.chipOnText }]}>{l === 'en' ? 'EN' : 'বাং'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <SectionTitle title={t('sectionHelp')} />
      {renderItems(HELP)}

      <SectionTitle title={t('theme')} />
      <Segmented value={settings.theme} onChange={(v) => updateSettings({ theme: v })} options={[
        { key: 'system', label: t('themeSystem'), icon: 'phone-portrait-outline' },
        { key: 'light', label: t('themeLight'), icon: 'sunny' },
        { key: 'dark', label: t('themeDark'), icon: 'moon' },
      ]} />

      <SectionTitle title={t('moreLegend')} />
      <Card style={{ gap: space.md }}>
        {(['DANGER', 'WATCH', 'SAFE'] as Level[]).map((l) => (
          <View key={l} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ width: 96 }}><StatusBadge level={l} /></View>
            <T style={[font.small, { flex: 1, color: colors.inkSoft }]}>
              {t(l === 'DANGER' ? 'dangerHeadline' : l === 'WATCH' ? 'watchHeadline' : 'safeHeadline')}
            </T>
          </View>
        ))}
      </Card>

      <SectionTitle title={t('sectionApp')} />
      {renderItems(APP)}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, padding: space.lg, borderRadius: radius.lg },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  langSwitch: { flexDirection: 'row', backgroundColor: colors.chip, borderRadius: 999, padding: 3 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  langOn: { backgroundColor: colors.chipOn },
  langText: { fontWeight: '700', fontSize: 13, color: colors.inkSoft },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
}));
