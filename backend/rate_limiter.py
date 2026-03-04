# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from database import get_db

GUEST_LIMIT = 999       # total lifetime generations for guests (set to 3 in production)
USER_HOURLY_LIMIT = 10
USER_DAILY_LIMIT = 30


def check_guest_limit(guest_uuid: str, ip: str) -> dict:
    """Guest: 3 total generations ever. Returns {allowed, count, limit}"""
    conn = get_db()
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM generation_logs WHERE guest_uuid = ? OR (guest_uuid IS NULL AND ip_address = ?)",
        (guest_uuid, ip),
    ).fetchone()
    conn.close()
    count = row["cnt"]
    return {"allowed": count < GUEST_LIMIT, "count": count, "limit": GUEST_LIMIT, "remaining": max(0, GUEST_LIMIT - count)}


def check_user_limit(user_id: int) -> dict:
    """Registered: 10/hour, 30/day"""
    conn = get_db()
    now = datetime.utcnow()

    hour_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM generation_logs WHERE user_id = ? AND created_at > ?",
        (user_id, now - timedelta(hours=1)),
    ).fetchone()["cnt"]

    day_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM generation_logs WHERE user_id = ? AND created_at > ?",
        (user_id, now - timedelta(days=1)),
    ).fetchone()["cnt"]

    conn.close()

    if hour_count >= USER_HOURLY_LIMIT:
        return {"allowed": False, "reason": "hourly_limit", "count": hour_count, "limit": USER_HOURLY_LIMIT}
    if day_count >= USER_DAILY_LIMIT:
        return {"allowed": False, "reason": "daily_limit", "count": day_count, "limit": USER_DAILY_LIMIT}
    return {"allowed": True, "hourly": hour_count, "daily": day_count}


def log_generation(user_id: int = None, guest_uuid: str = None, ip: str = "", style: str = ""):
    conn = get_db()
    conn.execute(
        "INSERT INTO generation_logs (user_id, guest_uuid, ip_address, style) VALUES (?, ?, ?, ?)",
        (user_id, guest_uuid, ip, style),
    )
    conn.commit()
    conn.close()
