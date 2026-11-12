"""Build the status object used by map and detail responses."""
import json


def hill_status(c, hill_id):
    s = c.execute("SELECT * FROM risk_status WHERE hill_id=?", (hill_id,)).fetchone()
    if not s:
        return {
            "level": "NO_DATA",
            "probability": None,
            "reasons": [],
            "verified_by_nisar": False,
            "danger_until": None,
            "updated_at": None,
        }
    return {
        "level": s["level"],
        "probability": s["probability"],
        "reasons": json.loads(s["reasons"]),
        "verified_by_nisar": bool(s["verified"]),
        "danger_until": s["danger_until"],
        "updated_at": s["updated_at"],
    }
