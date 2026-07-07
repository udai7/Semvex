"""PostgreSQL connection pool + schema management.

Postgres is the single source of truth: users/accounts/analytics AND the product
catalog with pgvector embeddings. A psycopg3 connection pool is shared across the
app; `pgvector` is registered on each connection so Python lists map to `vector`.
"""
from __future__ import annotations

from contextlib import contextmanager

from pgvector.psycopg import register_vector
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from . import config

_pool: ConnectionPool | None = None


def _configure(conn) -> None:
    conn.row_factory = dict_row
    try:
        register_vector(conn)
    except Exception:
        # Fresh database: the `vector` type doesn't exist yet, so registration
        # fails before init_schema ever runs. Create the extension here (once,
        # on the first connection) and retry — this makes the app bootstrap on a
        # brand-new Postgres/Neon DB with no manual `CREATE EXTENSION` step.
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        conn.commit()
        register_vector(conn)


def pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            config.DATABASE_URL,
            min_size=config.DB_POOL_MIN,
            max_size=config.DB_POOL_MAX,
            configure=_configure,
            open=True,
        )
    return _pool


@contextmanager
def connection():
    with pool().connection() as conn:
        yield conn


SCHEMA = f"""
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    email          TEXT PRIMARY KEY,
    password_hash  TEXT,
    provider       TEXT NOT NULL DEFAULT 'password',
    totp_secret    TEXT,
    totp_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profile + email-verification columns (idempotent for pre-existing tables).
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- One pending email-verification code per address; replaced on each (re)send.
CREATE TABLE IF NOT EXISTS email_codes (
    email       TEXT PRIMARY KEY,
    code_hash   TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_codes (
    email      TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS favorites (
    email      TEXT NOT NULL,
    sku        TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email, sku)
);

CREATE TABLE IF NOT EXISTS recently_viewed (
    email      TEXT NOT NULL,
    sku        TEXT NOT NULL,
    viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email, sku)
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT NOT NULL,
    query      TEXT NOT NULL,
    mode       TEXT NOT NULL DEFAULT 'compare',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
    email      TEXT NOT NULL,
    query      TEXT NOT NULL,
    sku        TEXT NOT NULL,
    mode       TEXT NOT NULL,
    rating     INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS query_log (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT,
    query       TEXT NOT NULL,
    mode        TEXT NOT NULL,
    n_results   INTEGER NOT NULL,
    ms          DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS click_log (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT,
    query       TEXT NOT NULL,
    sku         TEXT NOT NULL,
    mode        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    sku          TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    brand        TEXT NOT NULL,
    category     TEXT NOT NULL,
    price        INTEGER NOT NULL,
    description  TEXT NOT NULL,
    embedding    vector({config.EMBED_DIM}),
    search_tsv   tsvector
);

CREATE INDEX IF NOT EXISTS products_tsv_idx ON products USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS products_embedding_idx
    ON products USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products (brand);
"""


def init_schema() -> None:
    """Create the extension, tables, and indexes if they don't exist."""
    with connection() as conn:
        conn.execute(SCHEMA)
        conn.commit()


def products_count() -> int:
    with connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS n FROM products").fetchone()
        return row["n"]
