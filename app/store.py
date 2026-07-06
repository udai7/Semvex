"""SQLite-backed user store.

Stands in for the users table you'd put in Supabase Postgres. Kept deliberately
small: sign-up, look-up, and the 2FA secret/enabled flags.
"""
from __future__ import annotations

import sqlite3
import time
from typing import Optional

from . import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    email          TEXT PRIMARY KEY,
    password_hash  TEXT,                       -- NULL for OAuth-only accounts
    provider       TEXT NOT NULL DEFAULT 'password',
    totp_secret    TEXT,                       -- provisioned but maybe not yet confirmed
    totp_enabled   INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS backup_codes (
    email      TEXT NOT NULL,
    code_hash  TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS favorites (
    email      TEXT NOT NULL,
    sku        TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (email, sku)
);

CREATE TABLE IF NOT EXISTS recently_viewed (
    email      TEXT NOT NULL,
    sku        TEXT NOT NULL,
    viewed_at  INTEGER NOT NULL,
    PRIMARY KEY (email, sku)
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL,
    query      TEXT NOT NULL,
    mode       TEXT NOT NULL DEFAULT 'compare',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
    email      TEXT NOT NULL,
    query      TEXT NOT NULL,
    sku        TEXT NOT NULL,
    mode       TEXT NOT NULL,
    rating     INTEGER NOT NULL,               -- +1 / -1
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS query_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT,
    query       TEXT NOT NULL,
    mode        TEXT NOT NULL,
    n_results   INTEGER NOT NULL,
    ms          REAL NOT NULL,
    created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS click_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT,
    query       TEXT NOT NULL,
    sku         TEXT NOT NULL,
    mode        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
);
"""


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    with _conn() as c:
        c.executescript(_SCHEMA)


def get_user(email: str) -> Optional[sqlite3.Row]:
    with _conn() as c:
        return c.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower(),)
        ).fetchone()


def create_user(
    email: str, password_hash: Optional[str], provider: str = "password"
) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO users (email, password_hash, provider, created_at) "
            "VALUES (?, ?, ?, ?)",
            (email.lower(), password_hash, provider, int(time.time())),
        )


def upsert_oauth_user(email: str, provider: str = "google") -> None:
    """Create the account on first Google sign-in; no-op if it already exists."""
    if get_user(email) is None:
        create_user(email, password_hash=None, provider=provider)


def set_totp_secret(email: str, secret: str) -> None:
    with _conn() as c:
        c.execute(
            "UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE email = ?",
            (secret, email.lower()),
        )


def enable_totp(email: str) -> None:
    with _conn() as c:
        c.execute(
            "UPDATE users SET totp_enabled = 1 WHERE email = ?", (email.lower(),)
        )


# --------------------------------------------------------------------------- #
# Backup codes
# --------------------------------------------------------------------------- #
def store_backup_codes(email: str, code_hashes: list[str]) -> None:
    with _conn() as c:
        c.execute("DELETE FROM backup_codes WHERE email = ?", (email.lower(),))
        c.executemany(
            "INSERT INTO backup_codes (email, code_hash) VALUES (?, ?)",
            [(email.lower(), h) for h in code_hashes],
        )


def consume_backup_code(email: str, code_hash: str) -> bool:
    with _conn() as c:
        row = c.execute(
            "SELECT rowid FROM backup_codes WHERE email = ? AND code_hash = ? AND used = 0",
            (email.lower(), code_hash),
        ).fetchone()
        if not row:
            return False
        c.execute("UPDATE backup_codes SET used = 1 WHERE rowid = ?", (row["rowid"],))
        return True


# --------------------------------------------------------------------------- #
# Favorites / recently viewed / saved searches
# --------------------------------------------------------------------------- #
def add_favorite(email: str, sku: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT OR IGNORE INTO favorites (email, sku, created_at) VALUES (?, ?, ?)",
            (email.lower(), sku, int(time.time())),
        )


def remove_favorite(email: str, sku: str) -> None:
    with _conn() as c:
        c.execute(
            "DELETE FROM favorites WHERE email = ? AND sku = ?", (email.lower(), sku)
        )


def list_favorites(email: str) -> list[str]:
    with _conn() as c:
        rows = c.execute(
            "SELECT sku FROM favorites WHERE email = ? ORDER BY created_at DESC",
            (email.lower(),),
        ).fetchall()
        return [r["sku"] for r in rows]


def record_view(email: str, sku: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO recently_viewed (email, sku, viewed_at) VALUES (?, ?, ?) "
            "ON CONFLICT(email, sku) DO UPDATE SET viewed_at = excluded.viewed_at",
            (email.lower(), sku, int(time.time())),
        )


def list_recently_viewed(email: str, limit: int = 12) -> list[str]:
    with _conn() as c:
        rows = c.execute(
            "SELECT sku FROM recently_viewed WHERE email = ? ORDER BY viewed_at DESC LIMIT ?",
            (email.lower(), limit),
        ).fetchall()
        return [r["sku"] for r in rows]


def save_search(email: str, query: str, mode: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO saved_searches (email, query, mode, created_at) VALUES (?, ?, ?, ?)",
            (email.lower(), query, mode, int(time.time())),
        )


def list_saved_searches(email: str) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT id, query, mode FROM saved_searches WHERE email = ? ORDER BY created_at DESC",
            (email.lower(),),
        ).fetchall()
        return [dict(r) for r in rows]


def delete_saved_search(email: str, search_id: int) -> None:
    with _conn() as c:
        c.execute(
            "DELETE FROM saved_searches WHERE id = ? AND email = ?",
            (search_id, email.lower()),
        )


# --------------------------------------------------------------------------- #
# Feedback + logging (analytics)
# --------------------------------------------------------------------------- #
def record_feedback(email: str, query: str, sku: str, mode: str, rating: int) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO feedback (email, query, sku, mode, rating, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (email.lower(), query, sku, mode, 1 if rating >= 0 else -1, int(time.time())),
        )


def log_query(email: str | None, query: str, mode: str, n_results: int, ms: float) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO query_log (email, query, mode, n_results, ms, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (email, query, mode, n_results, ms, int(time.time())),
        )


def log_click(email: str | None, query: str, sku: str, mode: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO click_log (email, query, sku, mode, created_at) VALUES (?, ?, ?, ?, ?)",
            (email, query, sku, mode, int(time.time())),
        )


def analytics_summary() -> dict:
    with _conn() as c:
        total = c.execute("SELECT COUNT(*) n FROM query_log").fetchone()["n"]
        top = c.execute(
            "SELECT query, COUNT(*) n FROM query_log GROUP BY lower(query) "
            "ORDER BY n DESC LIMIT 10"
        ).fetchall()
        zero = c.execute(
            "SELECT query, COUNT(*) n FROM query_log WHERE n_results = 0 "
            "GROUP BY lower(query) ORDER BY n DESC LIMIT 10"
        ).fetchall()
        latency = c.execute(
            "SELECT mode, AVG(ms) avg_ms, MAX(ms) max_ms, COUNT(*) n "
            "FROM query_log GROUP BY mode"
        ).fetchall()
        clicks = c.execute(
            "SELECT mode, COUNT(*) n FROM click_log GROUP BY mode"
        ).fetchall()
        fb = c.execute(
            "SELECT mode, SUM(CASE WHEN rating>0 THEN 1 ELSE 0 END) up, "
            "SUM(CASE WHEN rating<0 THEN 1 ELSE 0 END) down FROM feedback GROUP BY mode"
        ).fetchall()
    return {
        "total_queries": total,
        "top_queries": [dict(r) for r in top],
        "zero_result_queries": [dict(r) for r in zero],
        "latency_by_mode": [dict(r) for r in latency],
        "clicks_by_mode": [dict(r) for r in clicks],
        "feedback_by_mode": [dict(r) for r in fb],
    }
