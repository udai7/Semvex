"""Password hashing, signed session tokens, and TOTP 2-step verification.

All stdlib — no PyJWT / passlib / pyotp needed, which keeps the dependency
surface tiny and the auth mechanics fully readable for a portfolio walkthrough.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import struct
import time

from . import config

# --------------------------------------------------------------------------- #
# Password hashing (PBKDF2-HMAC-SHA256)
# --------------------------------------------------------------------------- #
_PBKDF2_ROUNDS = 200_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${_PBKDF2_ROUNDS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, rounds, salt_hex, hash_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


# --------------------------------------------------------------------------- #
# Signed session tokens (compact, HMAC-signed JSON — JWT-shaped, no library)
# --------------------------------------------------------------------------- #
def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def sign_payload(payload: dict) -> str:
    body = _b64e(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(config.SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64e(sig)}"


def unsign_payload(token: str | None) -> dict | None:
    if not token or "." not in token:
        return None
    body, sig = token.rsplit(".", 1)
    expected = hmac.new(
        config.SECRET_KEY.encode(), body.encode(), hashlib.sha256
    ).digest()
    if not hmac.compare_digest(_b64e(expected), sig):
        return None
    try:
        payload = json.loads(_b64d(body))
    except (ValueError, json.JSONDecodeError):
        return None
    if payload.get("exp", 0) < time.time():
        return None
    return payload


def issue_session(email: str) -> str:
    return sign_payload(
        {"sub": email, "exp": int(time.time()) + config.SESSION_TTL_SECONDS}
    )


# Short-lived token that carries a user between password check and 2FA step.
def issue_preauth(email: str, purpose: str) -> str:
    return sign_payload(
        {"sub": email, "scope": "preauth", "purpose": purpose,
         "exp": int(time.time()) + 600}
    )


def read_preauth(token: str | None, purpose: str) -> str | None:
    payload = unsign_payload(token)
    if not payload or payload.get("scope") != "preauth":
        return None
    if payload.get("purpose") != purpose:
        return None
    return payload.get("sub")


def read_session(token: str | None) -> str | None:
    """Return the authenticated email, or None if the token is absent/invalid/expired."""
    payload = unsign_payload(token)
    if not payload or payload.get("scope") == "preauth":
        return None
    return payload.get("sub")


# --------------------------------------------------------------------------- #
# TOTP (RFC 6238) — Google Authenticator / Authy compatible
# --------------------------------------------------------------------------- #
def new_totp_secret() -> str:
    """Return a base32 secret suitable for an authenticator app."""
    return base64.b32encode(os.urandom(20)).decode().rstrip("=")


def _hotp(secret_b32: str, counter: int, digits: int = 6) -> str:
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8))
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (
        10 ** digits
    )
    return str(code).zfill(digits)


def totp_now(secret_b32: str, step: int = 30) -> str:
    return _hotp(secret_b32, int(time.time()) // step)


def verify_totp(secret_b32: str, code: str, step: int = 30, window: int = 1) -> bool:
    """Verify a 6-digit code, tolerating ±`window` steps of clock drift."""
    code = (code or "").strip().replace(" ", "")
    if not code.isdigit():
        return False
    counter = int(time.time()) // step
    for drift in range(-window, window + 1):
        if hmac.compare_digest(_hotp(secret_b32, counter + drift), code):
            return True
    return False


def generate_backup_codes(n: int = 8) -> list[str]:
    """One-time recovery codes shown once at 2FA enrollment."""
    import secrets

    return [f"{secrets.randbelow(10**4):04d}-{secrets.randbelow(10**4):04d}" for _ in range(n)]


def hash_backup_code(code: str) -> str:
    normalized = code.strip().replace(" ", "").replace("-", "")
    return hashlib.sha256(normalized.encode()).hexdigest()


def otpauth_uri(secret_b32: str, account: str) -> str:
    from urllib.parse import quote

    label = quote(f"{config.ISSUER}:{account}")
    return (
        f"otpauth://totp/{label}?secret={secret_b32}"
        f"&issuer={quote(config.ISSUER)}&algorithm=SHA1&digits=6&period=30"
    )


def qr_svg(data: str) -> str:
    """Render `data` as an inline SVG QR code (no PIL dependency)."""
    import qrcode
    import qrcode.image.svg

    img = qrcode.make(data, image_factory=qrcode.image.svg.SvgPathImage, box_size=10)
    import io

    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode()
