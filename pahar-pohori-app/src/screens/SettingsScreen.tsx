import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api, defaultApiUrl } from '../api';
import { Button, Card, Screen, SectionTitle, Segmented, T } from '../components/ui';
import { useApp } from '../store';
import { font, makeStyles, radius, space, useTheme } from '../theme';

export default function SettingsScreen() {
  const colors = useTheme();
  const styles = useStyles();
  const { t, settings, updateSettings, lang } = useApp();
  const [url, setUrl] = useState(settings.apiUrl);
  const [test, setTest] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle');

  const runTest = async () => {
    setTest('busy');
    try { await api.ping(url.replace(/\/$/, '')); setTest('ok'); } catch { setTest('fail'); }
  };

  return (
    <Screen back backTo="More" title={t('settingsTitle')}>
      <SectionTitle title={t('language')} style={{ marginTop: 0 }} />
      <Segmented value={lang} onChange={(l) => updateSettings({ lang: l })}
        options={[{ key: 'en', label: 'English' }, { key: 'bn', label: 'বাংলা' }]} />

      <SectionTitle title={t('theme')} />
      <Segmented value={settings.theme} onChange={(v) => updateSettings({ theme: v })} options={[
        { key: 'system', label: t('themeSystem'), icon: 'phone-portrait-outline' },
        { key: 'light', label: t('themeLight'), icon: 'sunny' },
        { key: 'dark', label: t('themeDark'), icon: 'moon' },
      ]} />

      <SectionTitle title={t('notifications')} />
      <Card style={{ gap: space.lg }}>
        <Row icon="notifications" title={t('notifications')} body={t('notificationsBody')}
          value={settings.notifications} onChange={(v) => updateSettings({ notifications: v })} />
        <Row icon="refresh" title={t('autoRefresh')} value={settings.autoRefresh}
          onChange={(v) => updateSettings({ autoRefresh: v })} />
        <Row icon="volume-high" title={t('voiceGuidance')} value={settings.voice}
          onChange={(v) => updateSettings({ voice: v })} />
      </Card>

      <SectionTitle title={t('server')} />
      <Card style={{ gap: space.md }}>
        <T style={[font.small, { color: colors.muted }]}>{t('serverHint')}</T>
        <TextInput value={url} onChangeText={(v) => { setUrl(v); setTest('idle'); }} autoCapitalize="none" autoCorrect={false}
          keyboardType="url" style={styles.input} accessibilityLabel={t('server')} />
        {test === 'ok' && <Status ok text={t('connected')} />}
        {test === 'fail' && <Status text={t('notConnected')} />}
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button compact variant="soft" icon="pulse" label={t('testConnection')} onPress={runTest} loading={test === 'busy'} />
          <Button compact icon="save" label={t('save')} onPress={() => updateSettings({ apiUrl: url.replace(/\/$/, '') })} />
          <Button compact variant="outline" label={t('resetDefault')} onPress={() => { const d = defaultApiUrl(); setUrl(d); updateSettings({ apiUrl: d }); }} />
        </View>
      </Card>
    </Screen>
  );
}

function Row({ icon, title, body, value, onChange }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const colors = useTheme();
  const styles = useStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Ionicons name={icon} size={20} color={colors.inkSoft} />
      <View style={{ flex: 1 }}>
        <T style={font.h3}>{title}</T>
        {!!body && <T style={[font.small, { color: colors.muted }]}>{body}</T>}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function Status({ ok, text }: { ok?: boolean; text: string }) {
  const colors = useTheme();
  const styles = useStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={18} color={ok ? colors.safe : colors.danger} />
      <T style={[font.small, { color: ok ? colors.safe : colors.danger }]}>{text}</T>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  segment: { flexDirection: 'row', backgroundColor: colors.chip, borderRadius: radius.pill, padding: 4 },
  seg: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.ink },
  segText: { fontWeight: '600', color: colors.inkSoft, fontSize: 15 },
  input: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.ink,
  },
}));
