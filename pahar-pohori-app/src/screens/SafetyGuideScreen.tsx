import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Screen, T, digits, useResponsive, type IconName } from '../components/ui';
import { GUIDE } from '../i18n';
import { useApp } from '../store';
import { font, makeStyles, space, useTheme, light } from '../theme';

const COLOR = { warningSigns: light.danger, before: light.info, during: light.watch, after: light.safe };

export default function SafetyGuideScreen() {
  const colors = useTheme();
  const styles = useStyles();
  const { t, lang } = useApp();
  const { isTablet } = useResponsive();
  const sections = GUIDE[lang];
  const [open, setOpen] = useState<Record<string, boolean>>({ warningSigns: true, during: true });

  return (
    <Screen back backTo="More" title={t('guideTitle')} subtitle={t('moreSafetyBody')}>
      <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap', gap: space.md }}>
        {sections.map((s) => {
          const isOpen = isTablet || open[s.key];
          const c = COLOR[s.key];
          return (
            <Card key={s.key} style={{ width: isTablet ? '48.8%' : '100%', gap: space.md }}>
              <Pressable onPress={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))} style={styles.head}
                accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                <View style={[styles.icon, { backgroundColor: `${c}1A` }]}><Ionicons name={s.icon as IconName} size={20} color={c} /></View>
                <T style={[font.h2, { flex: 1 }]}>{t(s.key)}</T>
                {!isTablet && <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />}
              </Pressable>
              {isOpen && s.items.map((it, i) => (
                <View key={it} style={styles.item}>
                  <View style={[styles.num, { backgroundColor: c }]}><T style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{digits(lang, i + 1)}</T></View>
                  <T style={[font.body, { flex: 1, lineHeight: 22 }]}>{it}</T>
                </View>
              ))}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
}));
