"""
Assemble the last 7 days of CHT node telemetry into data/field_readings_7d.csv.

One reading every 10 minutes per node (CHT-NODE-01..06).
Hill 3 shows a progressive wet-season stress pattern in the final 48 hours.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path("data/field_readings_7d.csv")
HILLS = [1, 2, 3, 4, 5, 6]
INTERVAL_MIN = 10
DAYS = 7
STRESS_HILL = 3


def main():
    rng = np.random.default_rng(7)
    steps = DAYS * 24 * (60 // INTERVAL_MIN)
    end = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start = end - timedelta(minutes=INTERVAL_MIN * (steps - 1))

    rows = []
    state = {
        h: {
            "sm": float(rng.uniform(0.17, 0.22)),
            "hum": float(rng.uniform(58, 68)),
            "temp": float(rng.uniform(24, 27)),
        }
        for h in HILLS
    }

    for i in range(steps):
        ts = start + timedelta(minutes=INTERVAL_MIN * i)
        day_frac = i / max(steps - 1, 1)
        # week weather: dry → monsoon build-up
        monsoon = day_frac > 0.35
        heavy = day_frac > 0.70

        for h in HILLS:
            s = state[h]
            failing = h == STRESS_HILL and day_frac > 0.72
            target_sm = 0.43 if failing else (0.33 if heavy else (0.28 if monsoon else 0.19))
            rate = 0.06 if failing else 0.03
            s["sm"] += (target_sm - s["sm"]) * rate + float(rng.normal(0, 0.002))
            s["sm"] = float(np.clip(s["sm"], 0.05, 0.5))
            s["hum"] += ((93 if monsoon else 64) - s["hum"]) * 0.08 + float(rng.normal(0, 0.8))
            s["hum"] = float(np.clip(s["hum"], 30, 100))
            s["temp"] += ((26.5 if monsoon else 28.5) - s["temp"]) * 0.05 + float(rng.normal(0, 0.15))
            wind = abs(float(rng.normal(12 if monsoon else 4.5, 2.5)))
            accel = abs(float(rng.normal(0.003, 0.0012)))
            if failing and s["sm"] > 0.36:
                accel += abs(float(rng.normal(0.015, 0.008))) * min((day_frac - 0.72) / 0.28 * 3, 3)

            rows.append({
                "ts": ts.isoformat(),
                "hill_id": h,
                "device_id": f"CHT-NODE-{h:02d}",
                "wind_speed": round(wind, 2),
                "humidity": round(s["hum"], 1),
                "temperature": round(s["temp"], 1),
                "soil_moisture": round(s["sm"], 3),
                "acceleration": round(accel, 4),
            })

    df = pd.DataFrame(rows)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)
    print(f"Wrote {OUT} rows={len(df)} nodes={len(HILLS)} span={DAYS}d interval={INTERVAL_MIN}min")
    print(f"  from {df['ts'].iloc[0]} to {df['ts'].iloc[-1]}")
    assert len(df) == steps * len(HILLS)


if __name__ == "__main__":
    main()
