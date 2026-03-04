# -*- coding: utf-8 -*-
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "curtainvision.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            provider TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS generation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            guest_uuid TEXT,
            ip_address TEXT NOT NULL,
            style TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_gen_guest ON generation_logs(guest_uuid);
        CREATE INDEX IF NOT EXISTS idx_gen_user ON generation_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_gen_ip ON generation_logs(ip_address);
        CREATE INDEX IF NOT EXISTS idx_gen_created ON generation_logs(created_at);
    """)
    conn.close()
    print("[DB] Database initialized at", DB_PATH)
