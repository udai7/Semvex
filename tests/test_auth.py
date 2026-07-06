"""Auth + 2FA flow tests."""
from app import security

from .conftest import register_and_login


def test_search_requires_auth(client):
    assert client.get("/search/semantic?q=shoes").status_code == 401


def test_signup_password_too_short(client):
    r = client.post("/auth/signup", json={"email": "a@b.com", "password": "short"})
    assert r.status_code == 400


def test_full_2fa_enrollment_and_session(client):
    data = register_and_login(client)
    assert data["ok"] and len(data["backup_codes"]) == 8
    me = client.get("/auth/me").json()
    assert me["authenticated"] and me["email"] == "admin@test.com"
    assert me["is_admin"] is True


def test_login_rejects_wrong_totp(client):
    register_and_login(client, email="u2@test.com")
    client.post("/auth/logout")
    r = client.post("/auth/login", json={"email": "u2@test.com", "password": "supersecret"})
    preauth = r.json()["preauth"]
    bad = client.post("/auth/totp/verify", json={"preauth": preauth, "code": "000000"})
    assert bad.status_code == 401


def test_backup_code_login(client):
    data = register_and_login(client, email="u3@test.com")
    code = data["backup_codes"][0]
    client.post("/auth/logout")
    r = client.post("/auth/login", json={"email": "u3@test.com", "password": "supersecret"})
    preauth = r.json()["preauth"]
    ok = client.post("/auth/totp/verify", json={"preauth": preauth, "code": code})
    assert ok.status_code == 200 and ok.json()["used_backup_code"] is True
    # a backup code is single-use
    client.post("/auth/logout")
    r = client.post("/auth/login", json={"email": "u3@test.com", "password": "supersecret"})
    preauth = r.json()["preauth"]
    again = client.post("/auth/totp/verify", json={"preauth": preauth, "code": code})
    assert again.status_code == 401
