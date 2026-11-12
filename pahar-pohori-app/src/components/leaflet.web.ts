/** Shared Leaflet helpers for the web build (react-native-maps has no web support). */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export { L };

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const TILE_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTR = OSM_ATTR;
export const TILE_DARK = TILE_OSM;

export type WebMapType = 'standard' | 'satellite' | 'terrain';

/** Realistic base maps (all free, attribution required). */
export function baseLayers(type: WebMapType, dark: boolean): L.TileLayer[] {
  if (type === 'satellite') {
    return [
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, opacity: 0.9,
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, opacity: 0.6,
      }),
    ];
  }
  if (type === 'terrain') {
    return [
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17, subdomains: 'abc',
        attribution: `${OSM_ATTR}, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
        className: dark ? 'pp-dim' : '',
      }),
    ];
  }
  if (dark) {
    return [L.tileLayer(TILE_OSM, { attribution: OSM_ATTR, maxZoom: 19, className: 'pp-osm-dark' })];
  }
  return [
    L.tileLayer(TILE_OSM, { attribution: OSM_ATTR, maxZoom: 19 }),
    // subtle relief so the hills read as hills
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16, opacity: 0.22, className: 'pp-multiply', attribution: 'Hillshade &copy; Esri',
    }),
  ];
}

let injected = false;
export function injectMapCss() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const css = `
  .pp-multiply{mix-blend-mode:multiply}
  .pp-dim{filter:brightness(.62) contrast(1.1) saturate(.8)}
  .pp-osm-dark{filter:invert(100%) hue-rotate(180deg) brightness(92%) contrast(90%)}
  .pp-pill.dk{background:#202125;color:#F3F4F6}
  .pp-pin.dk{border-color:#202125}
  .pp-report{width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center}
  .pp-arrow{width:26px;height:26px;border-radius:50%;background:#4DA3FF;border:3px solid #fff;box-sizing:border-box;box-shadow:0 0 0 8px rgba(77,163,255,.25);display:flex;align-items:center;justify-content:center}
  .pp-m{display:flex;flex-direction:column;align-items:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer}
  .pp-pill{display:flex;gap:6px;align-items:center;background:#fff;color:#111214;padding:5px 10px;border-radius:999px;
    font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.15);margin-bottom:4px}
  .pp-pill.sel{background:#111214;color:#fff}
  .pp-pill b{font-weight:700}
  .pp-pin{width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-sizing:border-box;display:flex;
    align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.2);transition:transform .2s}
  .pp-pin.sel{transform:scale(1.15)}
  .pp-shelter{width:22px;height:22px;border-radius:50%;background:#3B82F6;border:2px solid #fff;box-sizing:border-box;
    display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.2)}
  .pp-user{width:16px;height:16px;border-radius:50%;background:#4DA3FF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(77,163,255,.25)}
  .pp-dest{width:34px;height:34px;border-radius:50%;background:#E5484D;border:3px solid #fff;box-sizing:border-box;
    display:flex;align-items:center;justify-content:center}
  .leaflet-container{background:#E9E8E3;font-family:inherit}
  .pp-darkmap.leaflet-container{background:#0C0D0F}
  .pp-darkmap .leaflet-control-attribution{background:rgba(0,0,0,.5);color:#aaa}
  .pp-darkmap .leaflet-control-attribution a{color:#ccc}
  .pp-darkmap .leaflet-bar a{background:#202125;color:#eee;border-color:#333}
  .pp-dark.leaflet-container{background:#121315}
  .leaflet-control-attribution{font-size:9px}
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}

export const TRIANGLE_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="#fff" d="M12 3 2 21h20z"/></svg>';
export const HOME_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="#fff" d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg>';
export const FLAG_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#fff" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const MEGAPHONE_SVG =
  '<svg width="11" height="11" viewBox="0 0 24 24"><path fill="#fff" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
export const NAV_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="#fff" d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z"/></svg>';
