"""Time-based feature window so live 8s ticks and 10-min archive share the same physics."""
from datetime import datetime, timedelta, timezone

# Match training / archive scale: ~5 hours of ground truth, not "last N packets".
WINDOW_HOURS = 5.0
MIN_POINTS = 8


def load_feature_readings(c, hill_id: int) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=WINDOW_HOURS)).isoformat()
    rows = c.execute(
        "SELECT * FROM sensor_readings WHERE hill_id=? AND ts>=? ORDER BY id ASC",
        (hill_id, cutoff),
    ).fetchall()
    if len(rows) < MIN_POINTS:
        rows = list(reversed(c.execute(
            "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id DESC LIMIT 30",
            (hill_id,),
        ).fetchall()))
    return [dict(r) for r in rows]
