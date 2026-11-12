import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { hillName } from '../i18n';
import { useApp } from '../store';
import { useTheme } from '../theme';
import type { RiskMapProps } from './RiskMap';
import { hillVisual, pinColor } from './mapLayers';
import {
  HOME_SVG, L, MEGAPHONE_SVG, TRIANGLE_SVG, baseLayers, escapeHtml, injectMapCss,
} from './leaflet.web';

export default function RiskMap({
  hills, shelters = [], reports = [], selectedId, onSelect, onSelectShelter, user, focus, bottomInset = 0,
  mapType = 'standard', layer = 'risk', overrides, pin,
}: RiskMapProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.LayerGroup | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const cb = useRef({ onSelect, onSelectShelter });
  cb.current = { onSelect, onSelectShelter };
  const { lang } = useApp();
  const c = useTheme();

  // create the map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    injectMapCss();
    const map = L.map(divRef.current, { zoomControl: false, attributionControl: true }).setView([22.55, 92.15], 9);
    // pinch-zoom on phones; +/- buttons only on wide screens
    if (window.innerWidth >= 900) L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    map.on('click', () => cb.current.onSelect(null));
    baseRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(divRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // base map: standard / satellite / terrain, light or dark
  useEffect(() => {
    const g = baseRef.current;
    if (!g || !divRef.current) return;
    g.clearLayers();
    baseLayers(mapType, c.dark).forEach((t) => t.addTo(g));
    divRef.current.classList.toggle('pp-darkmap', c.dark || mapType === 'satellite');
  }, [mapType, c.dark]);

  // hills, data layer, shelters, reports, user
  useEffect(() => {
    const g = layerRef.current;
    if (!g) return;
    g.clearLayers();
    const dk = c.dark ? 'dk' : '';
    hills.forEach((h) => {
      const v = hillVisual(h, layer, overrides?.[h.hill_id]);
      L.circle([h.lat, h.lon], {
        radius: v.radius, color: v.color, weight: h.hill_id === selectedId ? 2.5 : 1.2,
        opacity: 0.85, fillColor: v.color, fillOpacity: v.fillAlpha, interactive: false,
      }).addTo(g);
    });
    shelters.forEach((s) => {
      L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: '', html: `<div class="pp-shelter">${HOME_SVG}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        title: s.name,
      }).on('click', (e) => { L.DomEvent.stopPropagation(e); cb.current.onSelectShelter?.(s); }).addTo(g);
    });
    reports.filter((r) => r.lat != null && r.lon != null).forEach((r) => {
      L.marker([r.lat!, r.lon!], {
        icon: L.divIcon({
          className: '', iconSize: [22, 22], iconAnchor: [11, 11],
          html: `<div class="pp-report" style="background:${r.severity === 'high' ? c.danger : c.watch}">${MEGAPHONE_SVG}</div>`,
        }),
        title: `${r.hazard_type}${r.description ? `: ${r.description}` : ''}`,
      }).addTo(g);
    });
    hills.forEach((h) => {
      const sel = h.hill_id === selectedId;
      const ov = overrides?.[h.hill_id];
      const v = hillVisual(h, layer, ov);
      const pc = pinColor(h, ov);
      const name = escapeHtml(hillName(lang, h.name).replace(/ Hill$| পাহাড়$/, ''));
      const html = `<div class="pp-m"><div class="pp-pill ${sel ? 'sel' : dk}">${name}<b style="color:${sel ? '#fff' : v.color}">${escapeHtml(v.label)}</b></div><div class="pp-pin ${sel ? 'sel' : ''} ${dk}" style="background:${pc}">${TRIANGLE_SVG}</div></div>`;
      L.marker([h.lat, h.lon], {
        icon: L.divIcon({ className: '', html, iconSize: [180, 64], iconAnchor: [90, 64] }),
        zIndexOffset: sel ? 1000 : h.status.level === 'DANGER' ? 500 : 0,
        title: h.name,
        keyboard: true,
      }).on('click', (e) => { L.DomEvent.stopPropagation(e); cb.current.onSelect(h.hill_id); }).addTo(g);
    });
    if (pin) {
      L.marker([pin.lat, pin.lon], {
        icon: L.divIcon({ className: '', iconSize: [28, 40], iconAnchor: [14, 40],
          html: '<svg width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 40 14 40s14-15.7 14-26.1C28 6.2 21.7 0 14 0z" fill="#EA4335"/><circle cx="14" cy="14" r="5" fill="#7A1A12"/></svg>' }),
        zIndexOffset: 3000, title: pin.label,
      }).addTo(g);
    }
    if (user) {
      L.marker([user.lat, user.lon], {
        icon: L.divIcon({ className: '', html: '<div class="pp-user"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        interactive: false,
      }).addTo(g);
    }
  }, [hills, shelters, reports, selectedId, user, lang, layer, overrides, c, pin]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    const map = mapRef.current;
    const z = focus.zoom ?? 12;
    const pt = map.project([focus.lat, focus.lon], z).add([0, bottomInset / 2]);
    map.flyTo(map.unproject(pt, z), z, { duration: 0.7 });
  }, [focus, bottomInset]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={divRef} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}
