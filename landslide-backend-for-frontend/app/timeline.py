"""
7-day risk replay: run the trained model over sliding windows of the field archive
so the app can animate how each hill's risk evolved (GET /api/risk-timeline).

Uses exactly the same features, thresholds and NISAR cross-verification as app/predictor.py.
"""
from datetime import datetime

import pandas as pd
from fastapi import APIRouter

from app.db import conn
from app.predictor import (DANGER_P, MODEL, NISAR_MOVING, NISAR_WET, SENSOR_WET, WATCH_P, WINDOW)
from features import FEATURES, build_feature_row  # noqa: E402  (path added by app.predictor)

router = APIRouter(prefix="/api", tags=["public"])
_cache: dict = {}


def _level(prob, sensor_sm, nisar):
    verified = sensor_sm >= SENSOR_WET and (
        nisar["nisar_soil_moisture"] >= NISAR_WET or nisar["los_velocity_mm_month"] >= NISAR_MOVING)
    if prob >= DANGER_P and verified:
        return "DANGER"
    if prob >= WATCH_P:
        return "WATCH"
    return "SAFE"


def build_timeline(step_hours: int = 1):
    c = conn()
    last_id = c.execute("SELECT MAX(id) FROM sensor_readings").fetchone()[0]
    key = (last_id, step_hours)
    if key in _cache:
        c.close()
        return _cache[key]

    hills = [dict(h) for h in c.execute("SELECT * FROM hills").fetchall()]
    nisar = {r["hill_id"]: dict(r) for r in c.execute("SELECT * FROM nisar_features").fetchall()}
    stride = max(1, step_hours * 6)  # readings are every 10 minutes

    times: list[str] = []
    out = {}
    for h in hills:
        rows = [dict(r) for r in c.execute(
            "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id", (h["hill_id"],)).fetchall()]
        n = nisar.get(h["hill_id"])
        if len(rows) < WINDOW or not n:
            continue
        ends = list(range(len(rows) - 1, WINDOW - 2, -stride))[::-1]
        feats, ts, sms = [], [], []
        for e in ends:
            win = rows[e - WINDOW + 1: e + 1]
            feats.append(build_feature_row(win, n, h))
            ts.append(win[-1]["ts"])
            sms.append(win[-1]["soil_moisture"])
        probs = MODEL.predict_proba(pd.DataFrame(feats)[FEATURES])[:, 1]
        out[str(h["hill_id"])] = {
            "p": [round(float(p), 3) for p in probs],
            "level": [_level(float(p), sm, n) for p, sm in zip(probs, sms)],
            "soil": [round(sm, 3) for sm in sms],
        }
        if len(ts) > len(times):
            times = ts
    c.close()
    # align every series to the same length (shortest wins)
    m = min((len(v["p"]) for v in out.values()), default=0)
    times = times[-m:] if m else []
    for v in out.values():
        for k in ("p", "level", "soil"):
            v[k] = v[k][-m:]
    res = {"step_hours": step_hours, "times": times, "hills": out,
           "generated_at": datetime.utcnow().isoformat() + "Z"}
    _cache.clear()
    _cache[key] = res
    return res


@router.get("/risk-timeline", summary="7-day risk replay (model run hourly over the archive)")
def risk_timeline(step_hours: int = 1):
    return build_timeline(max(1, min(step_hours, 24)))
