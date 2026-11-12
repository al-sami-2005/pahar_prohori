"""Feature definition shared by training and the live backend (must stay identical)."""

FEATURES = [
    # live sensor features (aggregated over the recent window, ~24h)
    "soil_moisture_now",      # m3/m3 (0-0.5)
    "soil_moisture_change",   # now minus window start
    "accel_max",              # g, peak ground acceleration in window
    "accel_mean",             # g
    "humidity_mean",          # %
    "temperature_mean",       # C
    "wind_max",               # m/s
    # NISAR + terrain features (per hill)
    "nisar_soil_moisture",    # m3/m3 from SME2
    "los_velocity_mm_month",  # ground creep from GUNW
    "coherence",              # GUNW quality
    "slope_deg",
]


def build_feature_row(readings, nisar, hill):
    """readings: list of dicts (oldest -> newest) with sensor fields."""
    sm = [r["soil_moisture"] for r in readings]
    acc = [r["acceleration"] for r in readings]
    return {
        "soil_moisture_now": sm[-1],
        "soil_moisture_change": sm[-1] - sm[0],
        "accel_max": max(acc),
        "accel_mean": sum(acc) / len(acc),
        "humidity_mean": sum(r["humidity"] for r in readings) / len(readings),
        "temperature_mean": sum(r["temperature"] for r in readings) / len(readings),
        "wind_max": max(r["wind_speed"] for r in readings),
        "nisar_soil_moisture": nisar["nisar_soil_moisture"],
        "los_velocity_mm_month": nisar["los_velocity_mm_month"],
        "coherence": nisar["coherence"],
        "slope_deg": hill["slope_deg"],
    }
