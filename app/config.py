"""Runtime configuration — everything is sourced from the environment, which is
populated from a `.env` file at import time (via python-dotenv).

There is no hardcoded database, secret, or key in the codebase: the app reads
`.env` (or real environment variables in production/containers). See
`.env.example` for the full list.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
STATIC_DIR = BASE_DIR / "static"

# Load .env from the project root. Real env vars (e.g. in Docker) take
# precedence over the file, which is the standard 12-factor behaviour.
load_dotenv(BASE_DIR.parent / ".env", override=False)


def _require(name: str) -> str:
    val = os.getenv(name)
    if not val:
        sys.stderr.write(
            f"[semvex] Missing required env var {name}. Copy .env.example to .env "
            f"and fill it in (see README).\n"
        )
        raise RuntimeError(f"missing required env var: {name}")
    return val


# --- Data layer (required) ---
DATABASE_URL = _require("DATABASE_URL")
DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", 1))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", 10))

# --- Sessions / security ---
SECRET_KEY = _require("SEMVEX_SECRET")
SESSION_TTL_SECONDS = int(os.getenv("SEMVEX_SESSION_TTL", 60 * 60 * 24 * 7))
SESSION_COOKIE = "semvex_session"

APP_NAME = "Semvex"
ISSUER = "Semvex"  # shown in the authenticator app for 2FA

# --- Admin / analytics ---
ADMIN_EMAILS = {
    e.strip().lower() for e in os.getenv("SEMVEX_ADMIN_EMAILS", "").split(",") if e.strip()
}


def is_admin(email: str | None) -> bool:
    if not email:
        return False
    return not ADMIN_EMAILS or email.lower() in ADMIN_EMAILS


# --- Rate limiting (auth endpoints) ---
AUTH_RATE_MAX = int(os.getenv("SEMVEX_AUTH_RATE_MAX", 10))
AUTH_RATE_WINDOW = int(os.getenv("SEMVEX_AUTH_RATE_WINDOW", 60))

# --- Search ---
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5")
RERANKER_MODEL_NAME = os.getenv("RERANKER_MODEL_NAME", "BAAI/bge-reranker-base")
DEFAULT_TOP_K = int(os.getenv("SEMVEX_TOP_K", 8))
RERANK_CANDIDATES = int(os.getenv("SEMVEX_RERANK_CANDIDATES", 30))
EMBED_DIM = int(os.getenv("SEMVEX_EMBED_DIM", 384))

# --- Embedding provider ------------------------------------------------------
# How query/document embeddings are produced. "auto" prefers a local
# sentence-transformers model if installed (best for bulk ingestion), else the
# HuggingFace Inference API if HF_API_TOKEN is set (best for a low-RAM VPS that
# only embeds live queries), else a stateless hashing fallback (no model, lower
# quality). Ingestion and query MUST use the same model — bge-small everywhere,
# so local and HF are vector-space compatible (both 384-d).
EMBEDDING_PROVIDER = os.getenv("SEMVEX_EMBEDDING_PROVIDER", "auto")  # auto|local|hf|hashing
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL", EMBEDDING_MODEL_NAME)
# HuggingFace retired the legacy `api-inference.huggingface.co/models/...` host in
# 2025 in favour of the router-based Inference Providers. The `hf-inference`
# provider's `pipeline/feature-extraction` route returns 2-D sentence vectors
# (n, dim) for bge-small — verified live. Override via HF_API_URL if you point at
# a dedicated Inference Endpoint or a different provider.
HF_API_URL = os.getenv(
    "HF_API_URL",
    f"https://router.huggingface.co/hf-inference/models/{HF_EMBEDDING_MODEL}"
    "/pipeline/feature-extraction",
)

# --- Elasticsearch (optional keyword engine) ---------------------------------
# When set, Elasticsearch serves the BM25 keyword baseline; the app falls back
# to Postgres full-text (tsvector) whenever ES is unreachable or KEYWORD_ENGINE
# says so. ES is a pure ranker — product data + vectors stay in Postgres.
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "")
ELASTICSEARCH_API_KEY = os.getenv("ELASTICSEARCH_API_KEY", "")
ELASTICSEARCH_INDEX = os.getenv("ELASTICSEARCH_INDEX", "semvex_products")
KEYWORD_ENGINE = os.getenv("SEMVEX_KEYWORD_ENGINE", "auto")  # auto|elasticsearch|tsvector
ES_CONFIGURED = bool(ELASTICSEARCH_URL)

# --- Email (Gmail SMTP) for signup verification ---
# App password (not your normal Gmail password) generated at
# https://myaccount.google.com/apppasswords. Leave blank to disable real email
# sending — in that case the verification code is logged to the server console
# so the signup flow still works locally.
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM") or (f"{APP_NAME} <{SMTP_USER}>" if SMTP_USER else "")
EMAIL_ENABLED = bool(SMTP_USER and SMTP_APP_PASSWORD)
EMAIL_CODE_TTL = int(os.getenv("SEMVEX_EMAIL_CODE_TTL", 600))          # 10 min
EMAIL_CODE_MAX_ATTEMPTS = int(os.getenv("SEMVEX_EMAIL_CODE_MAX_ATTEMPTS", 5))

# --- Google OAuth (optional) ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
OAUTH_REDIRECT_URI = os.getenv(
    "SEMVEX_OAUTH_REDIRECT", "http://localhost:3000/auth/google/callback"
)
GOOGLE_ENABLED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
POST_LOGIN_REDIRECT = os.getenv("SEMVEX_POST_LOGIN_REDIRECT", "/search")
LOGIN_ERROR_REDIRECT = os.getenv("SEMVEX_LOGIN_ERROR_REDIRECT", "/signin#error")
