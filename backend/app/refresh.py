"""Recompute SAFE/WATCH/DANGER from the latest field readings window."""
import json
import time
from datetime import datetime, timezone

from app.alerts import maybe_send_alert
from app.db import conn
from app.live import record_event, record_model_run
from app.predictor import assess
from app.window import load_feature_readings


def refresh_all_hills():
    t0 = time.perf_counter()
    c = conn()
    scored = 0
    alerts_sent = 0
    for hill in c.execute("SELECT * FROM hills").fetchall():
        readings = load_feature_readings(c, hill["hill_id"])
        if not readings:
            continue
        nisar = c.execute("SELECT * FROM nisar_features WHERE hill_id=?",
                          (hill["hill_id"],)).fetchone()
        prev = c.execute("SELECT * FROM risk_status WHERE hill_id=?",
                         (hill["hill_id"],)).fetchone()
        result = assess(readings, dict(nisar), dict(hill), dict(prev) if prev else None)
        rain_mm = float(result.get("features", {}).get("rainfall_sum") or 0)
        c.execute(
            "INSERT OR REPLACE INTO risk_status "
            "(hill_id, probability, level, reasons, verified, danger_until, updated_at, rain_mm) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (hill["hill_id"], result["probability"], result["level"],
             json.dumps(result["reasons"]), int(result["verified_by_nisar"]),
             result["danger_until"], datetime.now(timezone.utc).isoformat(), round(rain_mm, 1)),
        )
        scored += 1
        alert = maybe_send_alert(c, dict(hill), result)
        if alert:
            alerts_sent += 1
            record_event(
                "alert",
                f"DANGER alert active for {hill['name']} (p={result['probability']:.2f})",
                hill_id=hill["hill_id"],
                device_id=hill["device_id"],
            )
    c.commit()
    c.close()
    record_model_run((time.perf_counter() - t0) * 1000.0, scored, alerts_sent)
