"""
Public-facing endpoints for the Pahar Pohori mobile app (mass-people features).

  GET  /api/summary                 -> counts per status for the dashboard header
  GET  /api/shelters                -> all shelters (optional ?lat=&lon= to sort by distance)
  GET  /api/hills/{id}/shelters     -> nearest shelters to one hill
  GET  /api/emergency-contacts      -> hotline numbers for the SOS screen
  GET  /api/reports                 -> recent community hazard reports
  POST /api/reports                 -> citizen submits a hazard report (crack, seepage, ...)
  POST /api/refresh                 -> recompute risk status for all hills

Mounted from app/main.py with `app.include_router(public.router)`.
"""
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import conn
from app.hill_status import hill_status
from app.live import record_event
from app.status_refresh import refresh_all_hills

router = APIRouter(prefix="/api", tags=["public"])

SHELTERS_CSV = Path("data/shelters.csv")

# Bangladesh national hotlines. Edit here to localise.
EMERGENCY_CONTACTS = [
    {"id": "national", "name": "National Emergency Service", "name_bn": "জাতীয় জরুরি সেবা",
     "number": "999", "description": "Police, fire service and ambulance",
     "description_bn": "পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স", "primary": True},
    {"id": "disaster", "name": "Disaster Early Warning", "name_bn": "দুর্যোগের আগাম বার্তা",
     "number": "1090", "description": "Weather and disaster warnings (toll-free)",
     "description_bn": "আবহাওয়া ও দুর্যোগ সতর্কবার্তা (টোল-ফ্রি)", "primary": False},
    {"id": "info", "name": "National Information Service", "name_bn": "জাতীয় তথ্য সেবা",
     "number": "333", "description": "Government information and local help",
     "description_bn": "সরকারি তথ্য ও স্থানীয় সহায়তা", "primary": False},
]

HAZARD_TYPES = ("crack", "seepage", "tilting", "rockfall", "small_slide", "other")


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def init_public_tables():
    c = conn()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT, hill_id INTEGER, hazard_type TEXT,
        severity TEXT, description TEXT, lat REAL, lon REAL,
        reporter_name TEXT, reporter_phone TEXT, created_at TEXT
    );
    """)
    c.commit()
    c.close()


def _load_shelters():
    if not SHELTERS_CSV.exists():
        return []
    df = pd.read_csv(SHELTERS_CSV)
    out = []
    for r in df.to_dict(orient="records"):
        r["facilities"] = [f for f in str(r.get("facilities", "")).split("|") if f]
        r["phone"] = str(r.get("phone", ""))
        r["shelter_id"] = int(r["shelter_id"])
        r["capacity"] = int(r["capacity"])
        out.append(r)
    return out


def _with_distance(shelters, lat, lon):
    res = []
    for s in shelters:
        d = haversine_km(lat, lon, s["lat"], s["lon"])
        res.append({**s, "distance_km": round(d, 2)})
    return sorted(res, key=lambda s: s["distance_km"])


@router.get("/summary", summary="Dashboard header — counts per status")
def summary():
    c = conn()
    counts = {"SAFE": 0, "WATCH": 0, "DANGER": 0, "NO_DATA": 0}
    last_update = None
    hills = c.execute("SELECT hill_id FROM hills").fetchall()
    for h in hills:
        s = hill_status(c, h["hill_id"])
        counts[s["level"]] = counts.get(s["level"], 0) + 1
        if s["updated_at"] and (last_update is None or s["updated_at"] > last_update):
            last_update = s["updated_at"]
    alerts_24h = c.execute(
        "SELECT COUNT(*) FROM alerts WHERE created_at >= datetime('now','-1 day')"
    ).fetchone()[0]
    c.close()
    return {"total_hills": len(hills), "counts": counts,
            "alerts_24h": alerts_24h, "updated_at": last_update}


@router.get("/shelters", summary="Shelters list (sorted by distance if lat/lon given)")
def list_shelters(lat: Optional[float] = None, lon: Optional[float] = None,
                  district: Optional[str] = None):
    shelters = _load_shelters()
    if district:
        shelters = [s for s in shelters if s["district"].lower() == district.lower()]
    if lat is not None and lon is not None:
        return _with_distance(shelters, lat, lon)
    return shelters


@router.get("/hills/{hill_id}/shelters", summary="Nearest shelters to a hill")
def hill_shelters(hill_id: int, limit: int = 3):
    c = conn()
    h = c.execute("SELECT lat, lon FROM hills WHERE hill_id=?", (hill_id,)).fetchone()
    c.close()
    if not h:
        raise HTTPException(404, "Hill not found")
    return _with_distance(_load_shelters(), h["lat"], h["lon"])[:limit]


@router.get("/emergency-contacts", summary="SOS hotline numbers")
def emergency_contacts():
    return EMERGENCY_CONTACTS


class ReportIn(BaseModel):
    hill_id: Optional[int] = None
    hazard_type: Literal[HAZARD_TYPES]  # type: ignore[valid-type]
    severity: Literal["low", "medium", "high"] = "medium"
    description: str = Field("", max_length=1000)
    lat: Optional[float] = None
    lon: Optional[float] = None
    reporter_name: Optional[str] = Field(None, max_length=80)
    reporter_phone: Optional[str] = Field(None, max_length=20)


@router.get("/reports", summary="Recent community hazard reports")
def list_reports(limit: int = 50, hill_id: Optional[int] = None):
    c = conn()
    q = ("SELECT r.id, r.hill_id, h.name AS hill_name, r.hazard_type, r.severity, "
         "r.description, r.lat, r.lon, r.reporter_name, r.created_at "
         "FROM reports r LEFT JOIN hills h USING(hill_id)")
    args = []
    if hill_id is not None:
        q += " WHERE r.hill_id=?"
        args.append(hill_id)
    q += " ORDER BY r.id DESC LIMIT ?"
    args.append(limit)
    rows = c.execute(q, args).fetchall()
    c.close()
    return [dict(r) for r in rows]  # phone numbers are never returned publicly


@router.post("/reports", status_code=201, summary="Submit a community hazard report")
def create_report(body: ReportIn):
    c = conn()
    if body.hill_id is not None and not c.execute(
            "SELECT 1 FROM hills WHERE hill_id=?", (body.hill_id,)).fetchone():
        c.close()
        raise HTTPException(404, "Hill not found")
    now = datetime.now(timezone.utc).isoformat()
    cur = c.execute(
        "INSERT INTO reports (hill_id, hazard_type, severity, description, lat, lon, "
        "reporter_name, reporter_phone, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (body.hill_id, body.hazard_type, body.severity, body.description.strip(),
         body.lat, body.lon, body.reporter_name, body.reporter_phone, now),
    )
    c.commit()
    rid = cur.lastrowid
    c.close()
    record_event(
        "system",
        f"Citizen report #{rid}: {body.hazard_type} ({body.severity})",
        hill_id=body.hill_id,
        real=True,
    )
    return {"id": rid, "created_at": now, "status": "received"}


@router.post("/refresh", summary="Recompute risk for all hills")
def refresh():
    refresh_all_hills()
    return summary()
