"""Transactional email over Gmail SMTP (stdlib only — smtplib + ssl).

Used for signup email-verification codes. If SMTP credentials aren't configured
(`EMAIL_ENABLED` is False), sends are skipped and the code is logged to the
server console instead, so the signup flow stays usable in local development.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from . import config

log = logging.getLogger("semvex")


def send_email(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send a single email. Returns True on success (or when email is disabled)."""
    if not config.EMAIL_ENABLED:
        log.warning("email disabled (no SMTP creds) — would send to=%s subject=%r", to, subject)
        return True

    msg = EmailMessage()
    msg["From"] = config.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        ctx = ssl.create_default_context()
        if config.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, context=ctx, timeout=15) as s:
                s.login(config.SMTP_USER, config.SMTP_APP_PASSWORD)
                s.send_message(msg)
        else:  # 587 / STARTTLS
            with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as s:
                s.starttls(context=ctx)
                s.login(config.SMTP_USER, config.SMTP_APP_PASSWORD)
                s.send_message(msg)
        log.info("email sent to=%s subject=%r", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001 — surface any SMTP/network failure to caller
        log.error("email send failed to=%s: %s", to, exc)
        return False


def send_verification_code(to: str, code: str, name: str | None = None) -> bool:
    """Email a 6-digit signup verification code."""
    if not config.EMAIL_ENABLED:
        # Dev convenience: make the code visible so signup can be completed.
        log.warning("[dev] verification code for %s = %s", to, code)
        return True

    greeting = f"Hi {name}," if name else "Hi,"
    minutes = max(1, config.EMAIL_CODE_TTL // 60)
    text = (
        f"{greeting}\n\n"
        f"Your {config.APP_NAME} verification code is: {code}\n\n"
        f"It expires in {minutes} minutes. If you didn't request this, ignore this email.\n"
    )
    html = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
  <h2 style="margin:0 0 4px">Verify your email</h2>
  <p style="color:#555;margin:0 0 20px">{greeting} enter this code to finish creating your {config.APP_NAME} account.</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f3f4f6;border-radius:10px;padding:18px;text-align:center">{code}</div>
  <p style="color:#888;font-size:13px;margin-top:20px">This code expires in {minutes} minutes. If you didn't request it, you can safely ignore this email.</p>
</div>"""
    return send_email(to, f"Your {config.APP_NAME} verification code", text, html)
