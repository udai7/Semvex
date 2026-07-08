# Semvex — Semantic Product Search

A working, auth-gated demo of **semantic vs. keyword vs. hybrid** product search,
built from the specs in [`docs/`](./docs). Keyword search matches strings; Semvex
also matches *intent* — so "sports sneakers" finds running shoes and "cheap gaming
laptop" understands budget and specs.

It keeps the documented three-tier shape — **Next.js + TypeScript frontend /
FastAPI ranking service / data layer** — backed by **PostgreSQL + pgvector** as
the single source of truth (users, analytics, products, embeddings). Keyword
search runs on **Elasticsearch (BM25)** when configured, and transparently falls
back to Postgres full-text (`tsvector`) when it isn't.

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
- Email + password signup with **email verification** (6-digit code over Gmail SMTP)
- **TOTP 2-step verification** and one-time **backup codes**
- Real **Google OAuth 2.0** (when configured)
- **Favorites**, **recently viewed**, **saved searches**
- **Rate limiting** on auth endpoints

**Discovery & admin**
- Product detail pages with **"similar products" (vector kNN)**
- **Admin analytics** dashboard: top queries, zero-result queries, latency and CTR by mode
- Placeholder product thumbnails (emoji + deterministic gradient)

See [`docs/FEATURES.md`](./docs/FEATURES.md) for the full list mapped to endpoints and files.

## Quick start

**0. Configure + data layer.** Copy `.env.example` to `.env` and set at least
`DATABASE_URL` (managed Postgres like [Neon](https://neon.tech), or a local
`pgvector/pgvector:pg16` container) and `SEMVEX_SECRET`. The pgvector extension
is created automatically on first connect.

```bash
cp .env.example .env          # then edit DATABASE_URL + SEMVEX_SECRET
# local Postgres option:
docker run -d --name semvex-pg -p 5433:5432 \
  -e POSTGRES_USER=semvex -e POSTGRES_PASSWORD=semvex -e POSTGRES_DB=semvex \
  pgvector/pgvector:pg16
```

The 40-product sample catalog is auto-seeded on first boot. To load the real
**Amazon ESCI** catalog at scale, see [Ingesting ESCI](#ingesting-the-amazon-esci-catalog).

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
   - **Create account** — first/last name, phone, email, password (+ confirm) and
     agreeing to terms. A **6-digit code is emailed** (Gmail SMTP) to verify the
     address, then **2-step verification** (TOTP): scan a QR into Google
     Authenticator / Authy and confirm a code before getting a session. Returning
     users enter their password then the code from their app.
   - **Google OAuth** (real authorization-code flow; enabled when configured — see below).
3. **Search app** — query box + example chips + a mode toggle. **Compare** mode shows
   keyword / semantic / hybrid results side by side with relevance scores.

## Architecture (as built)

```
Next.js frontend (:3000)  ──▶  FastAPI service (:8000)  ──┬─▶ Elasticsearch BM25   (or Postgres tsvector fallback)
  landing / auth / 2FA         /auth/*  /search/*          ├─▶ pgvector cosine       (Postgres — semantic)
  search comparison UI     (proxied same-origin via Next)  └─▶ RRF hybrid fusion (in-app)
```

Mapping to the design docs:

| Doc component            | In this build |
|--------------------------|---------------|
| Ranking service (FastAPI)| `app/main.py`, `app/catalog.py` — same `/search/{keyword,semantic,hybrid}` contract |
| Semantic (pgvector)      | Postgres pgvector cosine (`embedding <=> query`) over stored embeddings |
| Keyword (Elasticsearch)  | Elasticsearch BM25 (`app/search_es.py`), Postgres `tsvector` fallback |
| Hybrid ranking           | Reciprocal Rank Fusion (+ tunable α), fused in-app |
| Data / storage           | `app/db.py`, `app/store.py` — Postgres is the single source of truth |
| Ingestion                | `app/ingest.py` (sample), `app/ingest_esci.py` (Amazon ESCI at scale) |
| Evaluation harness       | `eval/evaluate.py` — Recall@K / MRR / NDCG |
| Frontend (Next.js + TS)  | `frontend/` — app-router: landing, `/signin`, `/verify-email`, `/twofa`, `/search` |
| Frontend (no-Node option)| static SPA in `app/static/`, served by the backend at `:8000` |

### Embeddings

Semvex uses `BAAI/bge-small-en-v1.5` (384-d) for dense-vector semantic search.
`SEMVEX_EMBEDDING_PROVIDER` picks how vectors are produced:

| Provider | How | When |
|----------|-----|------|
| `local`  | `sentence-transformers` in-process (~2 GB RAM) | Bulk ingestion; single-box dev |
| `hf`     | HuggingFace Inference API (needs `HF_API_TOKEN`, ~0 model RAM) | Low-RAM VPS serving live queries |
| `hashing`| stateless signed feature-hashing (no model) | No-dependency fallback |
| `auto`   | local → hf → hashing, first available | default |

`local` and `hf` both run bge-small, so their 384-d vectors are interchangeable:
**embed the catalog once locally, then serve live queries via HF** so no model
sits in VPS RAM. The `/health` badge shows the active mode.

### Elasticsearch (optional keyword engine)

Set `ELASTICSEARCH_URL` to serve the BM25 keyword baseline from Elasticsearch;
leave it blank to use Postgres `tsvector`. ES is a **pure ranker** — it returns
ranked SKUs and product rows/vectors are always read back from Postgres, so
there's one source of truth. If ES is configured but unreachable at query time,
the app logs a warning and falls back to `tsvector`. `SEMVEX_KEYWORD_ENGINE`
(`auto|elasticsearch|tsvector`) forces the choice.

### Ingesting the Amazon ESCI catalog

To move past the 40-product sample, load the **Amazon Shopping Queries (ESCI)**
dataset — real Amazon products with relevance labels.

```bash
pip install -r requirements-ingest.txt      # pyarrow + sentence-transformers
# download shopping_queries_dataset_products.parquet from amazon-science/esci-data
python -m app.ingest_esci --source /path/to/...products.parquet --limit 50000
```

The pipeline streams the Parquet in record batches (handles 50k–1M+ rows without
loading it all into memory), normalizes each row, batch-embeds with the same
model the API queries with, and upserts into pgvector **and** indexes into
Elasticsearch (when configured). It's idempotent and resumable (`--offset`).
ESCI has no price/category, so those are synthesized (deterministic price, coarse
keyword category) — swappable in `app/ingest_esci.py`.

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
# tests run against Postgres — point at a throwaway DB (defaults to :5433):
export SEMVEX_TEST_DATABASE_URL=postgresql://semvex:semvex@localhost:5433/semvex
python -m pytest -q          # auth/2FA/backup-codes/email-verify + search intelligence
```

The two "semantic beats keyword" quality tests are skipped unless real dense
embeddings are available (they can't hold under the hashing fallback). GitHub
Actions (`.github/workflows/ci.yml`) spins up a `pgvector` service and runs the
pytest suite, the eval harness, and the Next.js build on every push/PR.

## Docker

```bash
docker compose up --build     # postgres :5433, api :8000, frontend :3000, elasticsearch :9200
```

The compose stack runs Postgres+pgvector, the API, the frontend, and
Elasticsearch. On a small VPS you can drop the `elasticsearch` service (keyword
→ tsvector) and/or set `DATABASE_URL` to managed Postgres (e.g. Neon) instead of
the bundled `postgres` service.

## Email verification (Gmail SMTP)

Signup emails a 6-digit code. Configure Gmail SMTP with an
[App Password](https://myaccount.google.com/apppasswords) (needs 2FA on the
Google account):

```bash
# backend env / .env
SMTP_USER=you@gmail.com
SMTP_APP_PASSWORD=your-16-char-app-password
SMTP_FROM=Semvex <you@gmail.com>
```

If `SMTP_APP_PASSWORD` is blank, sending is disabled and the code is logged to
the server console instead — so the flow still works locally.

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

- **Multimodal (CLIP) image search** — needs a CLIP model + real product images;
  current thumbnails are emoji/gradient placeholders.

## Layout

```
app/
  main.py        FastAPI app: auth, email-verify, 2FA, OAuth, search routes
  catalog.py     embeddings (local/HF/hashing) + pgvector + ES/tsvector + RRF hybrid
  search_es.py   Elasticsearch BM25 keyword engine (optional)
  db.py          Postgres pool + schema (pgvector auto-bootstrap)
  store.py       Postgres data access (users, accounts, analytics)
  ingest.py      sample-catalog ingestion
  ingest_esci.py streaming Amazon ESCI ingestion (pg + es)
  email.py       Gmail SMTP sender (signup verification)
  security.py    password hashing, signed tokens, TOTP, verification codes
  config.py      env-driven config
  static/        no-Node static SPA build of the UI
frontend/            Next.js + TypeScript app (primary UI)
  app/page.tsx       landing
  app/signin/        create account / email+password / Google sign-in
  app/verify-email/  6-digit email verification
  app/twofa/         2FA setup + verify
  app/search/        keyword / semantic / hybrid comparison
  lib/api.ts         typed client for the FastAPI service
data/products.json   sample catalog (electronics + shoes)
eval/evaluate.py     Recall@K / MRR / NDCG harness
docs/                original PRD / architecture / production specs
```

## Deploying

For link previews and correct absolute OpenGraph/Twitter image URLs, set the
frontend env var `NEXT_PUBLIC_SITE_URL` to your deployed origin (e.g.
`https://your-domain.com`). See `docs/production.md` for the full deploy guide.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to set
up the project, run the tests, and open a pull request. Please also read our
[Code of Conduct](CODE_OF_CONDUCT.md). Found a security issue? See
[SECURITY.md](SECURITY.md) for private disclosure.

## License

Semvex is open source under the [MIT License](LICENSE) © 2026 Udai Das
(Archilect Studio).

