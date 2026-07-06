# Production / Deployment

## 1. Deployment Target

Self-hosted via Docker + Coolify, matching existing Archilect infra pattern.

## 2. Services

| Service | Container | Notes |
|---|---|---|
| Frontend | Next.js (TS) | Standard Next.js Docker build, served behind Coolify's proxy |
| Ranking API | FastAPI (Python) | Exposes `/search/keyword`, `/search/semantic`, `/search/hybrid`, `/health` |
| Elasticsearch | Single-node ES container | Small heap size (e.g. `-Xms512m -Xmx512m` to start); no cluster needed at 50k-200k docs |
| Database | Supabase (managed Postgres + pgvector) | Not self-hosted — use Supabase directly rather than running Postgres in Coolify, since Supabase gives pgvector + dashboard for free |

Note: only Elasticsearch, FastAPI, and Next.js run on the Coolify host. Postgres/pgvector lives on Supabase (managed), which is simpler than self-hosting a fourth container and matches how you've handled Postgres in other Archilect projects.

## 3. docker-compose (shape, not final)

```yaml
services:
  frontend:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=${API_URL}
    ports:
      - "3000:3000"

  api:
    build: ./api
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_SERVICE_KEY}
      - ELASTICSEARCH_URL=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    ports:
      - "8000:8000"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.x
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

Adjust ES version/heap once real container resource limits on the Coolify host are known — this is a starting point, not a benchmarked config.

## 4. Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL` | API | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | API | Service-role key for pgvector writes/reads (ingestion + query) |
| `ELASTICSEARCH_URL` | API | Internal Docker network URL to ES container |
| `NEXT_PUBLIC_API_URL` | Frontend | Public URL of the FastAPI service |
| `EMBEDDING_MODEL_NAME` | API + ingestion pipeline | `BAAI/bge-small-en-v1.5` (keep configurable, not hardcoded, in case of a later swap) |

## 5. Ingestion / Indexing Runbook

Ingestion is offline/batch, run manually or via a one-off script — not a scheduled job for this demo.

1. Run cleaning script against raw Amazon Product Metadata + ESCI subset
2. Run embedding batch job (writes to Postgres via Supabase client)
3. Run ES bulk-index script (reads from Postgres, writes to Elasticsearch)
4. Verify counts match between Postgres and ES (sanity check — same product count in both)
5. Run evaluation harness to confirm Recall@K/MRR/NDCG numbers before considering ingestion "done"

Re-running steps 1-3 should be idempotent — safe to blow away and rebuild both indexes from the cleaned dataset.

## 6. Health Checks / Monitoring

- `/health` endpoint on FastAPI checks: Postgres reachable, Elasticsearch reachable, returns 200/503 accordingly
- Coolify's built-in health check config points at `/health`
- No dedicated logging/metrics stack for this demo scope — stdout logs are sufficient; can revisit if this becomes a template for a client project later

## 7. Known Constraints for This Deployment

- Single-node Elasticsearch — no HA, no cluster. Acceptable for a demo; explicitly not production-grade for real traffic
- No backup strategy for the ES index (it's rebuildable from Postgres at any time, so this is by design, not an oversight)
- No rate limiting / auth on the search API — fine for a portfolio demo, would need to be added before any real client use
