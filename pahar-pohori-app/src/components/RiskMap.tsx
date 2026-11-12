import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, type MapType as RNMapType, type Region } from 'react-native-maps';
import { hillName } from '../i18n';
import { useApp } from '../store';
import { darkMapStyle, lightMapStyle, useTheme } from '../theme';
import type { CommunityReport, DataLayer, Hill, MapType, Shelter } from '../types';
import { hillVisual, pinColor, withAlpha, type HillOverride } from './mapLayers';

export interface RiskMapProps {
  hills: Hill[];
  shelters?: Shelter[];
  reports?: CommunityReport[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onSelectShelter?: (s: Shelter) => void;
  user?: { lat: number; lon: number } | null;
  focus?: { lat: number; lon: number; zoom?: number; key: number } | null;
  bottomInset?: number;
  mapType?: MapType;
  layer?: DataLayer;
  pitch3d?: boolean;
  overrides?: Record<number, HillOverride> | null;
  /** Dropped pin for a searched place. */
  pin?: { lat: number; lon: number; label: string } | null;
}

/** Chittagong Hill Tracts overview. */
export const CHT_REGION: Region = { latitude: 22.55, longitude: 92.15, latitudeDelta: 1.7, longitudeDelta: 1.1 };

function nativeMapType(t: MapType): RNMapType {
  if (t === 'satellite') return 'hybrid';
  if (t === 'terrain') return Platform.OS === 'android' ? 'terrain' : 'mutedStandard';
  return 'standard';
}

export default function RiskMap({
  hills, shelters = [], reports = [], selectedId, onSelect, onSelectShelter, user, focus, bottomInset = 0,
  mapType = 'standard', layer = 'risk', pitch3d = false, overrides, pin,
}: RiskMapProps) {
  const ref = useRef<MapView>(null);
  const { lang } = useApp();
  const c = useTheme();

  useEffect(() => {
    if (!focus) return;
    ref.current?.animateCamera(
      { center: { latitude: focus.lat, longitude: focus.lon }, zoom: focus.zoom ?? 12, pitch: pitch3d ? 60 : 0, altitude: 12000 },
      { duration: 700 },
    );
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ref.current?.animateCamera({ pitch: pitch3d ? 60 : 0, heading: pitch3d ? 20 : 0 }, { duration: 600 });
  }, [pitch3d]);

  const styled = mapType === 'standard';

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={CHT_REGION}
      mapType={nativeMapType(mapType)}
      customMapStyle={styled ? (c.dark ? darkMapStyle : lightMapStyle) : undefined}
      userInterfaceStyle={c.dark ? 'dark' : 'light'}
      showsUserLocation={!!user}
      showsMyLocationButton={false}
      showsCompass={pitch3d}
      showsBuildings
      showsScale
      pitchEnabled
      rotateEnabled
      toolbarEnabled={false}
      mapPadding={{ top: 0, left: 0, right: 0, bottom: bottomInset }}
      onPress={(e) => { if (e.nativeEvent.action !== 'marker-press') onSelect(null); }}
    >
      {hills.map((h) => {
        const v = hillVisual(h, layer, overrides?.[h.hill_id]);
        return (
          <Circle
            key={`c${h.hill_id}-${layer}`}
            center={{ latitude: h.lat, longitude: h.lon }}
            radius={v.radius}
            fillColor={withAlpha(v.color, v.fillAlpha)}
            strokeColor={withAlpha(v.color, 0.8)}
            strokeWidth={h.hill_id === selectedId ? 2.5 : 1}
          />
        );
      })}

      {shelters.map((s) => (
        <Marker key={`s${s.shelter_id}`} coordinate={{ latitude: s.lat, longitude: s.lon }}
          onPress={() => onSelectShelter?.(s)} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }} title={s.name}>
          <View style={[styles.round, { backgroundColor: c.info }]}><Ionicons name="home" size={12} color="#fff" /></View>
        </Marker>
      ))}

      {reports.filter((r) => r.lat != null && r.lon != null).map((r) => (
        <Marker key={`r${r.id}`} coordinate={{ latitude: r.lat!, longitude: r.lon! }} tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }} title={r.hazard_type} description={r.description}>
          <View style={[styles.round, { backgroundColor: r.severity === 'high' ? c.danger : c.watch }]}>
            <Ionicons name="megaphone" size={11} color="#fff" />
          </View>
        </Marker>
      ))}

      {pin && (
        <Marker coordinate={{ latitude: pin.lat, longitude: pin.lon }} title={pin.label} pinColor="#EA4335" zIndex={20} />
      )}

      {hills.map((h) => {
        const sel = h.hill_id === selectedId;
        const ov = overrides?.[h.hill_id];
        const v = hillVisual(h, layer, ov);
        const pc = pinColor(h, ov);
        return (
          <Marker
            key={`m${h.hill_id}-${sel ? 1 : 0}-${lang}-${layer}-${v.label}-${c.dark ? 1 : 0}`}
            coordinate={{ latitude: h.lat, longitude: h.lon }}
            onPress={() => onSelect(h.hill_id)}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={sel ? 10 : h.status.level === 'DANGER' ? 5 : 1}
            accessibilityLabel={`${h.name} ${h.status.level}`}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.pill, { backgroundColor: sel ? c.chipOn : c.elevated }]}>
                <Text style={[styles.pillText, { color: sel ? c.chipOnText : c.ink }]} numberOfLines={1}>
                  {hillName(lang, h.name).replace(/ Hill$| পাহাড়$/, '')}
                </Text>
                <Text style={[styles.pillPct, { color: sel ? c.chipOnText : v.color }]}>{v.label}</Text>
              </View>
              <View style={[styles.pin, { backgroundColor: pc, borderColor: c.elevated, transform: [{ scale: sel ? 1.15 : 1 }] }]}>
                <Ionicons name="triangle" size={12} color="#fff" />
              </View>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 999, marginBottom: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  pillText: { fontSize: 12, fontWeight: '600', maxWidth: 110 },
  pillPct: { fontSize: 12, fontWeight: '700' },
  pin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  round: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});
