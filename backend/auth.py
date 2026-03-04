# -*- coding: utf-8 -*-
import os
import jwt
from datetime import datetime, timedelta
from database import get_db

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 1 week


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_or_create_user(email: str, name: str, provider: str, provider_id: str, avatar_url: str = None) -> int:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row:
        conn.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (row["id"],))
        conn.commit()
        user_id = row["id"]
    else:
        cursor = conn.execute(
            "INSERT INTO users (email, name, provider, provider_id, avatar_url) VALUES (?, ?, ?, ?, ?)",
            (email, name, provider, provider_id, avatar_url),
        )
        conn.commit()
        user_id = cursor.lastrowid
    conn.close()
    return user_id
