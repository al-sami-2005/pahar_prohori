"""Runs the trained model + sensor/NISAR cross-verification for one hill."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ml"))
from features import FEATURES, build_feature_row  # noqa: E402

MODEL = joblib.load("ml/model.joblib")

WINDOW = 30            # archive-era sample count (~5h at 10 min); live uses time window
DANGER_P = 0.60
WATCH_P = 0.45         # soft model cue only; levels prefer sensor evidence
DANGER_HOLD_HOURS = 24
# calibrated to field archive + data/nisar_features.csv scale
SENSOR_WET = 0.32      # confirms elevated wetness (DANGER path)
SENSOR_WATCH = 0.28    # elevated but not failure-level
RAIN_WATCH_MM = 12.0   # ~5h window; light drizzle stays under, monsoon forces WATCH
NISAR_WET = 0.28
NISAR_MOVING = 150.0


def assess(readings, nisar, hill, previous=None):
    row = build_feature_row(readings, nisar, hill)
    prob = float(MODEL.predict_proba(pd.DataFrame([row])[FEATURES])[0, 1])

    moisture_gap = abs(row["soil_moisture_now"] - nisar["nisar_soil_moisture"])
    sensor_wet = row["soil_moisture_now"] >= SENSOR_WET
    sensor_elevated = row["soil_moisture_now"] >= SENSOR_WATCH
    rain_elevated = row.get("rainfall_sum", 0) >= RAIN_WATCH_MM
    rising = row["soil_moisture_change"] >= 0.03
    nisar_wet = nisar["nisar_soil_moisture"] >= NISAR_WET
    nisar_moving = nisar["los_velocity_mm_month"] >= NISAR_MOVING
    verified = sensor_wet and (nisar_wet or nisar_moving)

    # Ground evidence first; model alone is poorly calibrated on synthetic sensors.
    if prob >= DANGER_P and verified:
        level = "DANGER"
    elif sensor_elevated or rain_elevated or (rising and sensor_wet) or (nisar_wet and sensor_elevated):
        level = "WATCH"
    elif prob >= DANGER_P and sensor_elevated:
        level = "WATCH"  # model high, sensors rising, satellite not confirming
    else:
        level = "SAFE"

    now = datetime.now(timezone.utc)
    danger_until = None
    if level == "DANGER":
        danger_until = (now + timedelta(hours=DANGER_HOLD_HOURS)).isoformat()
    elif previous and previous["danger_until"] and previous["danger_until"] > now.isoformat():
        level, danger_until = "DANGER", previous["danger_until"]

    reasons = []
    if row["soil_moisture_now"] >= SENSOR_WET:
        reasons.append(f"Soil moisture high ({row['soil_moisture_now']:.2f} m3/m3)")
    elif row["soil_moisture_now"] >= SENSOR_WATCH:
        reasons.append(f"Soil moisture elevated ({row['soil_moisture_now']:.2f} m3/m3)")
    if rising:
        reasons.append(f"Soil getting wetter fast (+{row['soil_moisture_change']:.2f})")
    if row["accel_max"] >= 0.02:
        reasons.append(f"Ground movement detected (peak {row['accel_max']:.3f} g)")
    if row.get("rainfall_sum", 0) >= RAIN_WATCH_MM:
        reasons.append(f"Heavy rainfall in recent window ({row['rainfall_sum']:.1f} mm)")
    if nisar_moving:
        reasons.append(f"NISAR radar shows slope creep {nisar['los_velocity_mm_month']:.1f} mm/month")
    if nisar_wet:
        reasons.append(f"NISAR soil moisture confirms wet ground ({nisar['nisar_soil_moisture']:.2f})")
    if hill["slope_deg"] >= 35:
        reasons.append(f"Steep slope ({hill['slope_deg']:.0f} deg)")
    if moisture_gap > 0.15:
        reasons.append("Warning: sensor and NISAR soil moisture disagree - check sensor")
    if level == "SAFE" and not reasons:
        reasons.append("Sensors and NISAR show stable ground conditions")

    return {
        "probability": round(prob, 3),
        "level": level,
        "verified_by_nisar": verified,
        "reasons": reasons,
        "danger_until": danger_until,
        "features": {k: round(v, 4) for k, v in row.items()},
    }
