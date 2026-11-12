"""Live pipeline telemetry & real-time ingest endpoints (/api/system-status, /api/live-feed, /api/ingest)."""
import json
import random
import threading
import time
from collections import deque
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.alerts import maybe_send_alert
from app.db import DB_PATH, conn
from app.predictor import DANGER_P, MODEL, WATCH_P, assess
from app.window import WINDOW_HOURS, load_feature_readings
from features import FEATURES  # noqa: E402

router = APIRouter(prefix="/api", tags=["live"])

SENSOR_INTERVAL_S = 8
MODEL_INTERVAL_S = 16
_rng = random.Random(7)

# rain_* is mm per 8s tick (≈ archive mm/10min scaled by 8/600). Targets ~0–2 mm/h dry, ~5–12 mm/h WATCH, ~15–30 mm/h DANGER.
HILL_CLIMATE = {
    1: {"sm": (0.17, 0.24), "hum": (55, 70), "rain_p": 0.08, "rain": (0.0, 0.015), "accel": (0.001, 0.006)},
    2: {"sm": (0.29, 0.34), "hum": (82, 94), "rain_p": 0.55, "rain": (0.015, 0.055), "accel": (0.002, 0.012)},
    3: {"sm": (0.40, 0.47), "hum": (92, 99), "rain_p": 0.78, "rain": (0.04, 0.16), "accel": (0.025, 0.11)},
    4: {"sm": (0.28, 0.33), "hum": (80, 92), "rain_p": 0.50, "rain": (0.012, 0.05), "accel": (0.002, 0.011)},
    5: {"sm": (0.15, 0.22), "hum": (52, 68), "rain_p": 0.06, "rain": (0.0, 0.012), "accel": (0.001, 0.005)},
    6: {"sm": (0.30, 0.35), "hum": (82, 94), "rain_p": 0.55, "rain": (0.015, 0.06), "accel": (0.002, 0.012)},
}

_lock = threading.Lock()
_start_mono = time.monotonic()
_events: deque[dict] = deque(maxlen=500)
_next_event_id = 1
_model_runs = 0
_hill_scores = 0
_run_times_ms: deque[float] = deque(maxlen=50)
_last_run_at: Optional[str] = None
_readings_since_start = 0
_real_packets = 0
_alerts_since_start = 0
_recent_packet_times: deque[float] = deque(maxlen=300)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_event(
    kind: str,
    text: str,
    hill_id: Optional[int] = None,
    device_id: Optional[str] = None,
    real: bool = False,
) -> dict:
    global _next_event_id
    with _lock:
        ev = {
            "id": _next_event_id,
            "ts": _now_iso(),
            "kind": kind,
            "text": text,
        }
        if hill_id is not None:
            ev["hill_id"] = hill_id
        if device_id is not None:
            ev["device_id"] = device_id
        if real:
            ev["real"] = True
        _next_event_id += 1
        _events.append(ev)
        return ev


def record_model_run(elapsed_ms: float, scored_count: int, alerts_sent: int = 0) -> None:
    global _model_runs, _hill_scores, _last_run_at, _alerts_since_start
    with _lock:
        _model_runs += 1
        _hill_scores += scored_count
        _alerts_since_start += alerts_sent
        _run_times_ms.append(elapsed_ms)
        _last_run_at = _now_iso()
    record_event(
        "model",
        f"Scored {scored_count} hills in {elapsed_ms:.1f} ms"
        + (f" ({alerts_sent} new alert)" if alerts_sent else ""),
    )


class SensorIngest(BaseModel):
    device_id: str = Field(..., examples=["CHT-NODE-01"])
    wind_speed: float
    humidity: float
    temperature: float
    soil_moisture: float
    acceleration: float
    rainfall_mm: float = 0.0
    ts: Optional[str] = None


@router.post("/ingest", summary="Ingest live telemetry packet from a field node")
def ingest_reading(r: SensorIngest):
    global _readings_since_start, _real_packets
    c = conn()
    hill = c.execute("SELECT * FROM hills WHERE device_id=?", (r.device_id,)).fetchone()
    if not hill:
        c.close()
        raise HTTPException(404, f"Unknown device {r.device_id}")

    ts = r.ts or _now_iso()
    c.execute(
        "INSERT INTO sensor_readings (hill_id, device_id, ts, wind_speed, humidity, "
        "temperature, soil_moisture, acceleration, rainfall_mm) VALUES (?,?,?,?,?,?,?,?,?)",
        (hill["hill_id"], r.device_id, ts, r.wind_speed, r.humidity, r.temperature,
         r.soil_moisture, r.acceleration, r.rainfall_mm),
    )
    c.commit()

    readings = load_feature_readings(c, hill["hill_id"])
    nisar = c.execute("SELECT * FROM nisar_features WHERE hill_id=?", (hill["hill_id"],)).fetchone()
    prev = c.execute("SELECT * FROM risk_status WHERE hill_id=?", (hill["hill_id"],)).fetchone()

    t0 = time.perf_counter()
    result = assess(readings, dict(nisar), dict(hill), dict(prev) if prev else None)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    now_iso = _now_iso()
    rain_mm = float(result.get("features", {}).get("rainfall_sum") or 0)
    c.execute(
        "INSERT OR REPLACE INTO risk_status "
        "(hill_id, probability, level, reasons, verified, danger_until, updated_at, rain_mm) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (hill["hill_id"], result["probability"], result["level"],
         json.dumps(result["reasons"]), int(result["verified_by_nisar"]),
         result["danger_until"], now_iso, round(rain_mm, 1)),
    )
    c.commit()
    alert = maybe_send_alert(c, dict(hill), result)
    c.close()

    with _lock:
        _readings_since_start += 1
        _real_packets += 1
        _recent_packet_times.append(time.monotonic())

    record_event(
        "reading",
        f"{r.device_id} ({hill['name']}) sm={r.soil_moisture:.3f} acc={r.acceleration:.4f}g",
        hill_id=hill["hill_id"],
        device_id=r.device_id,
        real=True,
    )
    record_model_run(elapsed_ms, 1, 1 if alert else 0)
    if alert:
        record_event(
            "alert",
            f"DANGER alert triggered for {hill['name']} (p={result['probability']:.2f})",
            hill_id=hill["hill_id"],
            device_id=r.device_id,
            real=True,
        )
    return {"hill_id": hill["hill_id"], "hill": hill["name"], **result, "alert_sent": alert is not None}


@router.get("/system-status", summary="Live pipeline & per-node telemetry status")
def system_status():
    c = conn()
    hills = [dict(h) for h in c.execute("SELECT * FROM hills ORDER BY hill_id").fetchall()]
    nisar_rows = {r["hill_id"]: dict(r) for r in c.execute("SELECT * FROM nisar_features").fetchall()}
    risk_rows = {r["hill_id"]: dict(r) for r in c.execute("SELECT * FROM risk_status").fetchall()}
    total_readings = c.execute("SELECT COUNT(*) FROM sensor_readings").fetchone()[0]
    archive_start = c.execute("SELECT MIN(ts) FROM sensor_readings").fetchone()[0]
    alerts_total = c.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
    reports_total = c.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
    latest_pass = c.execute("SELECT MAX(nisar_date) FROM nisar_features").fetchone()[0]

    nodes = []
    for h in hills:
        hid = h["hill_id"]
        recent = [
            dict(r) for r in reversed(
                c.execute(
                    "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id DESC LIMIT 24",
                    (hid,),
                ).fetchall()
            )
        ]
        count_h = c.execute("SELECT COUNT(*) FROM sensor_readings WHERE hill_id=?", (hid,)).fetchone()[0]
        latest = recent[-1] if recent else None
        rk = risk_rows.get(hid)
        ns = nisar_rows.get(hid)
        nodes.append({
            "hill_id": hid,
            "hill_name": h["name"],
            "district": h["district"],
            "device_id": h["device_id"],
            "online": latest is not None,
            "last_ts": latest["ts"] if latest else None,
            "readings_total": count_h,
            "latest": latest,
            "soil_trend": [round(float(r["soil_moisture"]), 4) for r in recent],
            "accel_trend": [round(float(r["acceleration"]), 4) for r in recent],
            "probability": rk["probability"] if rk else None,
            "level": rk["level"] if rk else "NO_DATA",
            "verified_by_nisar": bool(rk["verified"]) if rk else False,
            "scored_at": rk["updated_at"] if rk else None,
            "nisar_date": ns["nisar_date"] if ns else None,
        })
    c.close()

    now_mono = time.monotonic()
    with _lock:
        recent_real = [t for t in _recent_packet_times if now_mono - t <= 60.0]
        per_min = float(len(recent_real)) if _real_packets > 0 else round(len(hills) * (60.0 / 600.0), 1)
        last_ms = round(_run_times_ms[-1], 2) if _run_times_ms else None
        avg_ms = round(sum(_run_times_ms) / len(_run_times_ms), 2) if _run_times_ms else None
        runs = _model_runs
        scores = _hill_scores
        last_run = _last_run_at
        since_start = _readings_since_start
        real_pkts = _real_packets
        alerts_new = _alerts_since_start

    db_mb = round(DB_PATH.stat().st_size / (1024 * 1024), 2) if DB_PATH.exists() else None

    return {
        "server_time": _now_iso(),
        "uptime_s": round(now_mono - _start_mono, 1),
        "simulated": real_pkts == 0,
        "intervals": {"sensor_s": SENSOR_INTERVAL_S, "model_s": MODEL_INTERVAL_S},
        "readings": {
            "total": total_readings,
            "since_start": since_start,
            "real_packets": real_pkts,
            "per_min": per_min,
            "archive_start": archive_start,
        },
        "model": {
            "type": type(MODEL).__name__,
            "trees": getattr(MODEL, "n_estimators", None),
            "features": len(FEATURES),
            "window_hours": WINDOW_HOURS,
            "window_readings": 30,
            "danger_threshold": DANGER_P,
            "watch_threshold": WATCH_P,
            "runs": runs,
            "hill_scores": scores,
            "last_ms": last_ms,
            "avg_ms": avg_ms,
            "last_run_at": last_run,
        },
        "nisar": {
            "hills_covered": len(nisar_rows),
            "latest_pass": latest_pass,
            "products": ["GUNW", "SME2"],
        },
        "alerts": {"total": alerts_total, "since_start": alerts_new},
        "reports_total": reports_total,
        "db_mb": db_mb,
        "nodes": nodes,
    }


_pipeline_started = False


def _clip(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _emit_live_ticks() -> int:
    """
    Push a fresh reading per hill so the UI does not look frozen.
    Nudges the last archive/live sample with small noise while keeping
    each hill's SAFE / WATCH / DANGER character.
    """
    global _readings_since_start
    c = conn()
    hills = c.execute("SELECT * FROM hills ORDER BY hill_id").fetchall()
    n = 0
    for hill in hills:
        last = c.execute(
            "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id DESC LIMIT 1",
            (hill["hill_id"],),
        ).fetchone()
        if not last:
            continue
        cfg = HILL_CLIMATE.get(int(hill["hill_id"]), HILL_CLIMATE[5])
        raining = _rng.random() < cfg["rain_p"]
        rain = _rng.uniform(*cfg["rain"]) if raining else 0.0
        # rain wets the soil toward the top of the hill's band (real slope response)
        sm_nudge = 0.004 if raining else -0.001
        sm = _clip(float(last["soil_moisture"]) + sm_nudge + _rng.gauss(0, 0.002), *cfg["sm"])
        hum_mid = (cfg["hum"][0] + cfg["hum"][1]) / 2
        hum = _clip(float(last["humidity"]) + (hum_mid - float(last["humidity"])) * 0.25 + (1.2 if raining else 0) + _rng.gauss(0, 0.4), *cfg["hum"])
        temp = _clip(float(last["temperature"]) + _rng.gauss(0, 0.12) - (0.05 if raining else 0), 18.0, 36.0)
        wind = abs(float(last["wind_speed"]) + _rng.gauss(0, 0.3))
        accel = _clip(abs(float(last["acceleration"]) + _rng.gauss(0, 0.0012)), *cfg["accel"])
        ts = _now_iso()
        c.execute(
            "INSERT INTO sensor_readings (hill_id, device_id, ts, wind_speed, humidity, "
            "temperature, soil_moisture, acceleration, rainfall_mm) VALUES (?,?,?,?,?,?,?,?,?)",
            (hill["hill_id"], hill["device_id"], ts, round(wind, 2), round(hum, 1),
             round(temp, 1), round(sm, 3), round(accel, 4), round(rain, 2)),
        )
        n += 1
        record_event(
            "reading",
            f"{hill['device_id']} ({hill['name']}) sm={sm:.3f} rain={rain:.2f}mm",
            hill_id=hill["hill_id"],
            device_id=hill["device_id"],
        )
    c.commit()
    c.close()
    if n:
        with _lock:
            _readings_since_start += n
            now = time.monotonic()
            for _ in range(n):
                _recent_packet_times.append(now)
    return n


def start_pipeline() -> None:
    """Start live sensor ticks + periodic model scoring."""
    global _pipeline_started
    with _lock:
        if _pipeline_started:
            return
        _pipeline_started = True
    record_event("system", "Backend online. Live field stream and NISAR features ready.")

    def _loop() -> None:
        from app.refresh import refresh_all_hills

        tick = 0
        while True:
            time.sleep(SENSOR_INTERVAL_S)
            try:
                _emit_live_ticks()
                tick += 1
                # model ~ every MODEL_INTERVAL_S
                if tick % max(1, MODEL_INTERVAL_S // SENSOR_INTERVAL_S) == 0:
                    refresh_all_hills()
            except Exception as exc:  # pragma: no cover - defensive loop guard
                record_event("error", f"Live stream error: {exc}")

    threading.Thread(target=_loop, daemon=True, name="pp-pipeline").start()


@router.get("/live-feed", summary="Recent live pipeline events")
def live_feed(after: int = 0, limit: int = 60):
    limit = max(1, min(limit, 200))
    with _lock:
        items = [e for e in _events if e["id"] > after]
    return items[-limit:]
