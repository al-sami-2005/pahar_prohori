import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, SectionTitle, T, digits, useResponsive, type IconName } from '../components/ui';
import type { RootStack } from '../navigation';
import { useApp } from '../store';
import { font, makeStyles, radius, space, useTheme } from '../theme';
import { callNumber, mapsLink, nearestShelters } from '../utils';

const HOLD_MS = 1200;

export default function SOSScreen() {
  const colors = useTheme();
  const styles = useStyles();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { contacts, t, lang, requestLocation, location, shelters } = useApp();
  const { cols } = useResponsive();
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const primary = contacts.find((c) => c.primary) ?? { number: '999' };

  const startHold = () => {
    setHolding(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    Animated.timing(progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        callNumber(primary.number);
        progress.setValue(0);
        setHolding(false);
      }
    });
  };
  const cancelHold = () => {
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    setHolding(false);
  };

  const shareWith = async (prefix: string) => {
    const c = location ?? (await requestLocation());
    const where = c ? mapsLink(c.lat, c.lon) : t('locationUnknown');
    Share.share({ message: `${prefix} ${where}` }).catch(() => undefined);
  };

  const findShelter = async () => {
    const c = location ?? (await requestLocation());
    if (c) {
      const s = nearestShelters(c.lat, c.lon, shelters, 1)[0];
      if (s) { nav.navigate('Route', { shelterId: s.shelter_id }); return; }
    }
    nav.navigate('Tabs', { screen: 'Shelters' });
  };

  const fill = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const actionW = cols(1, 3, 3) === 3 ? '32%' : '100%';

  return (
    <Screen title={t('sosTitle')} subtitle={t('sosSubtitle')}>
      <View style={styles.sosWrap}>
        <Pressable
          onPressIn={startHold}
          onPressOut={cancelHold}
          accessibilityRole="button"
          accessibilityLabel={`${t('holdToCall')} ${primary.number}`}
          style={styles.ring}
        >
          <View style={styles.sos}>
            <Animated.View style={[styles.fill, { height: fill }]} />
            <Ionicons name="call" size={44} color="#fff" />
            <Text style={styles.sosNum}>{digits(lang, primary.number)}</Text>
            <Text style={styles.sosHint}>{holding ? '…' : t('holdToCall')}</Text>
          </View>
        </Pressable>
      </View>

      <SectionTitle title={t('quickActions')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md }}>
        <QuickAction width={actionW} icon="navigate" color={colors.info} title={t('findShelter')} body={t('findShelterBody')} onPress={findShelter} />
        <QuickAction width={actionW} icon="location" color={colors.danger} title={t('shareLocation')} body={t('shareLocationBody')}
          onPress={() => shareWith(t('sosMessage'))} />
        <QuickAction width={actionW} icon="happy" color={colors.safe} title={t('imSafe')} body={t('imSafeBody')}
          onPress={() => shareWith(t('safeMessage'))} />
      </View>

      <SectionTitle title={t('hotlines')} />
      <View style={{ gap: space.md }}>
        {contacts.map((c) => (
          <Card key={c.id} onPress={() => callNumber(c.number)} style={styles.hotline}>
            <View style={[styles.hotIcon, c.primary && { backgroundColor: colors.danger }]}>
              <Ionicons name="call" size={18} color={c.primary ? '#fff' : colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={font.h3}>{lang === 'bn' ? c.name_bn : c.name}</T>
              <T style={[font.small, { color: colors.muted }]}>{lang === 'bn' ? c.description_bn : c.description}</T>
            </View>
            <Text style={styles.hotNum}>{digits(lang, c.number)}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function QuickAction({ icon, color, title, body, onPress, width }: {
  icon: IconName; color: string; title: string; body: string; onPress: () => void; width: string;
}) {
  const colors = useTheme();
  const styles = useStyles();
  return (
    <Card onPress={onPress} style={{ width: width as `${number}%`, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={[styles.qaIcon, { backgroundColor: `${color}1F` }]}><Ionicons name={icon} size={20} color={color} /></View>
      <View style={{ flex: 1 }}>
        <T style={font.h3}>{title}</T>
        <T style={[font.small, { color: colors.muted }]}>{body}</T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  sosWrap: { alignItems: 'center', paddingVertical: space.lg },
  ring: { padding: 14, borderRadius: 999, backgroundColor: colors.tint.DANGER },
  sos: {
    width: 190, height: 190, borderRadius: 95, backgroundColor: colors.danger, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden', gap: 2,
  },
  fill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#B42328' },
  sosNum: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  sosHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  hotline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hotIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  hotNum: { fontSize: 22, fontWeight: '800', color: colors.ink },
  qaIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
}));
