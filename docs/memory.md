# Project Memory

Purpose of this file: persistent context for whoever (or whatever agent) picks up this project across sessions, so decisions don't get re-litigated or lost. Update this file whenever a real decision is made or reversed.

## Project Identity

- **Name:** Semvex — Semantic Product Search Engine
- **Owner:** Udai Das, Archilect Studio
- **Type:** Portfolio/product demo (not a client deliverable, not an academic paper)
- **Timeline:** 2-3 weeks, MVP-focused

---

## ✅ STATUS (as of 2026-07-07) — Postgres migration DONE + ES/HF/email added

The SQLite→**PostgreSQL + pgvector** migration is complete and the app runs
against Postgres (the owner uses **Neon** as the managed `DATABASE_URL`). On top
of the migration, this session added: **Elasticsearch BM25** keyword engine,
**HuggingFace Inference API** embeddings, **signup email verification** (Gmail
SMTP), and a **streaming Amazon ESCI** ingestion pipeline.

### Data layer (Postgres, done)
- `.env`/`.env.example` env-driven; `DATABASE_URL` + `SEMVEX_SECRET` REQUIRED (app raises if missing). `.env` git-ignored.
- `app/db.py`: psycopg3 `ConnectionPool`, `register_vector` per conn, full schema (users, backup_codes, favorites, recently_viewed, saved_searches, feedback, query_log, click_log, products `vector(384)` + `tsvector`, **email_codes**), HNSW+GIN+btree. **Auto-creates the pgvector extension on first connect** (`_configure` catches the missing-type error, runs `CREATE EXTENSION`, retries) — no manual bootstrap on a fresh Neon/CI DB.
- `app/store.py`: Postgres data access. `create_user` extended with first/last/phone; `email_codes` helpers; `upsert_oauth_user` marks verified. (Fixed real port bug: `store_backup_codes` used `Connection.executemany`, which psycopg3 lacks → now uses a cursor.)
- `app/catalog.py`: semantic = pgvector `embedding <=> query`; keyword = ES **or** `tsvector`; hybrid = in-app RRF + α; MMR/rerank on pooled candidates; `similar()` = pgvector kNN. (Fixed two real bugs: query vector must be a **numpy array** so pgvector sends a real `vector` in `<=>` — a Python list only coerces on INSERT; and pgvector `Vector` rows need `_as_vec()` before numpy math in MMR.)
- `app/ingest.py`: sample-catalog seed; `ensure_ingested()` auto-seeds on first boot. `upsert_batch()` shared with ESCI.

### New this session
- **Elasticsearch** (`app/search_es.py`): optional BM25 engine. Pure ranker — returns SKUs+scores, product rows/vectors read back from Postgres. `available()` (cached ping), `ensure_index`, `bulk_index`, `search`, `refresh`. Catalog picks ES when `SEMVEX_KEYWORD_ENGINE` allows and ES is reachable, else `tsvector`; runtime ES failure falls back with a warning. **Pin `elasticsearch>=8,<9`** — the 9.x client sends a `compatible-with=9` header the 8.13 server rejects (400).
- **HF embeddings** (`Embedder` in `catalog.py`): provider `auto|local|hf|hashing`. `local` = sentence-transformers; `hf` = HF Inference API (`HF_API_TOKEN`, retries, no silent fallback to a different vector space); `hashing` = stateless. local & hf are both bge-small (384-d) → interchangeable: embed catalog locally, serve queries via HF (no model RAM on VPS).
- **Email verification** (`app/email.py`, main.py): signup now collects first/last/phone/email/password+confirm/agree, creates an **unverified** user, emails a 6-digit code (Gmail SMTP; logged to console if `SMTP_APP_PASSWORD` blank). `/auth/verify-email` (+ `/resend`) → then existing TOTP setup. Login of an unverified account routes back to verify. Frontend: expanded `signin` form + new `verify-email` page.
- **ESCI ingestion** (`app/ingest_esci.py`): streams the ESCI products parquet via pyarrow record batches (50k–1M+ rows, low memory), normalizes (synth price + heuristic category, HTML-stripped desc), batch-embeds, upserts pgvector + bulk-indexes ES. Idempotent, resumable (`--offset`). `requirements-ingest.txt` = pyarrow + sentence-transformers.
- **Infra**: `docker-compose.yml` now has a `pgvector/pgvector:pg16` postgres service + wires ES/HF/SMTP env into `api`. CI adds a `pgvector` service + `SEMVEX_TEST_DATABASE_URL` + a seed step before eval.
- **Tests**: `tests/conftest.py` ported to Postgres (uses `SEMVEX_TEST_DATABASE_URL`, defaults to local :5433 container, never touches `DATABASE_URL`/Neon; session-seeds products, truncates mutable tables per test). `register_and_login` updated for the new signup+verify flow. Added email-verification + unverified-login tests. Two "semantic beats keyword" tests are `skipif` hashing-fallback. **Suite: 17 passed, 2 skipped.**

### 📋 TODO — what still needs doing (ordered)

**Blocking / verify next**
1. **Live-test the HF `hf` embedding provider.** Implemented defensively but never run against a real endpoint. Add `HF_API_TOKEN` + `SEMVEX_EMBEDDING_PROVIDER=hf`, run one search, and confirm `_normalize_hf` handles the actual response shape (2-D vectors vs 3-D token embeddings). This gates the whole "no model on the VPS" plan.
2. **Run a real ESCI ingest at scale.** Download `shopping_queries_dataset_products.parquet` (amazon-science/esci-data), `pip install -r requirements-ingest.txt`, then `python -m app.ingest_esci --source … --limit 50000`. Confirm PG count == ES count and spot-check semantic vs keyword. Only tested on a 7-row synthetic parquet so far.
3. **Set `SEMVEX_EMBED_DIM` correctly if the HF model dim ≠ 384.** bge-small = 384 (matches schema). If a different HF model is chosen, the pgvector column + `EMBED_DIM` must change and the catalog must be re-ingested (vector-space + dimension must match).

**Product / UX**
4. **Frontend engine + provider surfacing.** Add a keyword-engine toggle (ES ↔ tsvector) and/or show `keyword_engine` + `embed_mode` from `/health` in the UI, so recruiters can see the BM25-vs-tsvector and semantic-vs-hashing story live.
5. **Re-embed the demo catalog with real bge-small** once ingestion runs locally, so the 2 skipped "semantic beats keyword" tests actually pass and the live demo shows real semantic wins (currently hashing-fallback on Neon).

**Infra / prod**
6. **VPS deploy**: 4 GB box, `docker compose up` (drop the `postgres` service, point `DATABASE_URL` at Neon), self-host ES, `SEMVEX_EMBEDDING_PROVIDER=hf`. Add HTTPS origins/redirects for Google OAuth in prod.
7. **Add `SMTP_APP_PASSWORD`** to prod `.env` for real verification emails (currently logs code to console when blank).
8. **CI does not start Elasticsearch** — keyword tests run on the tsvector fallback there. Add an ES service to CI only if we want the ES path covered in CI.

**Cleanup / lower priority**
9. **`docs/FEATURES.md` has some stale code refs** from the pre-Postgres build (e.g. `_passes`, `suggest`, `_keyword_scores`) — mostly corrected, but audit the remaining rows against current `catalog.py`.
10. **ESCI price/category are synthesized** (ESCI lacks both) — deterministic price + keyword-heuristic category in `ingest_esci.py`. Fine for the demo; swap for a real taxonomy if wanted.
11. **`@app.on_event("startup")` is deprecated** (FastAPI) — migrate to a lifespan handler to silence the warning.
12. **Multimodal (CLIP) image search** — still deferred (needs a CLIP model + real images).

### 🎨 UI redesign (IN PROGRESS — first attempt rejected)

Goal: overhaul `frontend/` to match **infisical.com**'s aesthetic. Tailwind is now set up (3.4.17 + shadcn-style utils + lucide + geist installed). **My first pass (light AMBER, rounded corners, scattered grid, Geist font) was rejected — "far from how their website looks."**

**Real Infisical tokens (verified from their codebase + live HTML):**
- Marketing site = **LIGHT**: bg `#ffffff` / page `#f7f7f7`, text `#000`, muted `rgba(38,38,38,0.32)`, border `#dcdcdc`, accent **lime `#e0ed34`**, font **Inter**. Primary button = black bg / white text / sharp, `active:scale-[0.97]`.
- App (dark) confirms brand: `--color-primary:#e0ed34` (lime, 50–900 scale), `--color-yellow:#f1c40f`, Inter.

**Must fix to match:** lime `#e0ed34` (not amber); **SHARP corners** (radius 0 buttons); **full-bleed hairlines that pass through component borders** (framed grid: vertical lines down page edges, full-width section dividers, `+` marks at intersections) — NOT scattered grid squares; **Inter** font (not Geist).

**Files to redo:** `frontend/{tailwind.config.ts, app/globals.css, app/layout.tsx, app/page.tsx, components/ui/button.tsx, components/site-header.tsx, components/site-footer.tsx}`. Then repoint legacy inner-page CSS vars and reskin inner pages. Full detail in agent memory `ui-redesign-infisical`.

### Environment facts
- Owner runs **Neon** as `DATABASE_URL`. Local **`semvex-pg`** container (`pgvector/pgvector:pg16`, :5433) is used for **tests** and was used for ES-path verification. Local **`semvex-es`** container (`elasticsearch:8.13.0`, :9200, 512m heap, security off) used to verify BM25.
- Tests need the local pgvector container up (or `SEMVEX_TEST_DATABASE_URL` set); they never use Neon.
- `sentence-transformers` NOT installed in `.venv` → embeddings run **hashing-fallback**. Install `requirements-ingest.txt` for real bge-small.
- VPS sizing guidance given to owner: Neon (off-VPS) + ES self-hosted (~2 GB) + HF query embeddings (≈0 model RAM) → **4 GB VPS** comfortable; 8 GB if running bge-small locally on the box.
- **Do NOT kill `next-server` processes** that aren't ours — the owner has separate Next projects on this machine.

---

## Implementation Status — v2 features (built & tested on SQLite, now being ported)

Full-stack build, verified end-to-end before the Postgres migration:
- **Search intelligence:** keyword (BM25→now tsvector) / semantic (pgvector) / hybrid (RRF + tunable α slider), cross-encoder reranking (fallback), MMR diversity, NL price filters, did-you-mean, autocomplete, similar-products kNN, facets/browse.
- **Auth:** email+password (PBKDF2), TOTP 2FA + one-time backup codes, Google OAuth (gated), per-IP rate limiting.
- **Accounts/analytics:** favorites, recently viewed, saved searches, relevance feedback, click tracking, admin analytics dashboard, live NDCG/Recall/MRR overlay for labeled queries.
- **Frontend:** Next.js + TS app-router (`frontend/`) — landing, /signin, /twofa (+backup codes), /search (slider, toggles, filters, live metrics, feedback), /product/[sku] (+similar), /account, /admin. Proxies API same-origin via `next.config.mjs` (note: `/product` API is proxied at `/api/product/:sku` to avoid clashing with the page route). Static SPA fallback in `app/static/`.
- **Eval/tests/CI/Docker:** `eval/evaluate.py`, 15 pytest tests, GitHub Actions, Dockerfiles + compose. Feature→endpoint→file map in `docs/FEATURES.md`.

## Core Decisions Made (with rationale)

| Decision | Choice | Rationale |
|---|---|---|
| Project purpose | Portfolio piece for Archilect | Working demo; research rigor secondary to a credible, deployable system |
| Embedding strategy | Pretrained `bge-small-en-v1.5` (384-d), with a **fixed-dim md5 feature-hashing fallback** | No fine-tuning. Fallback runs with no model download AND keeps a stable pgvector dimension; stateless so ingest/query vectors match |
| Reranker | `bge-reranker-base` cross-encoder (optional), lexical fallback | Two-stage retrieval signal; degrades gracefully |
| Vector storage | **pgvector on Postgres (now implemented)** | The PRD's design; demo runs it for real via a dockerized pgvector DB (Qdrant rejected) |
| Keyword baseline | **Postgres full-text `tsvector`/`ts_rank_cd` (now implemented)** | Keeps everything in one real DB; Elasticsearch remains the documented heavier alternative |
| Hybrid ranking | RRF default + **tunable α** exposed as a UI slider | RRF sane default; α slider makes the tradeoff interactive |
| Config | **All env-driven via `.env` + python-dotenv; `DATABASE_URL`/`SEMVEX_SECRET` required** | Production 12-factor; no secrets/DB hardcoded |
| Dataset scale | 50k-200k target; **40-product sample (electronics+shoes) in the demo** | Curated to make semantic-vs-keyword differences visible; swap `data/products.json` + `eval/LABELS` for ESCI |
| Backend structure | Separate FastAPI (Python) service | Ranking logic reusable between live API and offline eval |
| Frontend | Next.js + TypeScript (app router) | Matches PRD stack; static SPA kept as no-Node fallback |
| **Auth (reversal)** | **Added: email+password, TOTP 2FA + backup codes, Google OAuth** | Owner requested despite PRD "out of scope"; layered in front of search, ranking core unchanged |
| Deployment | Docker + Coolify (self-hosted) | Matches Archilect infra pattern |

## Things Explicitly Out of Scope (don't re-add without a real reason)

- Embedding fine-tuning
- Full-catalog ingestion (millions of products)
- Multi-tenancy
- A/B testing infrastructure
- Multi-language support
- Real-time catalog updates (ingestion is batch/offline)
- ~~Auth, personalization~~ — **now in scope** (owner request)

## Deferred (scaffolded, not wired end-to-end)

- **Multimodal (CLIP) image search** — needs a CLIP model + real images; thumbnails are emoji/gradient placeholders.

(Elasticsearch is now wired — `app/search_es.py`, BM25 with `tsvector` fallback.)

## Open Questions / Not Yet Decided

- Real ESCI product category for a proper benchmark (demo uses curated electronics+shoes)
- pgvector index tuning: HNSW params vs IVFFlat at real scale (HNSW is in the schema now)
- Whether to keep Postgres tsvector or graduate to Elasticsearch for keyword
- Default α value / per-query auto-tuning of hybrid weighting

## Reference Docs in This Project

- `PRD.md` — product requirements, goals, scope, success criteria
- `docs/architecture.md` — system design, components, data flow, API contracts
- `docs/production.md` — deployment, Docker/Coolify setup, env vars, ops
- `docs/steps.md` — week-by-week build plan
- `docs/FEATURES.md` — every implemented feature mapped to endpoint + file
- `.env.example` — every supported config var, documented
- `README.md` — how to run, features, tests, Docker

## How to Use This File

If you're an AI agent or a future-you picking this project back up: read this file first, then the "⏸ PAUSED — RESUME HERE" block. It tells you exactly what's half-done in the Postgres migration and the ordered next steps. Don't re-propose Qdrant, tsvector→ES, or fine-tuning without reading the decisions table.
