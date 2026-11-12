# Pahar Pohori — Hill Landslide Early Warning (React Native / Expo)

Mobile + tablet + web app for the people living in the Chittagong Hill Tracts.
It shows every monitored hill on a map with a **SAFE / WATCH / DANGER** status, tells people
what to do, guides them to the nearest shelter, and lets them report hazards.

Built with **Expo SDK 58**, React Native 0.88, TypeScript, React Navigation 7,
`react-native-maps` (iOS/Android) and Leaflet (web).

**Map API keys:** none needed for development (Expo Go, web). For an Android store build add a
Google *Maps SDK for Android* key in `app.json → android.config.googleMaps.apiKey`.

---

## 1. Run it

```bash
# terminal 1: backend (from ../backend)
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000      # --host 0.0.0.0 so phones on Wi-Fi can reach it

# terminal 2 — app
cd pahar-pohori-app
npm install
npx expo start            # scan the QR code with Expo Go (same Wi-Fi as your computer)
#   press w  → open in the browser (responsive desktop layout)
#   press a / i → Android emulator / iOS simulator
```

The app finds the backend automatically (same IP as the Expo dev server, port 8000).
If it can't, open **More → Settings → Server address** and type e.g. `http://192.168.0.10:8000`,
or start Expo with `EXPO_PUBLIC_API_URL=http://192.168.0.10:8000 npx expo start`.

**No backend running?** The app still works: it shows the last saved data (offline mode) or a
built-in demo snapshot taken from this backend, with a banner saying so.

---

## 2. Features (where to find them)

| Tab / screen | What people can do |
|---|---|
| **Map** (home) | All hills as coloured pins + risk circles (bigger circle = higher chance). Filter chips *All / Danger / Watch / Safe* with counts, district picker, search (English or Bangla), "near me" button, shelters layer, colour legend. Tap a hill → floating card with status, chance %, slope, soil moisture, shaking and a *Nearest shelter* button. Phone: hill carousel at the bottom sorted by risk. Tablet/desktop: side panel list + big map. |
| **Hill detail** | Big status + 24 h landslide chance, NISAR-verified badge, "danger until" time, **What should I do now?** (step list per level), *Why this status* (model reasons, translated), 5 live sensor tiles with alert levels, 7-day chart with touch scrubbing for each sensor, NISAR satellite panel, 3 nearest shelters, community reports, *Report a hazard here*, share status. |
| **Alerts** | Red banner of hills in Danger right now, every DANGER alert from the backend in Bangla/English (toggle to show both), filter by hill, buttons to open the hill or route to a shelter. Badge on the tab shows alerts in the last 24 h. |
| **SOS** (red centre button) | Press-and-hold 999 button (prevents pocket calls), *Find a shelter*, *Send my location*, *I'm safe* message, hotline list (999, 1090, 333) from the backend. |
| **Shelters** | Every shelter with capacity, facilities, distance (when location is on), search, district filter, Call and Route buttons. |
| **Route** (dark screen) | Map line from you (or the hill) to the shelter, distance, walk/drive time, arrival time, direction, *Start navigation* (opens Google Maps), Share / Finish / Call. |
| **More** | Language switch, Safety guide (warning signs, before / during / after), Report a hazard, status colour legend, Settings, How the prediction works. |
| **Report a hazard** | 4 steps: hill → what you saw (crack, seepage, tilting, rockfall, small slide, other) → severity → details + optional GPS/name/phone. Saved and re-sent automatically if offline. |
| **Settings** | English / বাংলা, danger notifications, auto-refresh every minute, server address with connection test. |
| **How the prediction works** | Sensors → Satellite → AI → Alert flow, the Danger rule, ROC-AUC and feature importance bars. |

Everything is bilingual (English / বাংলা, including Bangla digits, hill names and model reasons).

### Version 3 — maps-app layout + Live Watch

| Feature | Where |
|---|---|
| **Familiar maps-app layout** (own Pahar Pohori branding) | Search bar on top, category chips (Danger / Watch / Safe / Shelters / Reports / Soil / NISAR / 7-day replay / Saved / District), draggable bottom sheet (peek · half · full), blue *Shelter* directions button, my-location button, layers + dark-mode buttons. Desktop: left navigation rail + 420 px side panel + full map. |
| **Search anything** | Hills, shelters and districts instantly; any village/town/road in Bangladesh via OpenStreetMap; recent searches. |
| **Place cards** | Hill: chance %, action pills (Directions to shelter · Start live navigation · Save · Listen · Share · Report) and tabs *Overview / Sensors / Rain / Reports*. Shelter: Directions, Start, Call, Save, facilities, hills nearby. Searched place: safety check (Danger hill within 10 km?) + route to nearest shelter **from that place**. |
| **Saved places** | Bookmark hills, shelters or places; *Saved* chip lists them with live status. |
| **Live Watch page** | *LIVE · 6 sensors* pill on the map or *More → Live watch*: pipeline Sensors → NISAR → Model → Alerts, live counters, per-hill nodes, soil sparkline, and event log. Data from `/api/system-status` + `/api/live-feed`. |

### Version 2 additions

| Feature | Where | How it works |
|---|---|---|
| **Dark theme** | Moon/sun button on the map, *More → Appearance*, *Settings*, layers sheet | System / Light / Dark. Every screen, chart and map switches instantly (`theme.ts` → `useTheme`, `makeStyles`). |
| **Realistic maps** | Layers button on the map | *Standard* (street map with hill shading), *Satellite* (real imagery with labels and roads), *Terrain* (contour/topographic map). On phones: **3D tilt** with buildings and rotation. |
| **Data layers** | Layers sheet | Show hills by *Landslide risk*, *Ground creep from NISAR radar* (mm/month), or *Soil moisture* from the ground sensors. Community reports appear on the map as markers. |
| **7-day risk replay** | Clock button on the map | Calls `GET /api/risk-timeline`, which re-runs the trained model every hour over the 7-day sensor archive. Press play to watch the hills change colour; drag to scrub. Red bands on the timeline mark hours with Danger. |
| **Rain outlook** | Hill page + hill card | Open-Meteo forecast (free, no key): past 48 h, next 24 h and next 3 days in mm, hourly bar chart, heaviest hour, labelled with Bangladesh Meteorological Department (BMD) rainfall categories (44 mm/24 h = heavy, 89 mm = very heavy). Cached for offline. |
| **Real road routing** | Route screen | OSRM on OpenStreetMap roads (free, no key): walking or driving, real distance and time, turn-by-turn list. Falls back to a dashed straight line when offline. |
| **Live navigation** | *Start live navigation* | GPS tracking, 3D camera that follows you, next-turn banner, automatic re-routing when you go off the route, arrival detection, and spoken instructions in Bangla or English. |
| **Danger near you** | Map | After *Near me*, a red banner appears if a Danger hill is within 8 km, with a one-tap *Go to shelter*. |
| **Read aloud** | *Listen* on the hill page and on each alert | Speaks the status, what to do and the rain outlook, so people who can't read well still get the warning (`expo-speech`; Bangla needs a Bangla voice on the phone). |

### Automatic behaviour
- Refreshes every 60 s while the app is open (and when it comes back to the foreground); pull-to-refresh on list screens.
- Caches the last good data on the device → works offline.
- Local notification when a **new** DANGER alert arrives (iOS/Android).
- Queued hazard reports are sent the next time the server is reachable.

---

## 3. Responsive layout

| Width | Layout |
|---|---|
| < 768 px (phones) | Full-screen map with floating search, chips, cards; single-column screens |
| 768 – 1099 px (tablets) | Two-column hill detail, 2-column shelter / alert grids |
| ≥ 900 px map / ≥ 1100 px | Map gets a 400 px side panel with summary + hill list; 3-column grids; content max width 1080 px |

The floating tab bar is capped at 560 px and centred on large screens.

---

## 4. Project structure

```
pahar-pohori-app/
├── App.tsx                     # providers + navigator
├── app.json                    # name, permissions (location), deep link scheme paharpohori://
└── src/
    ├── api.ts                  # backend calls, default URL detection, demo snapshot
    ├── store.tsx               # global state: settings, data, polling, cache, location, report queue, notifications
    ├── i18n.ts                 # English + Bangla strings, reason translation, safety guide content
    ├── theme.ts                # colours, status colours, spacing, map styles
    ├── types.ts                # API types
    ├── utils.ts                # distance, time-ago, guidance per level, route estimate, links
    ├── data/demoSnapshot.json  # real backend output used when offline with no cache
    ├── hooks/useHillDetail.ts
    ├── services/
    │   ├── routing.ts          # OSRM road routes, instructions, progress on route
    │   ├── weather.ts          # Open-Meteo rain forecast + BMD categories
    │   └── speech.ts           # read-aloud (expo-speech)
    ├── navigation/
    │   ├── index.tsx           # Tabs (Map · Alerts · SOS · Shelters · More) + stack screens + deep links
    │   └── TabBar.tsx          # floating pill tab bar with raised SOS button
    ├── components/
    │   ├── ui.tsx              # Screen, Card, Chip, StatusBadge, Button, banners, useResponsive
    │   ├── RiskMap.tsx / RiskMap.web.tsx    # native map / Leaflet map
    │   ├── RouteMap.tsx / RouteMap.web.tsx  # dark route map
    │   ├── HillCard.tsx, ShelterCard.tsx, LineChart.tsx, RainChart.tsx
    │   ├── MapControls.tsx     # layers sheet + 7-day replay bar
    │   ├── mapLayers.ts        # what each data layer draws
    │   └── leaflet.web.ts
    └── screens/                # Map, HillDetail, Alerts, SOS, Shelters, Route, Report, More, SafetyGuide, Settings, AboutModel
```

Deep links: `paharpohori://hill/3`, `paharpohori://route/6`, `/alerts`, `/sos`, `/shelters`, `/report`, `/guide` (also work as web URLs).

---

## 5. Backend endpoints used

Existing: `GET /api/hills`, `/api/hills/{id}`, `/api/hills/{id}/history`, `/api/alerts`, `/api/model-info`
Added in `app/timeline.py`: `GET /api/risk-timeline?step_hours=1`.
Added in `app/public.py`: `GET /api/summary`, `/api/shelters`, `/api/hills/{id}/shelters`,
`/api/emergency-contacts`, `GET|POST /api/reports`, `POST /api/refresh`.

---

## 6. Before going live

- **Shelters are sample data.** Replace `data/shelters.csv` in the backend with the official list from the district administration / DDM (same columns).
- Check the hotline numbers in `app/public.py → EMERGENCY_CONTACTS`.
- Road routing uses the free public OSRM servers (fine for a demo / hackathon). For real public use, run your own OSRM server or use a paid routing API.
- For store builds, add a Google Maps API key for Android (`android.config.googleMaps.apiKey` in `app.json`) and serve the backend over HTTPS.
- Push notifications while the app is closed need a push service (Expo Push / FCM); the current build notifies while the app is open or in the background-refresh window.

Useful scripts: `npm run typecheck`, `npm run build:web` (static site in `dist/`).
