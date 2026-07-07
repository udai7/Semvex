# Production / Deployment

## 1. Deployment Target

Self-hosted via Docker + Coolify, matching existing Archilect infra pattern.

## 2. Services

| Service | Container | Notes |
|---|---|---|
| Frontend | Next.js (TS) | Standard Next.js Docker build, served behind Coolify's proxy |
| Ranking API | FastAPI (Python) | Exposes `/search/keyword`, `/search/semantic`, `/search/hybrid`, `/health` |
| Elasticsearch | Single-node ES container | Small heap size (e.g. `-Xms512m -Xmx512m` to start); no cluster needed at 50k-200k docs |
| Database | **Neon** (managed Postgres + pgvector) | Not self-hosted — set `DATABASE_URL` to the Neon connection string. (Original PRD said Supabase; the build is provider-agnostic and uses Neon.) |

Note: only Elasticsearch, FastAPI, and Next.js run on the host. Postgres/pgvector
is managed (Neon), so there's no fourth container to operate. See the
authoritative `docker-compose.yml` at the repo root — the snippet below is the
original shape and is kept only for reference.

## 3. docker-compose (reference shape — see repo root for the real one)

```yaml
services:
  frontend:
    build: ./frontend
    environment:
      - SEMVEX_API_URL=http://api:8000
    ports:
      - "3000:3000"

  api:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}          # Neon (or bundled pgvector service)
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - SEMVEX_EMBEDDING_PROVIDER=${SEMVEX_EMBEDDING_PROVIDER:-hf}
      - HF_API_TOKEN=${HF_API_TOKEN:-}
    depends_on:
      - elasticsearch
    ports:
      - "8000:8000"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    volumes:
      - es_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

volumes:
  es_data:
```

The real compose at the repo root also runs a `pgvector/pgvector:pg16` service
for a fully-local option (set `DATABASE_URL` to Neon to skip it).

> **As-built note:** the managed Postgres provider is **Neon** (not Supabase) —
> set `DATABASE_URL` directly. See `.env.example` for the complete, authoritative
> list; the table below is the deployment-relevant subset.

## 4. Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | API + ingestion | **Required.** Managed Postgres+pgvector (Neon), or a self-hosted `pgvector` container. Extension auto-created on first connect. |
| `SEMVEX_SECRET` | API | **Required.** Signs session cookies (keep stable across restarts). |
| `ELASTICSEARCH_URL` | API + ingestion | ES BM25 engine. Blank → Postgres `tsvector` fallback. |
| `ELASTICSEARCH_API_KEY` | API + ingestion | Only for secured/managed ES clusters. |
| `SEMVEX_KEYWORD_ENGINE` | API | `auto`\|`elasticsearch`\|`tsvector`. |
| `SEMVEX_EMBEDDING_PROVIDER` | API + ingestion | `auto`\|`local`\|`hf`\|`hashing`. VPS pattern: `hf` for the server. |
| `HF_API_TOKEN` | API + ingestion | HuggingFace Inference API token when provider = `hf`. |
| `EMBEDDING_MODEL_NAME` | API + ingestion | `BAAI/bge-small-en-v1.5` (384-d; ingest + query MUST match). |
| `SMTP_USER` / `SMTP_APP_PASSWORD` / `SMTP_FROM` | API | Gmail SMTP for signup verification codes. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `SEMVEX_OAUTH_REDIRECT` | API | Optional Google OAuth. |
| `SEMVEX_API_URL` | Frontend | Internal URL of the FastAPI service (Next proxy target). |

### VPS sizing (self-hosted for a demo)

RAM is the constraint, not traffic. The two heavy tenants are Elasticsearch
(~1.5–2 GB) and, if used, a local embedding model (~1.5–2 GB with torch).

| Stack | Approx. RAM | Notes |
|---|---|---|
| Neon + ES + HF query embeddings | **~3 GB → 4 GB VPS** | No model on the box; embed the catalog locally once. |
| Neon + ES + local bge-small | **~5 GB → 8 GB VPS** | Best semantic quality, model resident. |
| Neon + tsvector (no ES) + HF | **~1–1.5 GB → 2 GB VPS** | Cheapest; drops the ES story. |

Keep Postgres on Neon (off the VPS). Ingestion is a one-time CPU spike; steady
state is idle.

## 5. Ingestion / Indexing Runbook

Ingestion is offline/batch (`app/ingest_esci.py`), streaming and idempotent.

```bash
pip install -r requirements-ingest.txt   # pyarrow + sentence-transformers
# download shopping_queries_dataset_products.parquet (amazon-science/esci-data)
python -m app.ingest_esci --source .../products.parquet --limit 50000
```

1. Download the ESCI products parquet once.
2. `python -m app.ingest_esci …` — streams batches, embeds (bge-small), upserts
   pgvector **and** bulk-indexes Elasticsearch (when `ELASTICSEARCH_URL` set).
3. `--target pg|es|both` and `--offset N` to resume; re-runs are idempotent
   (upsert by SKU) — safe to rebuild either index from the source.
4. `python -m eval.evaluate` to confirm Recall@K/MRR/NDCG before calling it done.

## 6. Health Checks / Monitoring

- `/health` endpoint on FastAPI checks: Postgres reachable, Elasticsearch reachable, returns 200/503 accordingly
- Coolify's built-in health check config points at `/health`
- No dedicated logging/metrics stack for this demo scope — stdout logs are sufficient; can revisit if this becomes a template for a client project later

## 7. Known Constraints for This Deployment

- Single-node Elasticsearch — no HA, no cluster. Acceptable for a demo; explicitly not production-grade for real traffic
- No backup strategy for the ES index (it's rebuildable from Postgres at any time, so this is by design, not an oversight)
- No rate limiting / auth on the search API — fine for a portfolio demo, would need to be added before any real client use
