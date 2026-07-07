"""User + account + analytics data access, backed by PostgreSQL.

All persistent state lives in Postgres (see `db.py` for the schema). Function
signatures match what the API layer expects; only the storage engine changed
from the earlier SQLite version.
"""
from __future__ import annotations

import hmac
from typing import Optional

from .db import connection, init_schema


def init() -> None:
    init_schema()


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
def get_user(email: str) -> Optional[dict]:
    with connection() as c:
        return c.execute(
            "SELECT * FROM users WHERE email = %s", (email.lower(),)
        ).fetchone()


def create_user(
    email: str,
    password_hash: Optional[str],
    provider: str = "password",
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    phone: Optional[str] = None,
) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO users (email, password_hash, provider, first_name, last_name, phone) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (email.lower(), password_hash, provider, first_name, last_name, phone),
        )
        c.commit()


def update_pending_user(
    email: str, password_hash: Optional[str], first_name: str, last_name: str, phone: str
) -> None:
    """Refresh profile/password for an as-yet-unverified account (re-signup)."""
    with connection() as c:
        c.execute(
            "UPDATE users SET password_hash = %s, first_name = %s, last_name = %s, phone = %s "
            "WHERE email = %s AND email_verified = FALSE",
            (password_hash, first_name, last_name, phone, email.lower()),
        )
        c.commit()


def upsert_oauth_user(email: str, provider: str = "google") -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO users (email, provider, email_verified) VALUES (%s, %s, TRUE) "
            "ON CONFLICT (email) DO UPDATE SET email_verified = TRUE",
            (email.lower(), provider),
        )
        c.commit()


# --------------------------------------------------------------------------- #
# Email verification codes
# --------------------------------------------------------------------------- #
def store_email_code(email: str, code_hash: str, ttl_seconds: int) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO email_codes (email, code_hash, expires_at, attempts) "
            "VALUES (%s, %s, now() + make_interval(secs => %s), 0) "
            "ON CONFLICT (email) DO UPDATE SET "
            "code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, "
            "attempts = 0, created_at = now()",
            (email.lower(), code_hash, ttl_seconds),
        )
        c.commit()


def check_email_code(email: str, code_hash: str, max_attempts: int) -> str:
    """Return 'ok' | 'bad' | 'expired' | 'too_many'. Consumes the code on success."""
    with connection() as c:
        row = c.execute(
            "SELECT code_hash, attempts, (expires_at < now()) AS expired "
            "FROM email_codes WHERE email = %s",
            (email.lower(),),
        ).fetchone()
        if not row:
            return "expired"
        if row["attempts"] >= max_attempts:
            return "too_many"
        if row["expired"]:
            return "expired"
        if not hmac.compare_digest(row["code_hash"], code_hash):
            c.execute(
                "UPDATE email_codes SET attempts = attempts + 1 WHERE email = %s",
                (email.lower(),),
            )
            c.commit()
            return "bad"
        c.execute("DELETE FROM email_codes WHERE email = %s", (email.lower(),))
        c.commit()
        return "ok"


def mark_email_verified(email: str) -> None:
    with connection() as c:
        c.execute("UPDATE users SET email_verified = TRUE WHERE email = %s", (email.lower(),))
        c.commit()


def set_totp_secret(email: str, secret: str) -> None:
    with connection() as c:
        c.execute(
            "UPDATE users SET totp_secret = %s, totp_enabled = FALSE WHERE email = %s",
            (secret, email.lower()),
        )
        c.commit()


def enable_totp(email: str) -> None:
    with connection() as c:
        c.execute("UPDATE users SET totp_enabled = TRUE WHERE email = %s", (email.lower(),))
        c.commit()


# --------------------------------------------------------------------------- #
# Backup codes
# --------------------------------------------------------------------------- #
def store_backup_codes(email: str, code_hashes: list[str]) -> None:
    with connection() as c:
        c.execute("DELETE FROM backup_codes WHERE email = %s", (email.lower(),))
        with c.cursor() as cur:  # executemany lives on the cursor, not the connection
            cur.executemany(
                "INSERT INTO backup_codes (email, code_hash) VALUES (%s, %s)",
                [(email.lower(), h) for h in code_hashes],
            )
        c.commit()


def consume_backup_code(email: str, code_hash: str) -> bool:
    with connection() as c:
        row = c.execute(
            "UPDATE backup_codes SET used = TRUE "
            "WHERE ctid IN (SELECT ctid FROM backup_codes "
            "WHERE email = %s AND code_hash = %s AND used = FALSE LIMIT 1) RETURNING 1",
            (email.lower(), code_hash),
        ).fetchone()
        c.commit()
        return row is not None


# --------------------------------------------------------------------------- #
# Favorites / recently viewed / saved searches
# --------------------------------------------------------------------------- #
def add_favorite(email: str, sku: str) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO favorites (email, sku) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (email.lower(), sku),
        )
        c.commit()


def remove_favorite(email: str, sku: str) -> None:
    with connection() as c:
        c.execute("DELETE FROM favorites WHERE email = %s AND sku = %s", (email.lower(), sku))
        c.commit()


def list_favorites(email: str) -> list[str]:
    with connection() as c:
        rows = c.execute(
            "SELECT sku FROM favorites WHERE email = %s ORDER BY created_at DESC",
            (email.lower(),),
        ).fetchall()
        return [r["sku"] for r in rows]


def record_view(email: str, sku: str) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO recently_viewed (email, sku, viewed_at) VALUES (%s, %s, now()) "
            "ON CONFLICT (email, sku) DO UPDATE SET viewed_at = now()",
            (email.lower(), sku),
        )
        c.commit()


def list_recently_viewed(email: str, limit: int = 12) -> list[str]:
    with connection() as c:
        rows = c.execute(
            "SELECT sku FROM recently_viewed WHERE email = %s ORDER BY viewed_at DESC LIMIT %s",
            (email.lower(), limit),
        ).fetchall()
        return [r["sku"] for r in rows]


def save_search(email: str, query: str, mode: str) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO saved_searches (email, query, mode) VALUES (%s, %s, %s)",
            (email.lower(), query, mode),
        )
        c.commit()


def list_saved_searches(email: str) -> list[dict]:
    with connection() as c:
        rows = c.execute(
            "SELECT id, query, mode FROM saved_searches WHERE email = %s ORDER BY created_at DESC",
            (email.lower(),),
        ).fetchall()
        return [dict(r) for r in rows]


def delete_saved_search(email: str, search_id: int) -> None:
    with connection() as c:
        c.execute(
            "DELETE FROM saved_searches WHERE id = %s AND email = %s", (search_id, email.lower())
        )
        c.commit()


# --------------------------------------------------------------------------- #
# Feedback + logging (analytics)
# --------------------------------------------------------------------------- #
def record_feedback(email: str, query: str, sku: str, mode: str, rating: int) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO feedback (email, query, sku, mode, rating) VALUES (%s, %s, %s, %s, %s)",
            (email.lower(), query, sku, mode, 1 if rating >= 0 else -1),
        )
        c.commit()


def log_query(email: str | None, query: str, mode: str, n_results: int, ms: float) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO query_log (email, query, mode, n_results, ms) VALUES (%s, %s, %s, %s, %s)",
            (email, query, mode, n_results, ms),
        )
        c.commit()


def log_click(email: str | None, query: str, sku: str, mode: str) -> None:
    with connection() as c:
        c.execute(
            "INSERT INTO click_log (email, query, sku, mode) VALUES (%s, %s, %s, %s)",
            (email, query, sku, mode),
        )
        c.commit()


def analytics_summary() -> dict:
    with connection() as c:
        total = c.execute("SELECT COUNT(*) AS n FROM query_log").fetchone()["n"]
        top = c.execute(
            "SELECT query, COUNT(*) AS n FROM query_log GROUP BY lower(query), query "
            "ORDER BY n DESC LIMIT 10"
        ).fetchall()
        zero = c.execute(
            "SELECT query, COUNT(*) AS n FROM query_log WHERE n_results = 0 "
            "GROUP BY lower(query), query ORDER BY n DESC LIMIT 10"
        ).fetchall()
        latency = c.execute(
            "SELECT mode, AVG(ms) AS avg_ms, MAX(ms) AS max_ms, COUNT(*) AS n "
            "FROM query_log GROUP BY mode"
        ).fetchall()
        clicks = c.execute(
            "SELECT mode, COUNT(*) AS n FROM click_log GROUP BY mode"
        ).fetchall()
        fb = c.execute(
            "SELECT mode, SUM(CASE WHEN rating>0 THEN 1 ELSE 0 END) AS up, "
            "SUM(CASE WHEN rating<0 THEN 1 ELSE 0 END) AS down FROM feedback GROUP BY mode"
        ).fetchall()
    return {
        "total_queries": total,
        "top_queries": [dict(r) for r in top],
        "zero_result_queries": [dict(r) for r in zero],
        "latency_by_mode": [
            {"mode": r["mode"], "avg_ms": float(r["avg_ms"]), "max_ms": float(r["max_ms"]), "n": r["n"]}
            for r in latency
        ],
        "clicks_by_mode": [dict(r) for r in clicks],
        "feedback_by_mode": [
            {"mode": r["mode"], "up": int(r["up"] or 0), "down": int(r["down"] or 0)} for r in fb
        ],
    }
