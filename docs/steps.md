# Build Plan (2-3 Week MVP)

## Week 1 — Data + Core Pipeline

**Day 1-2: Dataset decision + setup**
- Pull Amazon Product Metadata + ESCI, check query volume per category
- Pick the category subset (needs real synonym/intent variance — don't pick something narrow)
- Set up Supabase project (pgvector extension enabled)
- Set up local Elasticsearch container, confirm it runs on target Coolify host resources

**Day 3-4: Ingestion pipeline v1**
- Cleaning script: normalize product metadata fields, filter ESCI to chosen category
- Embedding batch job: generate embeddings with `bge-small-en-v1.5` for the product subset
- Write products + embeddings to Postgres

**Day 5-7: Elasticsearch indexing + keyword search**
- Define ES mapping (text fields analyzed, category/brand as keyword)
- Bulk-index the same product subset into ES
- Build and test a basic keyword search query (multi-match across title/description/brand)

**Milestone:** both indexes populated from the same source data, basic keyword search returns sane results manually tested.

## Week 2 — Ranking Service + Frontend

**Day 8-9: FastAPI service**
- `/search/keyword` — query Elasticsearch, return ranked results
- `/search/semantic` — embed query, run pgvector cosine similarity search, return ranked results
- `/health` endpoint

**Day 10-11: Hybrid ranking**
- Implement reciprocal rank fusion (or simple weighted score merge) combining keyword + semantic results
- `/search/hybrid` endpoint

**Day 12-14: Frontend**
- Next.js search UI: input, results list, mode toggle (keyword/semantic/hybrid)
- Wire up to FastAPI service
- Display relevance scores per result

**Milestone:** end-to-end search working locally across all three modes, visible in the UI.

## Week 3 — Evaluation + Deployment + Polish

**Day 15-16: Evaluation harness**
- Run ESCI query set against keyword, semantic, and hybrid search paths
- Compute Recall@K, MRR, NDCG for each
- Produce a comparison report (table + short writeup — this is the core proof point)

**Day 17-18: Deployment**
- Dockerize frontend + API
- Deploy to Coolify: frontend, API, Elasticsearch containers
- Confirm Supabase connection from deployed API
- Smoke test the live demo end-to-end

**Day 19-21: Polish + writeup**
- Fix any rough edges in the UI
- Write README: architecture summary, how to run locally, evaluation results
- Prepare the portfolio narrative: what was built, why, and the actual numbers proving semantic search wins

**Milestone:** deployed, working demo + evaluation report + README ready to link from portfolio.

## Notes

- If the timeline slips, the evaluation harness and comparison report are the least negotiable part — that's the actual proof point of the whole project. Cut UI polish before cutting that.
- Elasticsearch container sizing should be checked in Week 1, not discovered as a problem in Week 3 during deployment.
