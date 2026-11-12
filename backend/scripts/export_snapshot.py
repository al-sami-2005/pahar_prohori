"""Refresh pahar-pohori-app/src/data/demoSnapshot.json from the live API."""
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "http://127.0.0.1:8000"
OUT = Path(__file__).resolve().parents[2] / "pahar-pohori-app" / "src" / "data" / "demoSnapshot.json"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=120) as r:
        return json.load(r)


hills = get("/api/hills")
details = {}
history = {}
hill_shelters = {}
for h in hills:
    hid = h["hill_id"]
    details[str(hid)] = get(f"/api/hills/{hid}")
    history[str(hid)] = get(f"/api/hills/{hid}/history?limit=200")
    hill_shelters[str(hid)] = get(f"/api/hills/{hid}/shelters?limit=3")

demo = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "hills": hills,
    "alerts": get("/api/alerts"),
    "summary": get("/api/summary"),
    "shelters": get("/api/shelters"),
    "contacts": get("/api/emergency-contacts"),
    "modelInfo": get("/api/model-info"),
    "timeline": get("/api/risk-timeline?step_hours=1"),
    "details": details,
    "history": history,
    "hillShelters": hill_shelters,
}
OUT.write_text(json.dumps(demo, indent=2), encoding="utf-8")
print(f"Wrote {OUT} hills={len(hills)} mix={demo['summary']['counts']}")
