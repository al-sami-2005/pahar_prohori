import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { nav } from '../theme';
import type { RouteMapProps } from './RouteMap';
import { HOME_SVG, L, NAV_SVG, baseLayers, injectMapCss } from './leaflet.web';

export default function RouteMap({ origin, dest, route, user, follow, mapType = 'standard', bottomInset = 0 }: RouteMapProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.LayerGroup | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    injectMapCss();
    const map = L.map(divRef.current, { zoomControl: false }).setView([origin.lat, origin.lon], 13);
    L.control.scale({ position: 'topright', imperial: false }).addTo(map);
    baseRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(divRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const g = baseRef.current;
    if (!g) return;
    g.clearLayers();
    baseLayers(mapType, true).forEach((t) => t.addTo(g));
  }, [mapType]);

  useEffect(() => {
    const map = mapRef.current;
    const g = layerRef.current;
    if (!map || !g) return;
    g.clearLayers();
    const pts: L.LatLngTuple[] = route?.coords.map((c) => [c.latitude, c.longitude]) ?? [[origin.lat, origin.lon], [dest.lat, dest.lon]];
    L.polyline(pts, { color: '#1E5FAF', weight: 10, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(g);
    L.polyline(pts, { color: nav.blue, weight: 5, opacity: 1, dashArray: route && !route.real ? '8 8' : undefined }).addTo(g);
    L.marker(pts[0], { icon: L.divIcon({ className: '', html: '<div class="pp-user"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(g);
    L.marker([dest.lat, dest.lon], { icon: L.divIcon({ className: '', html: `<div class="pp-dest">${HOME_SVG}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] }) }).addTo(g);
    if (!follow) map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [60, 110], paddingBottomRight: [60, bottomInset + 40], maxZoom: 16 });
  }, [route, origin.lat, origin.lon, dest.lat, dest.lon, bottomInset, follow]);

  // live position arrow + follow camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userRef.current?.remove();
    userRef.current = null;
    if (!user) return;
    const rot = user.heading ?? 0;
    userRef.current = L.marker([user.lat, user.lon], {
      icon: L.divIcon({ className: '', html: `<div class="pp-arrow" style="transform:rotate(${rot}deg)">${NAV_SVG}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
      zIndexOffset: 2000,
    }).addTo(map);
    if (follow) map.setView([user.lat, user.lon], Math.max(map.getZoom(), 17), { animate: true });
  }, [user?.lat, user?.lon, user?.heading, follow]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={divRef} className="pp-dark pp-darkmap" style={{ position: 'absolute', inset: 0, background: nav.bg }} />
    </View>
  );
}
