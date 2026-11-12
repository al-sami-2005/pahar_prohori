import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { darkMapStyle, nav } from '../theme';
import type { MapType, RoadRoute } from '../types';

export interface RouteMapProps {
  origin: { lat: number; lon: number };
  dest: { lat: number; lon: number };
  route: RoadRoute | null;
  /** Live GPS position while navigating. */
  user?: { lat: number; lon: number; heading?: number | null } | null;
  follow?: boolean;
  mapType?: MapType;
  bottomInset?: number;
}

export default function RouteMap({ origin, dest, route, user, follow, mapType = 'standard', bottomInset = 0 }: RouteMapProps) {
  const ref = useRef<MapView>(null);
  const coords = route?.coords ?? [
    { latitude: origin.lat, longitude: origin.lon },
    { latitude: dest.lat, longitude: dest.lon },
  ];

  // overview: fit the whole route
  useEffect(() => {
    if (follow) return;
    const id = setTimeout(() => {
      ref.current?.fitToCoordinates(coords, {
        edgePadding: { top: 120, right: 60, bottom: bottomInset + 40, left: 60 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [route, follow, bottomInset]); // eslint-disable-line react-hooks/exhaustive-deps

  // navigation: 3D camera behind the walker, like a car sat-nav
  useEffect(() => {
    if (!follow || !user) return;
    ref.current?.animateCamera(
      { center: { latitude: user.lat, longitude: user.lon }, heading: user.heading ?? 0, pitch: 55, zoom: 17.5 },
      { duration: 800 },
    );
  }, [follow, user?.lat, user?.lon, user?.heading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      mapType={mapType === 'satellite' ? 'hybrid' : mapType === 'terrain' ? 'terrain' : 'standard'}
      customMapStyle={mapType === 'standard' ? darkMapStyle : undefined}
      userInterfaceStyle="dark"
      initialRegion={{
        latitude: (origin.lat + dest.lat) / 2, longitude: (origin.lon + dest.lon) / 2,
        latitudeDelta: Math.abs(origin.lat - dest.lat) * 3 + 0.02,
        longitudeDelta: Math.abs(origin.lon - dest.lon) * 3 + 0.02,
      }}
      showsUserLocation={!!user}
      followsUserLocation={false}
      showsCompass={false}
      showsBuildings
      pitchEnabled
      toolbarEnabled={false}
      mapPadding={{ top: 0, left: 0, right: 0, bottom: bottomInset }}
    >
      <Polyline coordinates={coords} strokeColor="#1E5FAF" strokeWidth={9} lineCap="round" lineJoin="round" />
      <Polyline coordinates={coords} strokeColor={nav.blue} strokeWidth={5} lineCap="round" lineJoin="round"
        lineDashPattern={route && !route.real ? [8, 8] : undefined} />
      {!user && (
        <Marker coordinate={coords[0]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.user} />
        </Marker>
      )}
      <Marker coordinate={{ latitude: dest.lat, longitude: dest.lon }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
        <View style={styles.dest}><Ionicons name="home" size={14} color="#fff" /></View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  user: { width: 18, height: 18, borderRadius: 9, backgroundColor: nav.blue, borderWidth: 3, borderColor: '#fff' },
  dest: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5484D', borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
});
