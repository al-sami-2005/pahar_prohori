"""SQLite database (swap for PostgreSQL later by changing this file only)."""
import sqlite3
from pathlib import Path

import pandas as pd

DB_PATH = Path("data/landslide.db")
FIELD_ARCHIVE = Path("data/field_readings_7d.csv")


def conn():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = conn()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS hills (
        hill_id INTEGER PRIMARY KEY, name TEXT, district TEXT,
        lat REAL, lon REAL, slope_deg REAL, device_id TEXT
    );
    CREATE TABLE IF NOT EXISTS nisar_features (
        hill_id INTEGER PRIMARY KEY, nisar_date TEXT, nisar_soil_moisture REAL,
        los_velocity_mm_month REAL, coherence REAL
    );
    DROP TABLE IF EXISTS sensor_readings;
    CREATE TABLE sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, hill_id INTEGER, device_id TEXT,
        ts TEXT, wind_speed REAL, humidity REAL, temperature REAL,
        soil_moisture REAL, acceleration REAL, rainfall_mm REAL
    );
    CREATE INDEX IF NOT EXISTS idx_readings_hill ON sensor_readings(hill_id, id);
    CREATE TABLE IF NOT EXISTS risk_status (
        hill_id INTEGER PRIMARY KEY, probability REAL, level TEXT,
        reasons TEXT, verified INTEGER, danger_until TEXT, updated_at TEXT,
        rain_mm REAL
    );
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, hill_id INTEGER, level TEXT,
        probability REAL, message_bn TEXT, message_en TEXT, created_at TEXT
    );
    """)
    # Fresh risk after archive reload (drop stale 24h DANGER holds)
    c.execute("DELETE FROM risk_status")
    c.execute("DELETE FROM alerts")
    cols = {r[1] for r in c.execute("PRAGMA table_info(risk_status)")}
    if "rain_mm" not in cols:
        c.execute("ALTER TABLE risk_status ADD COLUMN rain_mm REAL")

    hills = pd.read_csv("data/hills.csv")
    for _, h in hills.iterrows():
        c.execute("INSERT OR REPLACE INTO hills VALUES (?,?,?,?,?,?,?)",
                  (int(h.hill_id), h["name"], h.district, h.lat, h.lon, h.slope_deg,
                   f"CHT-NODE-{int(h.hill_id):02d}"))
    nisar = pd.read_csv("data/nisar_features.csv")
    for _, n in nisar.iterrows():
        c.execute("INSERT OR REPLACE INTO nisar_features VALUES (?,?,?,?,?)",
                  (int(n.hill_id), n.nisar_date, n.nisar_soil_moisture,
                   n.los_velocity_mm_month, n.coherence))
    _load_field_archive(c)
    c.commit()
    c.close()


def _load_field_archive(c):
    """Replace sensor_readings with the 7-day field archive (source of truth)."""
    if not FIELD_ARCHIVE.exists():
        return
    df = pd.read_csv(FIELD_ARCHIVE)
    if "rainfall_mm" not in df.columns:
        df["rainfall_mm"] = 0.0
    df = df[["hill_id", "device_id", "ts", "wind_speed", "humidity",
             "temperature", "soil_moisture", "acceleration", "rainfall_mm"]]
    c.execute("DELETE FROM sensor_readings")
    rows = [
        (int(hill_id), device_id, ts, float(wind), float(hum),
         float(temp), float(sm), float(acc), float(rain))
        for hill_id, device_id, ts, wind, hum, temp, sm, acc, rain
        in df.itertuples(index=False, name=None)
    ]
    c.executemany(
        "INSERT INTO sensor_readings (hill_id, device_id, ts, wind_speed, humidity, "
        "temperature, soil_moisture, acceleration, rainfall_mm) VALUES (?,?,?,?,?,?,?,?,?)",
        rows,
    )
