"""Pahar Pohori API. Run: uvicorn app.main:app --host 0.0.0.0 --port 8000"""
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.db import conn, init_db
from app.status import hill_status
from app.public import init_public_tables, router as public_router
from app.timeline import router as timeline_router
from app.live import router as live_router, start_pipeline
from app.refresh import refresh_all_hills

BASE_DIR = Path(__file__).resolve().parent.parent
GUIDE = BASE_DIR / "docs" / "api.html"
WEB_DIST = (BASE_DIR.parent / "pahar-pohori-app" / "dist").resolve()

app = FastAPI(
    title="Pahar Pohori API",
    description="Map, hill detail, charts, alerts. Guide: [/guide](/guide)",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
init_db()
init_public_tables()
refresh_all_hills()
app.include_router(public_router)
app.include_router(timeline_router)
app.include_router(live_router)
start_pipeline()


@app.get("/api/health", tags=["health"])
def health():
    return {"service": "landslide-early-warning", "status": "running", "guide": "/guide"}


@app.get("/", tags=["health"])
def root(request: Request):
    index = WEB_DIST / "index.html"
    if index.is_file() and "text/html" in request.headers.get("accept", ""):
        return FileResponse(index)
    return {"service": "landslide-early-warning", "status": "running", "guide": "/guide"}


@app.get("/guide", include_in_schema=False)
def frontend_guide():
    return FileResponse(GUIDE)


@app.get("/api/hills", tags=["frontend"], summary="Map screen: all hills")
def list_hills():
    """All hills with latest sensor reading + SAFE/WATCH/DANGER status."""
    c = conn()
    out = []
    for h in c.execute("SELECT * FROM hills").fetchall():
        latest = c.execute(
            "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id DESC LIMIT 1",
            (h["hill_id"],),
        ).fetchone()
        nisar = c.execute("SELECT * FROM nisar_features WHERE hill_id=?", (h["hill_id"],)).fetchone()
        out.append({
            **dict(h),
            "status": hill_status(c, h["hill_id"]),
            "latest_reading": dict(latest) if latest else None,
            "nisar": dict(nisar) if nisar else None,
        })
    c.close()
    return out


@app.get("/api/hills/{hill_id}", tags=["frontend"], summary="Hill detail screen")
def hill_detail(hill_id: int):
    """One hill: profile + NISAR + latest reading + risk status."""
    c = conn()
    h = c.execute("SELECT * FROM hills WHERE hill_id=?", (hill_id,)).fetchone()
    if not h:
        raise HTTPException(404, "Hill not found")
    nisar = c.execute("SELECT * FROM nisar_features WHERE hill_id=?", (hill_id,)).fetchone()
    latest = c.execute(
        "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id DESC LIMIT 1",
        (hill_id,),
    ).fetchone()
    res = {
        **dict(h),
        "nisar": dict(nisar) if nisar else None,
        "latest_reading": dict(latest) if latest else None,
        "status": hill_status(c, hill_id),
    }
    c.close()
    return res


@app.get("/api/hills/{hill_id}/history", tags=["frontend"], summary="7-day chart data")
def hill_history(hill_id: int, limit: int = 1100):
    """Time series for charts (default ~7 days at 10-minute sampling)."""
    c = conn()
    if not c.execute("SELECT 1 FROM hills WHERE hill_id=?", (hill_id,)).fetchone():
        c.close()
        raise HTTPException(404, "Hill not found")
    rows = c.execute(
        "SELECT * FROM sensor_readings WHERE hill_id=? ORDER BY id DESC LIMIT ?",
        (hill_id, limit),
    ).fetchall()
    c.close()
    return [dict(r) for r in reversed(rows)]


@app.get("/api/alerts", tags=["frontend"], summary="Alert feed")
def get_alerts(limit: int = 50):
    """Recent DANGER alerts (Bangla + English messages)."""
    c = conn()
    rows = c.execute(
        "SELECT a.*, h.name AS hill_name FROM alerts a JOIN hills h USING(hill_id) "
        "ORDER BY a.id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    c.close()
    return [dict(r) for r in rows]


@app.get("/api/model-info", tags=["frontend"], summary="Model accuracy panel")
def model_info():
    """ROC-AUC and feature importance for an info/about screen."""
    with open("ml/model_report.json") as f:
        return json.load(f)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_web_app(full_path: str):
    """Serve the built Expo web app (dist/) and fall back to index.html for SPA deep links."""
    if full_path.startswith("api/"):
        raise HTTPException(404, "Not Found")
    if WEB_DIST.is_dir():
        target = (WEB_DIST / full_path).resolve()
        if target.is_relative_to(WEB_DIST) and target.is_file():
            return FileResponse(target)
        index = WEB_DIST / "index.html"
        if index.is_file():
            return FileResponse(index)
    raise HTTPException(404, "Not Found")
