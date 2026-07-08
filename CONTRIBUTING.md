# Contributing to Semvex

Thanks for your interest in Semvex — a semantic product-search engine that
compares keyword (BM25), dense-vector, and hybrid retrieval side by side.
Contributions of all kinds are welcome: bug reports, docs, tests, and features.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** — open an issue with steps to reproduce (use the bug template).
- **Suggest a feature** — open an issue describing the use case first, so we can
  agree on scope before you build.
- **Improve docs** — README, `docs/`, code comments; small PRs are great.
- **Send code** — pick an open issue (or file one), then open a PR.

## Project layout

```
app/            FastAPI backend — retrieval, auth, ingestion, eval endpoints
  catalog.py    keyword / semantic / hybrid ranking, Embedder, Reranker
  ingest.py     catalog seed + shared batch upsert
  ingest_esci.py streaming Amazon ESCI ingestion
  search_es.py  optional Elasticsearch BM25 engine
frontend/       Next.js (App Router) UI
docs/           architecture, production, features, PRD, build steps
eval/           offline NDCG / Recall / MRR harness
tests/          pytest suite (auth, 2FA, search intelligence)
```

See `docs/architecture.md` for the full design.

## Local development

Prerequisites: Python 3.12+, Node 18+, Docker (for local Postgres/ES), and a
`.env` (copy from `.env.example`; `DATABASE_URL` + `SEMVEX_SECRET` are required).

```bash
# Backend
./run.sh                       # venv + deps + uvicorn on :8000

# Frontend
cd frontend && npm install
SEMVEX_POST_LOGIN_REDIRECT=/search npm run dev   # Next.js on :3000
```

Or run the whole stack with Docker:

```bash
docker compose up --build      # postgres :5433, api :8000, frontend :3000, es :9200
```

Real dense embeddings (bge-small) need the ingest extras — otherwise the app
uses a deterministic hashing fallback:

```bash
pip install -r requirements-ingest.txt
# ingest runs best with thread caps so torch doesn't oversubscribe:
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 python -m app.ingest_esci --source ...products.parquet --limit 25000
```

## Tests

Tests run against Postgres (never your `DATABASE_URL`/production DB):

```bash
pip install -r requirements-dev.txt
export SEMVEX_TEST_DATABASE_URL=postgresql://semvex:semvex@localhost:5433/semvex
python -m pytest -q
```

For the frontend, please make sure it type-checks and builds:

```bash
cd frontend && npx tsc --noEmit && npm run build
```

## Pull request guidelines

- Branch from `main`; keep PRs focused and reasonably small.
- Match the surrounding code style — the backend is plain FastAPI + psycopg3;
  the frontend is TypeScript + Tailwind. No new heavy dependencies without
  discussion.
- Add or update tests for behavior changes, and update docs when relevant.
- Ensure `pytest` passes and the frontend type-checks/builds before requesting review.
- Write a clear PR description: what changed, why, and how you verified it.

## Reporting security issues

Please **do not** open a public issue for security problems. See
[SECURITY.md](SECURITY.md) for private disclosure.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
