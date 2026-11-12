"""Runs the trained model + sensor/NISAR cross-verification for one hill."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ml"))
from features import FEATURES, build_feature_row  # noqa: E402

MODEL = joblib.load("ml/landslide_model.joblib")

WINDOW = 30            # last N readings used as the "recent 24h" window
DANGER_P = 0.60
WATCH_P = 0.30
DANGER_HOLD_HOURS = 24
# calibrated to data/nisar_clean.csv (SME2/GUNW scale in this dataset)
SENSOR_WET = 0.32
NISAR_WET = 0.22          # ~90th pct soil moisture
NISAR_MOVING = 300.0      # ~75th pct derived LOS rate


def assess(readings, nisar, hill, previous=None):
    row = build_feature_row(readings, nisar, hill)
    prob = float(MODEL.predict_proba(pd.DataFrame([row])[FEATURES])[0, 1])

    # --- cross-verification: do the ground sensors agree with the satellite? ---
    moisture_gap = abs(row["soil_moisture_now"] - nisar["nisar_soil_moisture"])
    sensor_wet = row["soil_moisture_now"] >= SENSOR_WET
    nisar_wet = nisar["nisar_soil_moisture"] >= NISAR_WET
    nisar_moving = nisar["los_velocity_mm_month"] >= NISAR_MOVING
    verified = sensor_wet and (nisar_wet or nisar_moving)

    if prob >= DANGER_P and verified:
        level = "DANGER"
    elif prob >= DANGER_P:
        level = "WATCH"      # model says high but satellite does not confirm -> no panic alarm
    elif prob >= WATCH_P:
        level = "WATCH"
    else:
        level = "SAFE"

    # keep DANGER for 24h once triggered
    now = datetime.now(timezone.utc)
    danger_until = None
    if level == "DANGER":
        danger_until = (now + timedelta(hours=DANGER_HOLD_HOURS)).isoformat()
    elif previous and previous["danger_until"] and previous["danger_until"] > now.isoformat():
        level, danger_until = "DANGER", previous["danger_until"]

    reasons = []
    if row["soil_moisture_now"] >= SENSOR_WET:
        reasons.append(f"Soil moisture high ({row['soil_moisture_now']:.2f} m3/m3)")
    if row["soil_moisture_change"] >= 0.03:
        reasons.append(f"Soil getting wetter fast (+{row['soil_moisture_change']:.2f})")
    if row["accel_max"] >= 0.02:
        reasons.append(f"Ground movement detected (peak {row['accel_max']:.3f} g)")
    if nisar_moving:
        reasons.append(f"NISAR radar shows slope creep {nisar['los_velocity_mm_month']:.1f} mm/month")
    if nisar_wet:
        reasons.append(f"NISAR soil moisture confirms wet ground ({nisar['nisar_soil_moisture']:.2f})")
    if hill["slope_deg"] >= 35:
        reasons.append(f"Steep slope ({hill['slope_deg']:.0f} deg)")
    if moisture_gap > 0.15:
        reasons.append("Warning: sensor and NISAR soil moisture disagree - check sensor")

    return {
        "probability": round(prob, 3),
        "level": level,
        "verified_by_nisar": verified,
        "reasons": reasons,
        "danger_until": danger_until,
        "features": {k: round(v, 4) for k, v in row.items()},
    }
