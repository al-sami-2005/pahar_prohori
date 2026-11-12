# Hill Tracts Landslide Early Warning – Backend

Field sensors + NISAR features → ML risk status → frontend API  
(**SAFE** / **WATCH** / **DANGER**).

## Quick start

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

python sensors/build_field_archive.py
python ml/generate_training_data.py
python ml/train_model.py

uvicorn app.main:app --port 8000
```

| Link | Purpose |
|------|---------|
| http://localhost:8000/guide | Frontend HTML guide |
| http://localhost:8000/docs | OpenAPI |
| http://localhost:8000/api/hills | Map data |

## Project structure

```
app/                 # FastAPI routes + DB + risk
ml/                  # features, train, model artifact
sensors/             # build + ingest 7-day field archive
data/                # CSVs + SQLite
docs/frontend-api.html
requirements.txt     # runtime + train only
```

## Frontend endpoints

| Method | Path | Screen |
|--------|------|--------|
| GET | `/api/hills` | Map |
| GET | `/api/hills/{id}` | Detail |
| GET | `/api/hills/{id}/history` | 7-day charts |
| GET | `/api/alerts` | Alert feed |
| GET | `/api/model-info` | About / model |

Colours: `SAFE` green · `WATCH` amber · `DANGER` red.

### Public endpoints for the mobile app (`app/public.py`)

| Method | Path | Screen |
|--------|------|--------|
| GET | `/api/summary` | Map header counts |
| GET | `/api/shelters?lat=&lon=&district=` | Shelters list (sorted by distance when lat/lon given) |
| GET | `/api/hills/{id}/shelters?limit=3` | Nearest shelters on hill detail |
| GET | `/api/emergency-contacts` | SOS screen hotlines |
| GET | `/api/reports?hill_id=` | Community hazard reports (phone numbers never returned) |
| POST | `/api/reports` | Citizen submits a hazard report |
| POST | `/api/refresh` | Recompute risk for all hills |
| GET | `/api/risk-timeline?step_hours=1` | 7-day risk replay: the model re-run hourly over the field archive (`app/timeline.py`) |

| POST | `/api/ingest` | **Field nodes push readings** (`device_id`, `soil_moisture`, `acceleration`, `humidity`, `temperature`, `wind_speed`) |
| GET | `/api/system-status` | Live System page: uptime, readings/min, per-node freshness, model runs + timing, NISAR coverage |
| GET | `/api/live-feed?after=<id>` | Live event log (readings, model runs, alerts) |

### Live pipeline (`app/live.py`)
A background thread re-runs the model every `PP_MODEL_INTERVAL` seconds (default 30) and logs each run.
Until physical sensors are connected, a **demo stream** continues each node's archive with small random-walk
readings every `PP_SIM_INTERVAL` seconds (default 10). The API reports `"simulated": true` and the app labels it.
Turn it off with `PP_SIMULATE=0` once real nodes post to `/api/ingest`.

`/api/hills` now also includes each hill's `nisar` block (used by the map's NISAR ground-creep layer).

`data/shelters.csv` is **sample data** — replace it with the official shelter list.

Run with `--host 0.0.0.0` so phones on the same Wi-Fi can reach the API:
`uvicorn app.main:app --host 0.0.0.0 --port 8000`.
The React Native app lives in `../pahar-pohori-app`.

## Data

- `data/field_readings_7d.csv` — 7-day CHT node telemetry
- `data/nisar_features.csv` — per-hill NISAR for live risk
- `data/nisar_clean.csv` — cleaned NISAR for training
- Reload archive: `python sensors/ingest_field_archive.py` then restart API
