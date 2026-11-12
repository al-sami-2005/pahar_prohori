"""
Build training_data.csv from real NISAR rows (data/nisar_clean.csv).

NISAR columns are real. Sensor aggregates are synthesized to correlate with
NISAR soil moisture (this prototype has no historical sensor archive).
Label = elevated hazard from target_hazard_risk_score.
"""
from pathlib import Path

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
NISAR_PATH = Path("data/nisar_clean.csv")
OUT_PATH = Path("data/training_data.csv")
# scores in the clean file cluster at 0.0283 (baseline); anything above is elevated
RISK_POS = 0.035


def main():
    nisar = pd.read_csv(NISAR_PATH)
    assert {"nisar_soil_moisture", "los_velocity_mm_month", "coherence",
            "target_hazard_risk_score"}.issubset(nisar.columns)

    n = len(nisar)
    sm = nisar["nisar_soil_moisture"].to_numpy()
    wet = sm >= 0.20

    # sensors track satellite moisture + noise (verification signal)
    sm_now = np.clip(sm + rng.normal(np.where(wet, 0.04, 0.0), 0.04), 0.05, 0.5)
    sm_change = rng.normal(np.where(wet, 0.03, -0.01), 0.03)
    humidity = np.clip(rng.normal(np.where(wet, 88, 65), 8), 30, 100)
    temperature = rng.normal(np.where(wet, 28, 24), 3)
    wind = np.abs(rng.normal(np.where(wet, 9, 5), 4))
    stress = np.clip((sm_now - 0.25) * 3 + (nisar["los_velocity_mm_month"].to_numpy() / 400), 0, None)
    accel_mean = np.abs(rng.normal(0.003 + 0.003 * stress, 0.002))
    accel_max = accel_mean + np.abs(rng.gamma(1.2, 0.003 + 0.008 * stress))
    slope = rng.uniform(15, 45, n)

    label = (nisar["target_hazard_risk_score"].to_numpy() >= RISK_POS).astype(int)

    df = pd.DataFrame({
        "soil_moisture_now": sm_now.round(3),
        "soil_moisture_change": sm_change.round(3),
        "accel_max": accel_max.round(4),
        "accel_mean": accel_mean.round(4),
        "humidity_mean": humidity.round(1),
        "temperature_mean": temperature.round(1),
        "wind_max": wind.round(1),
        "nisar_soil_moisture": nisar["nisar_soil_moisture"].round(4),
        "los_velocity_mm_month": nisar["los_velocity_mm_month"].round(2),
        "coherence": nisar["coherence"].round(4),
        "slope_deg": slope.round(1),
        "landslide_next_24h": label,
    })
    df.to_csv(OUT_PATH, index=False)
    print(f"Saved {OUT_PATH} rows={len(df)} positive={label.mean():.1%}")
    assert label.sum() > 0 and label.mean() < 0.5, "label rate looks wrong"


if __name__ == "__main__":
    main()
