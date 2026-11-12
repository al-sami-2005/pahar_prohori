# Pahar Pohori (পাহাড় প্রহরী)

**Cross-checked landslide early warning for the Chittagong Hill Tracts** — ground sensors + stored NISAR radar features + a Random Forest model, with bilingual EN/বাংলা alerts on mobile and web.

**Status:** active demo / research prototype (not an official government warning service).  
**Licence:** not published yet (no `LICENSE` file in this repo).  
**Live demo:** [https://pahar-prohori-204-136-10-51.sslip.io](https://pahar-prohori-204-136-10-51.sslip.io)  
Health check: [`/api/health`](https://pahar-prohori-204-136-10-51.sslip.io/api/health) · API docs: [`/docs`](https://pahar-prohori-204-136-10-51.sslip.io/docs)

---

## Why this (not rain-only or satellite-only alerts)

| Approach | What it usually does | What Pahar Pohori does instead |
| --- | --- | --- |
| Rain / flood hubs | Threshold on rainfall alone | RF over **12 features** (sensors + NISAR + slope); rain alone stays **WATCH** unless cross-checks fire |
| Satellite-only landslide maps | Slow, map-centric | Field-node stream (archive replay or `POST /api/ingest`) scored continuously for **6 hills** |
| Generic IoT dashboards | Charts without decision rules | Explicit **SAFE / WATCH / DANGER** with a **false-alarm brake** |

**DANGER rule (in code):** probability `>= 0.60` **and** ground soil moisture wet (`>= 0.32 m³/m³`) **and** NISAR confirms wet soil or slope creep. Otherwise elevated risk stays **WATCH**. DANGER holds **24 hours** with bilingual instructions and nearest-shelter routing.

NISAR values in the running demo are **per-hill stored features** (GUNW / SME2-style fields used by the model), not a live CMR download on every request.

---

## Screenshots

| Risk map + shelters | Hill detail + 7-day telemetry |
| :---: | :---: |
| ![Map with SAFE/WATCH/DANGER pins and shelters](docs/screenshots/01-map-dashboard.png) | ![Hill detail with sensor tiles and charts](docs/screenshots/02-hill-detail.png) |

| Live watch (pipeline) | Bilingual DANGER alerts |
| :---: | :---: |
| ![Live pipeline and node status](docs/screenshots/03-live-system.png) | ![Alert feed in English and Bangla](docs/screenshots/04-bilingual-alerts.png) |

---

## Try it

1. Open the [live demo](https://pahar-prohori-204-136-10-51.sslip.io) — map, Live watch, alerts, shelters.
2. Or run locally (Python **3.12+**, Node **22+**):

```bash
# API + (optional) built web UI on :8000
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```bash
# Expo web/mobile (dev). API URL: More → Settings, or same-origin after web export.
cd pahar-pohori-app
npm install
npx expo start          # press w for web, or Expo Go
# production static build served by FastAPI after:
npm run build:web       # writes dist/; restart uvicorn
```

```bash
# One container (Expo export + FastAPI). Host port 8091 → 8000.
docker compose up --build
# then http://localhost:8091
```

---

## Shape of the system

```text
Field nodes (archive replay or POST /api/ingest)
        + stored NISAR features (moisture / creep / coherence / slope)
        → Random Forest (12 features; archive window ~30 samples / ~5h;
           live scoring uses a time window)
        → SAFE | WATCH | DANGER (+ 24h DANGER hold)
        → bilingual alerts, shelters, Live watch UI
```

```text
pahar_prohori/
├── backend/            # FastAPI, SQLite, ML, sensor archive
├── pahar-pohori-app/   # Expo (RN + web)
├── Dockerfile          # multi-stage web export + API
└── docker-compose.yml
```

Full route list: open `/docs` on a running server. Useful checks: `/api/summary`, `/api/hills`, `/api/system-status`, `/api/live-feed`.

---

## Stack

- **Backend:** Python 3.12, FastAPI, Uvicorn, SQLite, pandas, NumPy, scikit-learn  
- **App:** TypeScript, Expo SDK 58, React Navigation, Leaflet / OSM, Open-Meteo, OSRM

---

## Contributors

- **Al Sami** ([@al-sami-2005](https://github.com/al-sami-2005))
- **Masud Rana** ([@masudranaxpert](https://github.com/masudranaxpert))
