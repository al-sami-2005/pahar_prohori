import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { districtName, facilityKey } from '../i18n';
import { useApp } from '../store';
import { font, radius, space, useTheme } from '../theme';
import type { Shelter } from '../types';
import { callNumber } from '../utils';
import { Button, Card, T, digits, type IconName } from './ui';

const FAC_ICON: Record<string, IconName> = {
  water: 'water', toilet: 'man', first_aid: 'medkit', food: 'restaurant', power: 'flash',
};

export function ShelterCard({ shelter, onRoute, compact }: { shelter: Shelter; onRoute: () => void; compact?: boolean }) {
  const { lang, t } = useApp();
  const c = useTheme();
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.infoTint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="home" size={20} color={c.info} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={font.h3} numberOfLines={2}>{lang === 'bn' ? shelter.name_bn : shelter.name}</T>
          <T muted style={font.small}>{districtName(lang, shelter.district)} · {digits(lang, shelter.capacity)} {t('capacity')}</T>
        </View>
        {shelter.distance_km != null && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{digits(lang, shelter.distance_km.toFixed(1))}</Text>
            <Text style={{ fontSize: 10, color: c.muted }}>{t('kmAway')}</Text>
          </View>
        )}
      </View>
      {!compact && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {shelter.facilities.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill }}>
              <Ionicons name={FAC_ICON[f] ?? 'checkmark'} size={12} color={c.inkSoft} />
              <Text style={{ fontSize: 11, color: c.inkSoft, fontWeight: '500' }}>{t(facilityKey(f))}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button compact label={t('route')} icon="navigate" onPress={onRoute} style={{ flex: 1 }} />
        <Button compact variant="soft" label={`${t('call')} ${digits(lang, shelter.phone)}`} icon="call"
          onPress={() => callNumber(shelter.phone)} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}
