"""
Build data/field_readings_7d.csv (10 min steps, CHT-NODE-01..06).

Climate by hill: 1,5 dry SAFE · 2,4,6 wet WATCH · 3 stress DANGER.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path("data/field_readings_7d.csv")
INTERVAL_MIN = 10
DAYS = 7

HILL_PROFILE = {
    1: {"base_sm": 0.18, "monsoon_sm": 0.22, "heavy_sm": 0.24, "fail": False, "hum": 58, "rainy": False},
    2: {"base_sm": 0.20, "monsoon_sm": 0.28, "heavy_sm": 0.31, "fail": False, "hum": 86, "rainy": True},
    3: {"base_sm": 0.21, "monsoon_sm": 0.30, "heavy_sm": 0.36, "fail": True, "hum": 93, "rainy": True},
    4: {"base_sm": 0.19, "monsoon_sm": 0.27, "heavy_sm": 0.30, "fail": False, "hum": 84, "rainy": True},
    5: {"base_sm": 0.16, "monsoon_sm": 0.19, "heavy_sm": 0.21, "fail": False, "hum": 56, "rainy": False},
    6: {"base_sm": 0.20, "monsoon_sm": 0.29, "heavy_sm": 0.32, "fail": False, "hum": 85, "rainy": True},
}


def main():
    rng = np.random.default_rng(7)
    steps = DAYS * 24 * (60 // INTERVAL_MIN)
    end = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start = end - timedelta(minutes=INTERVAL_MIN * (steps - 1))

    rows = []
    state = {
        h: {
            "sm": float(rng.uniform(p["base_sm"] - 0.02, p["base_sm"] + 0.02)),
            "hum": float(rng.uniform(p["hum"] - 5, p["hum"] + 3)),
            "temp": float(rng.uniform(24, 27)),
        }
        for h, p in HILL_PROFILE.items()
    }

    for i in range(steps):
        ts = start + timedelta(minutes=INTERVAL_MIN * i)
        day_frac = i / max(steps - 1, 1)
        monsoon = day_frac > 0.40
        heavy = day_frac > 0.75

        for h, profile in HILL_PROFILE.items():
            s = state[h]
            failing = profile["fail"] and day_frac > 0.78
            if failing:
                target_sm = 0.44
                rate = 0.07
            elif heavy:
                target_sm = profile["heavy_sm"]
                rate = 0.04
            elif monsoon:
                target_sm = profile["monsoon_sm"]
                rate = 0.03
            else:
                target_sm = profile["base_sm"]
                rate = 0.025

            s["sm"] += (target_sm - s["sm"]) * rate + float(rng.normal(0, 0.002))
            s["sm"] = float(np.clip(s["sm"], 0.05, 0.5))

            # dry hills stay comfortable even in "monsoon week"
            hum_t = profile["hum"] + (6 if (monsoon and profile["rainy"]) else 0)
            if failing:
                hum_t = 96
            s["hum"] += (hum_t - s["hum"]) * 0.08 + float(rng.normal(0, 0.8))
            s["hum"] = float(np.clip(s["hum"], 30, 100))
            s["temp"] += ((26.5 if monsoon else 28.5) - s["temp"]) * 0.05 + float(rng.normal(0, 0.15))

            wind = abs(float(rng.normal(9 if (monsoon and profile["rainy"]) else 4.0, 2.0)))

            # mm per 10-min slot (BMD-ish: dry pockets stay dry; monsoon hills accumulate)
            if failing:
                rain = abs(float(rng.gamma(2.4, 1.4)))
            elif not profile["rainy"]:
                rain = float(rng.uniform(0.0, 0.04)) if (monsoon and rng.random() < 0.06) else 0.0
            elif heavy:
                rain = abs(float(rng.gamma(1.6, 0.7))) if rng.random() < 0.75 else 0.0
            elif monsoon:
                rain = abs(float(rng.gamma(1.1, 0.4))) if rng.random() < 0.55 else 0.0
            else:
                rain = abs(float(rng.normal(0.05, 0.04))) if rng.random() < 0.18 else 0.0
            rain = float(max(0.0, rain))

            accel = abs(float(rng.normal(0.003, 0.001)))
            if failing and s["sm"] > 0.36:
                accel += abs(float(rng.normal(0.018, 0.008))) * min((day_frac - 0.78) / 0.22 * 3, 3)

            rows.append({
                "ts": ts.isoformat(),
                "hill_id": h,
                "device_id": f"CHT-NODE-{h:02d}",
                "wind_speed": round(wind, 2),
                "humidity": round(s["hum"], 1),
                "temperature": round(s["temp"], 1),
                "soil_moisture": round(s["sm"], 3),
                "acceleration": round(accel, 4),
                "rainfall_mm": round(rain, 2),
            })

    df = pd.DataFrame(rows)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)
    print(f"Wrote {OUT} rows={len(df)} span={DAYS}d")
    latest = df.sort_values("ts").groupby("hill_id").tail(1)
    print(latest[["hill_id", "soil_moisture", "humidity", "acceleration", "rainfall_mm"]].to_string(index=False))


if __name__ == "__main__":
    main()
