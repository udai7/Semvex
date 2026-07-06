# Semvex — Semantic Product Search

A working, auth-gated demo of **semantic vs. keyword vs. hybrid** product search,
built from the specs in [`docs/`](./docs). Keyword search matches strings; Semvex
also matches *intent* — so "sports sneakers" finds running shoes and "cheap gaming
laptop" understands budget and specs.

It keeps the documented three-tier shape — **Next.js + TypeScript frontend /
FastAPI ranking service / data layer** — but the ranking service runs the vector
and keyword indexes in-process so it boots with **no external services**.

## Features

**Search intelligence**
- Keyword (BM25), semantic (dense-vector), and hybrid (RRF) retrieval, compared side by side
- **Tunable α slider** — blend keyword↔semantic weighting live
- **Two-stage reranking** — cross-encoder (`bge-reranker-base`) when installed, lexical fallback otherwise
- **MMR diversity** — suppress near-duplicate results
- **Natural-language filters** — "laptop under 300" parses the price constraint out of the query
- **Did-you-mean** spell correction, and **autocomplete** suggestions
- Faceted filters (category / brand / price)

**Proof / credibility**
- **Live NDCG/Recall/MRR overlay** for labeled queries, right in the UI (winner starred)
- **Latency badges** (per-mode timing) and **result-overlap** stats
- **Relevance feedback** (👍/👎) and click tracking feeding the analytics

**Accounts & data**
- Email + password with **TOTP 2-step verification** and one-time **backup codes**
- Real **Google OAuth 2.0** (when configured)
- **Favorites**, **recently viewed**, **saved searches**
- **Rate limiting** on auth endpoints

**Discovery & admin**
- Product detail pages with **"similar products" (vector kNN)**
- **Admin analytics** dashboard: top queries, zero-result queries, latency and CTR by mode
- Placeholder product thumbnails (emoji + deterministic gradient)

See [`docs/FEATURES.md`](./docs/FEATURES.md) for the full list mapped to endpoints and files.

## Quick start

Two processes: the FastAPI ranking service (`:8000`) and the Next.js frontend
(`:3000`). Run them in two terminals.

**1. Backend**

```bash
./run.sh                      # venv + deps + uvicorn on :8000
```

**2. Frontend**

```bash
cd frontend
npm install
SEMVEX_POST_LOGIN_REDIRECT=/search npm run dev   # Next.js on :3000
# → open http://localhost:3000
```

The frontend proxies `/auth/*`, `/search/*`, `/config`, `/health` to the backend
(see `frontend/next.config.mjs`), so the browser talks to a single origin and the
session cookie stays same-origin.

> A dependency-free static SPA build of the same UI is also served directly by the
> backend at `http://localhost:8000` — handy if you want to try it without Node.

## The UI flow

1. **Landing** — clean hero explaining the three retrieval modes.
2. **Sign in** — either:
   - **Email + password**, followed by **2-step verification** (TOTP). New accounts
     scan a QR code into Google Authenticator / Authy and confirm a 6-digit code
     before they get a session. Returning users enter the code from their app.
   - **Google OAuth** (real authorization-code flow; enabled when configured — see below).
3. **Search app** — query box + example chips + a mode toggle. **Compare** mode shows
   keyword / semantic / hybrid results side by side with relevance scores.

## Architecture (as built)

```
Next.js frontend (:3000)  ──▶  FastAPI service (:8000)  ──┬─▶ BM25 keyword index    (stands in for Elasticsearch)
  landing / auth / 2FA         /auth/*  /search/*          ├─▶ dense-vector semantic (stands in for Supabase pgvector)
  search comparison UI     (proxied same-origin via Next)  └─▶ RRF hybrid fusion
```

Mapping to the design docs:

| Doc component            | In this build |
|--------------------------|---------------|
| Ranking service (FastAPI)| `app/main.py`, `app/catalog.py` — same `/search/{keyword,semantic,hybrid}` contract |
| Semantic (pgvector)      | in-process cosine over precomputed embeddings (`app/catalog.py`) |
| Keyword (Elasticsearch)  | in-process BM25 (`app/catalog.py`) |
| Hybrid ranking           | Reciprocal Rank Fusion |
| Evaluation harness       | `eval/evaluate.py` — Recall@K / MRR / NDCG |
| Frontend (Next.js + TS)  | `frontend/` — app-router pages: landing, `/signin`, `/twofa`, `/search` |
| Frontend (no-Node option)| static SPA in `app/static/`, served by the backend at `:8000` |

### Embeddings

If you install `sentence-transformers`, Semvex uses the PRD's model
(`BAAI/bge-small-en-v1.5`) for true dense-vector semantic search:

```bash
pip install sentence-transformers   # optional, ~heavy
```

Without it, a **lexical + synonym-expansion fallback** keeps semantic search
meaningfully different from keyword search so the comparison still lands. The UI
badge shows which mode is active.

## Evaluation

```bash
python -m eval.evaluate
```

Runs a small labeled query set and prints Recall@5 / MRR / NDCG@5 for each mode —
the actual proof point that semantic/hybrid beat the keyword baseline. Swap
`LABELS` for the Amazon ESCI subset to reproduce the PRD's benchmark. The same
labels power the **live NDCG overlay** in the search UI.

## Tests & CI

```bash
pip install -r requirements-dev.txt
python -m pytest -q          # 15 tests: auth/2FA/backup-codes + search intelligence
```

GitHub Actions (`.github/workflows/ci.yml`) runs the pytest suite, the eval
harness, and the Next.js build on every push/PR.

## Docker

```bash
docker compose up --build     # frontend :3000, api :8000, elasticsearch :9200
```

`api` + `frontend` are enough to run the demo (indexes are in-process). The
`elasticsearch` service is included to match `docs/production.md`'s documented
BM25 topology for when you graduate off the in-process index.

## Admin analytics

Grant your account access and open **/admin**:

```bash
export SEMVEX_ADMIN_EMAILS=you@example.com   # backend env
```

(If unset, any signed-in user can view analytics — convenient for the demo.)

## Google OAuth (optional)

Real Google sign-in is gated behind env vars — without them the button explains
it's not configured and you use email + password + 2FA.

When running the Next.js frontend, point the redirect at `:3000` (Next proxies it
back to the backend) and send users to `/search` after login:

```bash
# backend env
export GOOGLE_CLIENT_ID=...
export GOOGLE_CLIENT_SECRET=...
export SEMVEX_OAUTH_REDIRECT=http://localhost:3000/auth/google/callback
export SEMVEX_POST_LOGIN_REDIRECT=/search
export SEMVEX_LOGIN_ERROR_REDIRECT=/signin#error
```

In the Google Cloud console, add that redirect URI to your OAuth client's
**Authorized redirect URIs**. Google accounts rely on Google's own 2-step
verification, so Semvex grants them a session directly rather than layering its
own TOTP on top.

## Security notes (demo scope)

- Passwords hashed with PBKDF2-HMAC-SHA256; sessions are HMAC-signed, httponly cookies.
- TOTP is RFC-6238, ±1 step drift tolerance, Authenticator/Authy compatible; 2FA enrollment issues 8 one-time backup codes.
- Basic per-IP rate limiting on auth endpoints (`SEMVEX_AUTH_RATE_MAX` / `_WINDOW`).
- Set `SEMVEX_SECRET` in production so sessions survive restarts.

## Deferred (need live infra / models)

Two items from the roadmap need external services or heavy models to *verify*, so
they're scaffolded but not wired end-to-end:

- **Live Elasticsearch + Supabase/pgvector swap** — `docker-compose.yml` includes
  the ES service and the API reads `ELASTICSEARCH_URL`/`SUPABASE_*`, but the read
  paths still use the in-process indexes. Swapping them is the `docs/production.md`
  graduation step.
- **Multimodal (CLIP) image search** — needs a CLIP model + real product images;
  current thumbnails are emoji/gradient placeholders.

## Layout

```
app/
  main.py        FastAPI app: auth, 2FA, OAuth, search routes
  catalog.py     BM25 + embeddings + RRF hybrid
  security.py    password hashing, signed tokens, TOTP
  store.py       SQLite user store
  config.py      env-driven config
  static/        no-Node static SPA build of the UI
frontend/            Next.js + TypeScript app (primary UI)
  app/page.tsx       landing
  app/signin/        email+password / Google sign-in
  app/twofa/         2FA setup + verify
  app/search/        keyword / semantic / hybrid comparison
  lib/api.ts         typed client for the FastAPI service
data/products.json   sample catalog (electronics + shoes)
eval/evaluate.py     Recall@K / MRR / NDCG harness
docs/                original PRD / architecture / production specs
```
