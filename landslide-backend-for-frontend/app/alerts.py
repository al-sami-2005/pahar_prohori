"""Persist DANGER alerts for the frontend alert feed (GET /api/alerts)."""
from datetime import datetime, timedelta, timezone

COOLDOWN_HOURS = 6


def build_messages(hill):
    bn = (f"⚠️ সতর্কতা: {hill['name']} ({hill['district']}) পাহাড়ে আগামী ২৪ ঘণ্টা "
          f"ভূমিধসের উচ্চ ঝুঁকি। এখনই নিরাপদ আশ্রয়কেন্দ্রে যান।")
    en = (f"⚠️ ALERT: {hill['name']} ({hill['district']}) is DANGEROUS for the next 24 hours "
          f"- high landslide risk. Move to a safe shelter now.")
    return bn, en


def maybe_send_alert(c, hill, result):
    if result["level"] != "DANGER":
        return None
    last = c.execute(
        "SELECT created_at FROM alerts WHERE hill_id=? ORDER BY id DESC LIMIT 1",
        (hill["hill_id"],),
    ).fetchone()
    now = datetime.now(timezone.utc)
    if last and datetime.fromisoformat(last["created_at"]) > now - timedelta(hours=COOLDOWN_HOURS):
        return None

    bn, en = build_messages(hill)
    c.execute(
        "INSERT INTO alerts (hill_id, level, probability, message_bn, message_en, created_at) "
        "VALUES (?,?,?,?,?,?)",
        (hill["hill_id"], "DANGER", result["probability"], bn, en, now.isoformat()),
    )
    c.commit()
    print(f"[ALERT] {en}")
    return {"message_bn": bn, "message_en": en}
