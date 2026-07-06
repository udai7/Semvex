"""Shared test fixtures. Isolates each run against a throwaway SQLite DB."""
import os
import tempfile

import pytest

# Point the app at a temp DB *before* importing it, and mark the test user admin.
_TMP_DB = os.path.join(tempfile.gettempdir(), "semvex_test.db")
os.environ["SEMVEX_DB"] = _TMP_DB
os.environ["SEMVEX_SECRET"] = "test-secret-stable"
os.environ["SEMVEX_ADMIN_EMAILS"] = "admin@test.com"
os.environ["SEMVEX_AUTH_RATE_MAX"] = "100000"  # the shared counter would trip mid-suite


@pytest.fixture()
def client():
    if os.path.exists(_TMP_DB):
        os.remove(_TMP_DB)
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


def register_and_login(client, email="admin@test.com", password="supersecret"):
    """Full signup + 2FA enrollment; returns the authenticated client."""
    from app import security

    r = client.post("/auth/signup", json={"email": email, "password": password})
    preauth = r.json()["preauth"]
    secret = client.post("/auth/totp/provision", json={"preauth": preauth}).json()["secret"]
    code = security.totp_now(secret)
    r = client.post("/auth/totp/enable", json={"preauth": preauth, "code": code})
    assert r.status_code == 200
    return r.json()
