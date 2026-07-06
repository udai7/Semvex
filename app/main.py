"""Semvex API — auth-gated semantic product search with reranking, filters,
personalization, and analytics.

Auth:      /auth/signup /auth/login /auth/logout /auth/me
2FA:       /auth/totp/provision /auth/totp/enable /auth/totp/verify (TOTP or backup code)
OAuth:     /auth/google/start /auth/google/callback
Search:    /search/{keyword,semantic,hybrid} /search/compare
Discover:  /suggest /product/{sku} /facets /browse
Account:   /me/favorites /me/recently-viewed /me/saved-searches  (+ POST/DELETE)
Signals:   /feedback /click
Admin:     /admin/analytics
Eval:      /eval/labels /eval/live?q=
Meta:      /health /config
UI:        /  (bundled static SPA)
"""
from __future__ import annotations

import logging
import math
import time
from collections import defaultdict
from urllib.parse import urlencode

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr

from . import config, security, store
from .catalog import get_catalog, parse_nl_filters

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s semvex %(message)s",
)
log = logging.getLogger("semvex")

app = FastAPI(title="Semvex", version="2.0")


@app.on_event("startup")
def _startup() -> None:
    store.init()
    cat = get_catalog()
    log.info("startup products=%d embed=%s rerank=%s",
             len(cat.products), cat.embed_mode, cat.rerank_mode)


# --------------------------------------------------------------------------- #
# Helpers: sessions, auth guard, rate limiting
# --------------------------------------------------------------------------- #
def _set_session_cookie(resp: Response, email: str) -> None:
    resp.set_cookie(
        config.SESSION_COOKIE, security.issue_session(email),
        max_age=config.SESSION_TTL_SECONDS, httponly=True, samesite="lax",
    )


def _current_user(request: Request):
    return security.read_session(request.cookies.get(config.SESSION_COOKIE))


class _Unauthorized(Exception):
    pass


class _RateLimited(Exception):
    pass


def _require_user(request: Request) -> str:
    email = _current_user(request)
    if not email:
        raise _Unauthorized()
    return email


@app.exception_handler(_Unauthorized)
async def _unauth_handler(_req, _exc):
    return JSONResponse({"error": "authentication required"}, status_code=401)


@app.exception_handler(_RateLimited)
async def _rate_handler(_req, _exc):
    return JSONResponse({"error": "Too many attempts. Please wait a minute."}, status_code=429)


_RATE: dict[str, list[float]] = defaultdict(list)


def _rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = [t for t in _RATE[ip] if now - t < config.AUTH_RATE_WINDOW]
    hits.append(now)
    _RATE[ip] = hits
    if len(hits) > config.AUTH_RATE_MAX:
        log.warning("rate-limit ip=%s", ip)
        raise _RateLimited()


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class Credentials(BaseModel):
    email: EmailStr
    password: str


class Preauth(BaseModel):
    preauth: str


class EnableBody(BaseModel):
    preauth: str
    code: str


# --------------------------------------------------------------------------- #
# Email + password auth
# --------------------------------------------------------------------------- #
@app.post("/auth/signup")
def signup(body: Credentials, request: Request):
    _rate_limit(request)
    email = body.email.lower()
    if len(body.password) < 8:
        return JSONResponse({"error": "Password must be at least 8 characters."}, status_code=400)
    if store.get_user(email):
        return JSONResponse({"error": "Account already exists."}, status_code=409)
    store.create_user(email, security.hash_password(body.password))
    log.info("signup email=%s", email)
    return {"next": "totp_setup", "preauth": security.issue_preauth(email, "setup")}


@app.post("/auth/login")
def login(body: Credentials, request: Request):
    _rate_limit(request)
    email = body.email.lower()
    user = store.get_user(email)
    if not user or not user["password_hash"] or not security.verify_password(
        body.password, user["password_hash"]
    ):
        return JSONResponse({"error": "Invalid email or password."}, status_code=401)
    if user["totp_enabled"]:
        return {"next": "totp", "preauth": security.issue_preauth(email, "login")}
    return {"next": "totp_setup", "preauth": security.issue_preauth(email, "setup")}


# --------------------------------------------------------------------------- #
# 2-step verification (TOTP + backup codes)
# --------------------------------------------------------------------------- #
@app.post("/auth/totp/provision")
def totp_provision(body: Preauth):
    email = security.read_preauth(body.preauth, "setup")
    if not email:
        return JSONResponse({"error": "Setup session expired."}, status_code=401)
    secret = security.new_totp_secret()
    store.set_totp_secret(email, secret)
    uri = security.otpauth_uri(secret, email)
    return {"secret": secret, "otpauth_uri": uri, "qr_svg": security.qr_svg(uri)}


@app.post("/auth/totp/enable")
def totp_enable(body: EnableBody, request: Request):
    _rate_limit(request)
    email = security.read_preauth(body.preauth, "setup")
    if not email:
        return JSONResponse({"error": "Setup session expired."}, status_code=401)
    user = store.get_user(email)
    if not user or not user["totp_secret"]:
        return JSONResponse({"error": "No 2FA secret provisioned."}, status_code=400)
    if not security.verify_totp(user["totp_secret"], body.code):
        return JSONResponse({"error": "Incorrect code. Try again."}, status_code=401)
    store.enable_totp(email)
    codes = security.generate_backup_codes()
    store.store_backup_codes(email, [security.hash_backup_code(c) for c in codes])
    resp = JSONResponse({"ok": True, "email": email, "backup_codes": codes})
    _set_session_cookie(resp, email)
    log.info("2fa-enabled email=%s", email)
    return resp


@app.post("/auth/totp/verify")
def totp_verify(body: EnableBody, request: Request):
    _rate_limit(request)
    email = security.read_preauth(body.preauth, "login")
    if not email:
        return JSONResponse({"error": "Login session expired."}, status_code=401)
    user = store.get_user(email)
    if not user:
        return JSONResponse({"error": "Account not found."}, status_code=401)
    ok = security.verify_totp(user["totp_secret"], body.code)
    used_backup = False
    if not ok and "-" in body.code:
        ok = store.consume_backup_code(email, security.hash_backup_code(body.code))
        used_backup = ok
    if not ok:
        return JSONResponse({"error": "Incorrect code. Try again."}, status_code=401)
    resp = JSONResponse({"ok": True, "email": email, "used_backup_code": used_backup})
    _set_session_cookie(resp, email)
    return resp


# --------------------------------------------------------------------------- #
# Google OAuth 2.0
# --------------------------------------------------------------------------- #
@app.get("/auth/google/start")
def google_start():
    if not config.GOOGLE_ENABLED:
        return JSONResponse({"error": "Google sign-in is not configured on this server."}, status_code=501)
    import secrets

    state = secrets.token_urlsafe(16)
    params = {
        "client_id": config.GOOGLE_CLIENT_ID, "redirect_uri": config.OAUTH_REDIRECT_URI,
        "response_type": "code", "scope": "openid email profile", "state": state,
        "access_type": "online", "prompt": "select_account",
    }
    resp = RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))
    resp.set_cookie("oauth_state", state, httponly=True, samesite="lax", max_age=600)
    return resp


@app.get("/auth/google/callback")
def google_callback(request: Request, code: str = "", state: str = ""):
    err = config.LOGIN_ERROR_REDIRECT
    if not config.GOOGLE_ENABLED:
        return RedirectResponse(f"{err}=google_disabled")
    if not code or state != request.cookies.get("oauth_state"):
        return RedirectResponse(f"{err}=oauth_state")

    import json
    import urllib.request

    token_req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urlencode({
            "code": code, "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "redirect_uri": config.OAUTH_REDIRECT_URI, "grant_type": "authorization_code",
        }).encode(),
        method="POST",
    )
    try:
        with urllib.request.urlopen(token_req, timeout=10) as r:
            tokens = json.loads(r.read())
        info_req = urllib.request.Request(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        with urllib.request.urlopen(info_req, timeout=10) as r:
            info = json.loads(r.read())
    except Exception:
        return RedirectResponse(f"{err}=oauth_exchange")

    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified", True):
        return RedirectResponse(f"{err}=oauth_email")

    store.upsert_oauth_user(email, provider="google")
    resp = RedirectResponse(config.POST_LOGIN_REDIRECT)
    _set_session_cookie(resp, email)
    resp.delete_cookie("oauth_state")
    return resp


# --------------------------------------------------------------------------- #
# Session
# --------------------------------------------------------------------------- #
@app.get("/auth/me")
def me(request: Request):
    email = _current_user(request)
    if not email:
        return JSONResponse({"authenticated": False}, status_code=200)
    user = store.get_user(email)
    return {
        "authenticated": True, "email": email,
        "provider": user["provider"] if user else "password",
        "is_admin": config.is_admin(email),
    }


@app.post("/auth/logout")
def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(config.SESSION_COOKIE)
    return resp


# --------------------------------------------------------------------------- #
# Search
# --------------------------------------------------------------------------- #
def _run(mode, request, q, k, category, brand, min_price, max_price, alpha, diversity, rerank):
    email = _require_user(request)
    cat = get_catalog()
    parsed = parse_nl_filters(q or "")
    residual = parsed["residual"] or (q or "")
    nlf = parsed["filters"]
    eff_min = min_price if min_price is not None else nlf.get("min_price")
    eff_max = max_price if max_price is not None else nlf.get("max_price")

    t0 = time.perf_counter()
    results = cat.search(
        mode, residual, k, category=category, brand=brand,
        min_price=eff_min, max_price=eff_max, alpha=alpha,
        diversity=diversity, rerank=rerank,
    ) if residual.strip() else []
    took = (time.perf_counter() - t0) * 1000
    store.log_query(email, q, mode, len(results), took)
    return {
        "query": q, "mode": mode, "embed_mode": cat.embed_mode, "rerank_mode": cat.rerank_mode,
        "took_ms": round(took, 2),
        "applied_filters": {k2: v for k2, v in
                            {"category": category, "brand": brand,
                             "min_price": eff_min, "max_price": eff_max}.items() if v is not None},
        "did_you_mean": cat.did_you_mean(residual),
        "results": results,
    }


@app.get("/search/keyword")
def search_keyword(request: Request, q: str = "", k: int = config.DEFAULT_TOP_K,
                   category: str | None = None, brand: str | None = None,
                   min_price: int | None = None, max_price: int | None = None,
                   diversity: bool = False, rerank: bool = False):
    return _run("keyword", request, q, k, category, brand, min_price, max_price, None, diversity, rerank)


@app.get("/search/semantic")
def search_semantic(request: Request, q: str = "", k: int = config.DEFAULT_TOP_K,
                    category: str | None = None, brand: str | None = None,
                    min_price: int | None = None, max_price: int | None = None,
                    diversity: bool = False, rerank: bool = False):
    return _run("semantic", request, q, k, category, brand, min_price, max_price, None, diversity, rerank)


@app.get("/search/hybrid")
def search_hybrid(request: Request, q: str = "", k: int = config.DEFAULT_TOP_K,
                  category: str | None = None, brand: str | None = None,
                  min_price: int | None = None, max_price: int | None = None,
                  alpha: float | None = None, diversity: bool = False, rerank: bool = False):
    return _run("hybrid", request, q, k, category, brand, min_price, max_price, alpha, diversity, rerank)


@app.get("/search/compare")
def search_compare(request: Request, q: str = "", k: int = config.DEFAULT_TOP_K,
                   category: str | None = None, brand: str | None = None,
                   min_price: int | None = None, max_price: int | None = None,
                   alpha: float | None = None, diversity: bool = False, rerank: bool = False):
    email = _require_user(request)
    cat = get_catalog()
    parsed = parse_nl_filters(q or "")
    residual = parsed["residual"] or (q or "")
    nlf = parsed["filters"]
    eff_min = min_price if min_price is not None else nlf.get("min_price")
    eff_max = max_price if max_price is not None else nlf.get("max_price")

    out = {}
    took = {}
    for mode in ("keyword", "semantic", "hybrid"):
        t0 = time.perf_counter()
        out[mode] = cat.search(
            mode, residual, k, category=category, brand=brand,
            min_price=eff_min, max_price=eff_max,
            alpha=alpha if mode == "hybrid" else None,
            diversity=diversity, rerank=rerank,
        ) if residual.strip() else []
        took[mode] = round((time.perf_counter() - t0) * 1000, 2)
        store.log_query(email, q, mode, len(out[mode]), took[mode])

    # overlap: how many SKUs the three rankings share (top-k)
    sets = {m: {r["sku"] for r in out[m]} for m in out}
    overlap = {
        "all_three": len(sets["keyword"] & sets["semantic"] & sets["hybrid"]),
        "keyword_semantic": len(sets["keyword"] & sets["semantic"]),
        "semantic_only": len(sets["semantic"] - sets["keyword"]),
        "keyword_only": len(sets["keyword"] - sets["semantic"]),
    }
    return {
        "query": q, "embed_mode": cat.embed_mode, "rerank_mode": cat.rerank_mode,
        "took_ms": took, "overlap": overlap,
        "applied_filters": {k2: v for k2, v in
                            {"category": category, "brand": brand,
                             "min_price": eff_min, "max_price": eff_max}.items() if v is not None},
        "did_you_mean": cat.did_you_mean(residual),
        "keyword": out["keyword"], "semantic": out["semantic"], "hybrid": out["hybrid"],
        "live_metrics": _live_metrics(residual),
    }


# --------------------------------------------------------------------------- #
# Discovery: suggest / product / facets / browse
# --------------------------------------------------------------------------- #
@app.get("/suggest")
def suggest(q: str = ""):
    return {"suggestions": get_catalog().suggest(q)}


@app.get("/facets")
def facets():
    return get_catalog().facets()


@app.get("/browse")
def browse(request: Request, category: str | None = None, brand: str | None = None,
           min_price: int | None = None, max_price: int | None = None,
           sort: str = "relevance", limit: int = 40):
    _require_user(request)
    return {"results": get_catalog().browse(category, brand, min_price, max_price, sort, limit)}


@app.get("/product/{sku}")
def product(sku: str, request: Request):
    email = _require_user(request)
    cat = get_catalog()
    if sku not in cat.by_sku:
        return JSONResponse({"error": "Product not found."}, status_code=404)
    store.record_view(email, sku)
    return {"product": cat.by_sku[sku], "similar": cat.similar(sku)}


# --------------------------------------------------------------------------- #
# Account: favorites / recently viewed / saved searches
# --------------------------------------------------------------------------- #
class SkuBody(BaseModel):
    sku: str


@app.get("/me/favorites")
def get_favorites(request: Request):
    email = _require_user(request)
    cat = get_catalog()
    skus = store.list_favorites(email)
    return {"favorites": [cat.by_sku[s] for s in skus if s in cat.by_sku]}


@app.post("/me/favorites")
def add_favorite(body: SkuBody, request: Request):
    email = _require_user(request)
    store.add_favorite(email, body.sku)
    return {"ok": True}


@app.delete("/me/favorites/{sku}")
def del_favorite(sku: str, request: Request):
    email = _require_user(request)
    store.remove_favorite(email, sku)
    return {"ok": True}


@app.get("/me/recently-viewed")
def recently_viewed(request: Request):
    email = _require_user(request)
    cat = get_catalog()
    skus = store.list_recently_viewed(email)
    return {"recently_viewed": [cat.by_sku[s] for s in skus if s in cat.by_sku]}


class SaveSearchBody(BaseModel):
    query: str
    mode: str = "compare"


@app.get("/me/saved-searches")
def saved_searches(request: Request):
    email = _require_user(request)
    return {"saved_searches": store.list_saved_searches(email)}


@app.post("/me/saved-searches")
def save_search(body: SaveSearchBody, request: Request):
    email = _require_user(request)
    store.save_search(email, body.query, body.mode)
    return {"ok": True}


@app.delete("/me/saved-searches/{search_id}")
def delete_saved_search(search_id: int, request: Request):
    email = _require_user(request)
    store.delete_saved_search(email, search_id)
    return {"ok": True}


# --------------------------------------------------------------------------- #
# Signals: relevance feedback + click tracking
# --------------------------------------------------------------------------- #
class FeedbackBody(BaseModel):
    query: str
    sku: str
    mode: str
    rating: int


@app.post("/feedback")
def feedback(body: FeedbackBody, request: Request):
    email = _require_user(request)
    store.record_feedback(email, body.query, body.sku, body.mode, body.rating)
    return {"ok": True}


class ClickBody(BaseModel):
    query: str
    sku: str
    mode: str


@app.post("/click")
def click(body: ClickBody, request: Request):
    email = _current_user(request)
    store.log_click(email, body.query, body.sku, body.mode)
    return {"ok": True}


# --------------------------------------------------------------------------- #
# Admin analytics
# --------------------------------------------------------------------------- #
@app.get("/admin/analytics")
def admin_analytics(request: Request):
    email = _require_user(request)
    if not config.is_admin(email):
        return JSONResponse({"error": "Admin access required."}, status_code=403)
    return store.analytics_summary()


# --------------------------------------------------------------------------- #
# Evaluation (live, per-query)
# --------------------------------------------------------------------------- #
def _load_labels() -> dict:
    try:
        from eval.evaluate import LABELS
        return LABELS
    except Exception:
        return {}


def _metrics(ranked: list[str], rel: set, k: int = 5) -> dict:
    top = ranked[:k]
    recall = len(set(top) & rel) / len(rel) if rel else 0.0
    rr = next((1.0 / i for i, s in enumerate(top, 1) if s in rel), 0.0)
    dcg = sum(1.0 / math.log2(i + 1) for i, s in enumerate(top, 1) if s in rel)
    ideal = sum(1.0 / math.log2(i + 1) for i in range(1, min(len(rel), k) + 1))
    ndcg = dcg / ideal if ideal else 0.0
    return {"recall": round(recall, 3), "mrr": round(rr, 3), "ndcg": round(ndcg, 3)}


def _live_metrics(query: str) -> dict | None:
    """If the query is in the labeled eval set, compute per-mode metrics live."""
    labels = _load_labels()
    rel = labels.get(query.strip().lower()) or labels.get(query.strip())
    if not rel:
        return None
    cat = get_catalog()
    return {
        m: _metrics([r["sku"] for r in cat.search(m, query, top_k=5)], set(rel))
        for m in ("keyword", "semantic", "hybrid")
    }


@app.get("/eval/labels")
def eval_labels():
    return {"queries": sorted(_load_labels().keys())}


@app.get("/eval/live")
def eval_live(request: Request, q: str = ""):
    _require_user(request)
    return {"query": q, "metrics": _live_metrics(q)}


# --------------------------------------------------------------------------- #
# Meta
# --------------------------------------------------------------------------- #
@app.get("/health")
def health():
    cat = get_catalog()
    return {"status": "ok", "products": len(cat.products),
            "embed_mode": cat.embed_mode, "rerank_mode": cat.rerank_mode}


@app.get("/config")
def public_config():
    return {"google_enabled": config.GOOGLE_ENABLED, "app_name": config.APP_NAME}


# --------------------------------------------------------------------------- #
# Static SPA
# --------------------------------------------------------------------------- #
@app.get("/")
def index():
    return FileResponse(config.STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")
