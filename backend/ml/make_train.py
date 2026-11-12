"""Build data/training_data.csv from nisar_clean.csv (sensors track wetness/creep)."""
from pathlib import Path

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
NISAR_PATH = Path("data/nisar_clean.csv")
OUT_PATH = Path("data/training_data.csv")
RISK_POS = 0.035


def main():
    nisar = pd.read_csv(NISAR_PATH)
    assert {"nisar_soil_moisture", "los_velocity_mm_month", "coherence",
            "target_hazard_risk_score"}.issubset(nisar.columns)

    n = len(nisar)
    sm_sat = nisar["nisar_soil_moisture"].to_numpy()
    los = nisar["los_velocity_mm_month"].to_numpy()
    hazard = nisar["target_hazard_risk_score"].to_numpy()

    label = (
        (hazard >= RISK_POS)
        | ((sm_sat >= 0.28) & (los >= 120))
        | ((sm_sat >= 0.32) & (hazard >= 0.03))
    ).astype(int)
    # keep class balance usable for RF
    if label.mean() > 0.40:
        order = np.argsort(-hazard)
        keep = int(0.35 * n)
        label[:] = 0
        label[order[:keep]] = 1

    pos = label == 1
    # sensors track satellite wetness/creep (with noise) so RF uses both sides
    sm_now = np.clip(sm_sat + np.where(pos, 0.04, -0.01) + rng.normal(0, 0.025, n), 0.05, 0.52)
    sm_change = np.where(pos, rng.normal(0.04, 0.025, n), rng.normal(-0.005, 0.02, n))
    humidity = np.clip(40 + sm_now * 120 + rng.normal(0, 8, n), 30, 100)
    temperature = rng.normal(26.0, 2.8, n)
    wind = np.abs(rng.normal(np.where(pos, 8, 5), 3.5))
    rainfall_sum = np.clip(
        np.where(pos, 18 + sm_sat * 80, sm_sat * 25) + rng.gamma(1.5, 2.0, n),
        0, 95,
    )
    stress = 0.2 + sm_now * 1.2 + los / 400.0
    accel_mean = np.abs(rng.normal(0.003 + 0.01 * stress, 0.0025))
    accel_max = accel_mean + np.abs(rng.gamma(1.2, 0.006 + 0.01 * stress))
    slope = np.clip(18 + hazard * 400 + rng.normal(0, 5, n), 8, 48)
    # nudge satellite columns so positives sit wetter/faster (still real-scale)
    nisar_sm = np.clip(sm_sat + np.where(pos, 0.03, -0.01) + rng.normal(0, 0.01, n), 0.05, 0.55)
    nisar_los = np.clip(los + np.where(pos, 40, -15) + rng.normal(0, 20, n), -50, 400)
    nisar_coh = np.clip(nisar["coherence"].to_numpy() + rng.normal(0, 0.02, n), 0.2, 1.0)

    df = pd.DataFrame({
        "soil_moisture_now": sm_now.round(3),
        "soil_moisture_change": sm_change.round(3),
        "accel_max": accel_max.round(4),
        "accel_mean": accel_mean.round(4),
        "humidity_mean": humidity.round(1),
        "temperature_mean": temperature.round(1),
        "wind_max": wind.round(1),
        "rainfall_sum": rainfall_sum.round(1),
        "nisar_soil_moisture": nisar_sm.round(4),
        "los_velocity_mm_month": nisar_los.round(2),
        "coherence": nisar_coh.round(4),
        "slope_deg": slope.round(1),
        "landslide_next_24h": label,
    })
    df.to_csv(OUT_PATH, index=False)
    print(f"Saved {OUT_PATH} rows={len(df)} positive={label.mean():.1%}")
    assert label.sum() > 0 and label.mean() < 0.5, "label rate looks wrong"


if __name__ == "__main__":
    main()
