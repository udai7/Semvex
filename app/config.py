"""Runtime configuration, sourced from environment variables.

Everything has a sane default so the app boots with zero setup. Set the Google
vars to enable real OAuth; otherwise the UI falls back to email + password + 2FA.
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR.parent / "data"
DB_PATH = Path(os.getenv("SEMVEX_DB", BASE_DIR.parent / "semvex.db"))

# Secret used to sign session tokens. Auto-generated per-process if unset, which
# is fine for a demo (sessions just don't survive a restart). Set it in prod.
SECRET_KEY = os.getenv("SEMVEX_SECRET", os.urandom(32).hex())

SESSION_TTL_SECONDS = int(os.getenv("SEMVEX_SESSION_TTL", 60 * 60 * 24 * 7))
SESSION_COOKIE = "semvex_session"

APP_NAME = "Semvex"
ISSUER = "Semvex"  # shown in the authenticator app for 2FA

# --- Google OAuth (optional) ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# Where Google sends the user back. Must match the Authorized redirect URI
# configured in the Google Cloud console.
OAUTH_REDIRECT_URI = os.getenv(
    "SEMVEX_OAUTH_REDIRECT", "http://localhost:8000/auth/google/callback"
)
GOOGLE_ENABLED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

# Where to send the browser after Google sign-in. Defaults suit the bundled
# static SPA; for the Next.js frontend set these to "/search" and "/signin#error".
POST_LOGIN_REDIRECT = os.getenv("SEMVEX_POST_LOGIN_REDIRECT", "/#app")
LOGIN_ERROR_REDIRECT = os.getenv("SEMVEX_LOGIN_ERROR_REDIRECT", "/#error")

# --- Search ---
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5")
RERANKER_MODEL_NAME = os.getenv("RERANKER_MODEL_NAME", "BAAI/bge-reranker-base")
DEFAULT_TOP_K = int(os.getenv("SEMVEX_TOP_K", 8))
# Candidate pool pulled before a reranker trims to top_k (two-stage retrieval).
RERANK_CANDIDATES = int(os.getenv("SEMVEX_RERANK_CANDIDATES", 30))

# --- Admin / analytics ---
# Comma-separated emails granted access to the analytics dashboard.
ADMIN_EMAILS = {
    e.strip().lower() for e in os.getenv("SEMVEX_ADMIN_EMAILS", "").split(",") if e.strip()
}

# --- Rate limiting (auth endpoints) ---
AUTH_RATE_MAX = int(os.getenv("SEMVEX_AUTH_RATE_MAX", 10))     # attempts...
AUTH_RATE_WINDOW = int(os.getenv("SEMVEX_AUTH_RATE_WINDOW", 60))  # ...per this many seconds


def is_admin(email: str | None) -> bool:
    # If no admin list is configured, any authenticated user can view analytics
    # (demo convenience). Lock it down by setting SEMVEX_ADMIN_EMAILS.
    if not email:
        return False
    return not ADMIN_EMAILS or email.lower() in ADMIN_EMAILS
