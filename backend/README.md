# Backend

Sensors + NISAR → Random Forest → SAFE / WATCH / DANGER for the app.

## Run

```bash
# use the shared venv if you already have one, or:
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

python sensors/build_archive.py
python ml/make_train.py
python ml/train.py

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

| URL | Use |
|-----|-----|
| http://localhost:8000/guide | API guide |
| http://localhost:8000/docs | OpenAPI |
| http://localhost:8000/api/hills | Map data |

## Layout

```
app/        # FastAPI routes, DB, risk
ml/         # features, train, model
sensors/    # 7-day archive build + load
scripts/    # export_snapshot.py → app offline JSON
data/       # CSVs + SQLite
docs/api.html
```

Reload archive: `python sensors/load_archive.py` then restart the API.

App lives in `../pahar-pohori-app`.
