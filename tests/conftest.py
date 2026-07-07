"""Shared test fixtures.

Runs against a real Postgres + pgvector database (the app's only storage engine).
Point the suite at a throwaway DB via `SEMVEX_TEST_DATABASE_URL`; it defaults to
the local `pgvector/pgvector:pg16` container on :5433 (see docker-compose /
docs). It never falls back to `DATABASE_URL`, so a developer's real/Neon DB is
never touched by the tests.

Products are seeded once per session; the mutable user/analytics tables are
truncated before every test for isolation.
"""
import os

import pytest

# Configure the environment BEFORE importing the app (config reads it at import).
_TEST_DB = os.environ.get(
    "SEMVEX_TEST_DATABASE_URL", "postgresql://semvex:semvex@localhost:5433/semvex"
)
os.environ["DATABASE_URL"] = _TEST_DB            # force the app onto the test DB
os.environ["SEMVEX_SECRET"] = "test-secret-stable"
os.environ["SEMVEX_ADMIN_EMAILS"] = "admin@test.com"
os.environ["SEMVEX_AUTH_RATE_MAX"] = "100000"    # the shared counter would trip mid-suite
# Leave SMTP_* unset → email sending is disabled; verification codes are not sent.

# Tables cleared between tests. Products/schema persist (seeded once per session).
_MUTABLE_TABLES = (
    "backup_codes",
    "email_codes",
    "favorites",
    "recently_viewed",
    "saved_searches",
    "feedback",
    "query_log",
    "click_log",
    "users",
)


@pytest.fixture(scope="session", autouse=True)
def _db_session():
    """Create schema + seed the product catalog once for the whole test run."""
    from app import db
    from app.ingest import ingest

    db.init_schema()  # auto-creates the pgvector extension on a fresh DB
    with db.connection() as c:
        c.execute("TRUNCATE products")
        c.commit()
    ingest()
    yield


@pytest.fixture()
def client():
    from app import db

    with db.connection() as c:
        c.execute(f"TRUNCATE {', '.join(_MUTABLE_TABLES)} RESTART IDENTITY CASCADE")
        c.commit()

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


def register_and_login(client, email="admin@test.com", password="supersecret"):
    """Full signup → email verification → 2FA enrollment; returns the enable payload."""
    from app import security, store

    r = client.post(
        "/auth/signup",
        json={
            "first_name": "Test",
            "last_name": "User",
            "phone": "+15550000000",
            "email": email,
            "password": password,
            "confirm_password": password,
            "agree_terms": True,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["next"] == "verify_email"

    # Email delivery is disabled in tests — mark the address verified directly,
    # then mint the setup preauth the verify-email step would have returned.
    store.mark_email_verified(email)
    preauth = security.issue_preauth(email, "setup")

    secret = client.post("/auth/totp/provision", json={"preauth": preauth}).json()["secret"]
    code = security.totp_now(secret)
    r = client.post("/auth/totp/enable", json={"preauth": preauth, "code": code})
    assert r.status_code == 200, r.text
    return r.json()
