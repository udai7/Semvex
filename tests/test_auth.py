"""Auth + 2FA flow tests."""
from app import security

from .conftest import register_and_login


def _signup_body(email="a@b.com", password="supersecret", **overrides):
    body = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "phone": "+15550000000",
        "email": email,
        "password": password,
        "confirm_password": password,
        "agree_terms": True,
    }
    body.update(overrides)
    return body


def test_search_requires_auth(client):
    assert client.get("/search/semantic?q=shoes").status_code == 401


def test_signup_password_too_short(client):
    r = client.post("/auth/signup", json=_signup_body(password="short", confirm_password="short"))
    assert r.status_code == 400


def test_signup_password_mismatch(client):
    r = client.post("/auth/signup", json=_signup_body(confirm_password="different1"))
    assert r.status_code == 400


def test_signup_requires_agreement(client):
    r = client.post("/auth/signup", json=_signup_body(agree_terms=False))
    assert r.status_code == 400


def test_email_verification_flow(client):
    from app import security, store

    r = client.post("/auth/signup", json=_signup_body(email="verify@test.com"))
    assert r.status_code == 200 and r.json()["next"] == "verify_email"
    preauth = r.json()["preauth"]

    # Inject a known code (email delivery is disabled in tests).
    store.store_email_code("verify@test.com", security.hash_email_code("123456"), 600)

    bad = client.post("/auth/verify-email", json={"preauth": preauth, "code": "000000"})
    assert bad.status_code == 401

    ok = client.post("/auth/verify-email", json={"preauth": preauth, "code": "123456"})
    assert ok.status_code == 200 and ok.json()["next"] == "totp_setup"


def test_login_before_verification_routes_to_verify(client):
    client.post("/auth/signup", json=_signup_body(email="pending@test.com"))
    r = client.post("/auth/login", json={"email": "pending@test.com", "password": "supersecret"})
    assert r.status_code == 200 and r.json()["next"] == "verify_email"


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
