# Security Policy

Semvex is a portfolio/demo project, but we take security seriously and
appreciate responsible disclosure.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately via one of:

- GitHub's [private vulnerability reporting](https://github.com/udai7/Semvex/security/advisories/new)
  (Security → Report a vulnerability), or
- Email **udaid347@gmail.com** with the details.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof-of-concept if possible).
- Affected component/version (commit SHA).

We'll acknowledge your report within a few days and keep you updated on the fix.
Once resolved, we're happy to credit you unless you prefer to remain anonymous.

## Scope & notes

Semvex is intended to run behind your own deployment. A few demo-scope defaults
worth hardening before any public deployment (see `docs/production.md`):

- Set a strong `SEMVEX_SECRET` and never commit `.env` (it is git-ignored).
- Use real secrets for `DATABASE_URL`, `SMTP_APP_PASSWORD`, `HF_API_TOKEN`, and
  Google OAuth — rotate any credential that has ever been exposed.
- Serve over HTTPS and set the correct OAuth redirect origins in production.
- Rate limiting is applied to auth endpoints; tune the limits for your traffic.

Thank you for helping keep Semvex and its users safe.
