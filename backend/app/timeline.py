"""
7-day risk replay: run the trained model over sliding windows of the field archive
so the app can animate how each hill's risk evolved (GET /api/risk-timeline).

Uses exactly the same features, thresholds and NISAR cross-verification as app/predictor.py.
Live 8s ticks are bucketed to 10-minute slots so the replay stays archive-scale.
"""
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter

from app.db import conn
from app.predictor import (
    DANGER_P, MODEL, NISAR_MOVING, NISAR_WET, RAIN_WATCH_MM,
    SENSOR_WATCH, SENSOR_WET, WINDOW,
)
from features import FEATURES, build_feature_row  # noqa: E402  (path added by app.predictor)

router = APIRouter(prefix="/api", tags=["public"])
_cache: dict = {}


def _level(prob, feat, nisar):
    """Same rules as predictor.assess (sensor-first, model as DANGER gate)."""
    sm = feat["soil_moisture_now"]
    rain = feat.get("rainfall_sum", 0)
    rising = feat["soil_moisture_change"] >= 0.03
    sensor_wet = sm >= SENSOR_WET
    sensor_elevated = sm >= SENSOR_WATCH
    nisar_wet = nisar["nisar_soil_moisture"] >= NISAR_WET
    nisar_moving = nisar["los_velocity_mm_month"] >= NISAR_MOVING
    verified = sensor_wet and (nisar_wet or nisar_moving)
    if prob >= DANGER_P and verified:
        return "DANGER"
    if sensor_elevated or rain >= RAIN_WATCH_MM or (rising and sensor_wet) or (nisar_wet and sensor_elevated):
        return "WATCH"
    if prob >= DANGER_P and sensor_elevated:
        return "WATCH"
    return "SAFE"


def _bucket_10min(rows: list[dict]) -> list[dict]:
    """Collapse live flood + archive into one sample per 10-minute slot (sum rain)."""
    buckets: dict[str, dict] = {}
    rain_acc: dict[str, float] = {}
    for r in rows:
        raw = r["ts"].replace("Z", "+00:00") if isinstance(r["ts"], str) else r["ts"].isoformat()
        t = datetime.fromisoformat(raw)
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        key = t.astimezone(timezone.utc).replace(minute=(t.minute // 10) * 10, second=0, microsecond=0).isoformat()
        rain_acc[key] = rain_acc.get(key, 0.0) + float(r.get("rainfall_mm") or 0)
        buckets[key] = dict(r)
        buckets[key]["rainfall_mm"] = rain_acc[key]
        buckets[key]["ts"] = key
    return [buckets[k] for k in sorted(buckets)]


def build_timeline(step_hours: int = 1):
    c = conn()
    last_id = c.execute("SELECT MAX(id) FROM sensor_readings").fetchone()[0]
    key = (last_id, step_hours)
    if key in _cache:
        c.close()
        return _cache[key]

    hills = [dict(h) for h in c.execute("SELECT * FROM hills").fetchall()]
    nisar = {r["hill_id"]: dict(r) for r in c.execute("SELECT * FROM nisar_features").fetchall()}
    stride = max(1, step_hours * 6)  # 10-minute buckets

    times: list[str] = []
    out = {}
    for h in hills:
        raw = [dict(r) for r in c.execute(
            "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id", (h["hill_id"],)).fetchall()]
        rows = _bucket_10min(raw)
        n = nisar.get(h["hill_id"])
        if len(rows) < WINDOW or not n:
            continue
        ends = list(range(len(rows) - 1, WINDOW - 2, -stride))[::-1]
        feats, ts, sms = [], [], []
        for e in ends:
            win = rows[e - WINDOW + 1: e + 1]
            feat = build_feature_row(win, n, h)
            feats.append(feat)
            ts.append(win[-1]["ts"])
            sms.append(win[-1]["soil_moisture"])
        probs = MODEL.predict_proba(pd.DataFrame(feats)[FEATURES])[:, 1]
        out[str(h["hill_id"])] = {
            "p": [round(float(p), 3) for p in probs],
            "level": [_level(float(p), f, n) for p, f in zip(probs, feats)],
            "soil": [round(sm, 3) for sm in sms],
        }
        if len(ts) > len(times):
            times = ts
    c.close()
    m = min((len(v["p"]) for v in out.values()), default=0)
    times = times[-m:] if m else []
    for v in out.values():
        for k in ("p", "level", "soil"):
            v[k] = v[k][-m:]
    res = {"step_hours": step_hours, "times": times, "hills": out,
           "generated_at": datetime.now(timezone.utc).isoformat()}
    _cache.clear()
    _cache[key] = res
    return res


@router.get("/risk-timeline", summary="7-day risk replay (model run hourly over the archive)")
def risk_timeline(step_hours: int = 1):
    return build_timeline(max(1, min(step_hours, 24)))
