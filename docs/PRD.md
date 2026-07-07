# PRD: Semantic Product Search Engine

**Project owner:** Udai Das / Archilect Studio
**Type:** Portfolio/product demo
**Status:** Draft v1

---

## 1. Overview

**Problem:** Keyword-based product search fails on synonyms, colloquial phrasing, and intent-based queries. "Running shoes" doesn't match "sports sneakers." "Budget gaming laptop" requires understanding specs, not string matching. This causes poor relevance, search abandonment, and lost conversions.

**Solution:** A dense vector embedding-based semantic search engine, benchmarked head-to-head against traditional keyword search, on a real product catalog with real query relevance labels.

**Purpose:** Working, deployed portfolio piece demonstrating production-shaped system design — not a research paper, not a notebook exercise.

---

## 2. Goals

- Deployed, working semantic search demo over a real product catalog
- Quantitative proof semantic retrieval beats keyword retrieval (Recall@K, MRR, NDCG)
- Clean architecture: separate concerns (frontend / ranking service / data layer) in a way that reads well in an interview or portfolio walkthrough
- Reusable pattern — this becomes a reference architecture for future Archilect client work needing search

## 3. Non-Goals

- No embedding fine-tuning (pretrained models only)
- No full-catalog scale (subset only, 50k–200k products)
- No auth, multi-tenancy, or production traffic handling
- No real-time product catalog updates (static ingestion for demo)

---

## 4. Datasets

| Dataset | Role | Scope |
|---|---|---|
| Amazon Product Metadata | Product catalog — titles, descriptions, categories, brands, attributes | 1–2 categories, 50k–200k products |
| Amazon ESCI | Query benchmark — real queries + Exact/Substitute/Complement/Irrelevant labels | Filtered to match chosen category subset |

**Category selection (Week 1 decision):** Pick a category with meaningful synonym/intent variance in ESCI query volume (e.g. Electronics, Shoes) — not something narrow enough that keyword and semantic search converge on the same results.

---

## 5. Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | Ingest and clean Amazon Product Metadata subset into Postgres |
| FR2 | Generate embeddings (title + description + brand + category) for every product using a pretrained sentence-transformer |
| FR3 | Store embeddings in Postgres (Neon) via `pgvector` |
| FR4 | Search API exposes: keyword-only results (Elasticsearch), semantic-only results (pgvector), and hybrid results for a given query |
| FR5 | Frontend search UI: query box, results list, and a toggle/side-by-side view comparing keyword vs semantic results |
| FR6 | Evaluation harness computes Recall@K, MRR, NDCG for both retrieval methods against ESCI relevance labels and outputs a comparison report |
| FR7 | Query embedding computed at request time; product embeddings precomputed once at ingestion |
| FR8 | Ingestion pipeline indexes the same product subset into Elasticsearch (BM25) alongside Postgres/pgvector, keeping both in sync from one source of truth |

## 6. Non-Functional Requirements

- Self-hosted deployment via Docker + Coolify
- Search API response time target: < 500ms p95 for a single query (small-scale demo, no strict SLA)
- Reproducible ingestion pipeline (re-runnable from raw dataset to populated DB)
- Codebase structured so evaluation results are regenerable, not hardcoded into the demo

---

## 7. Architecture

See `docs/architecture.md` for full detail. Summary:

```
                                                    ┌──▶  Postgres (Neon) + pgvector (semantic)
Next.js (TS) frontend  ──▶  FastAPI service (Python)┤
                              - embed query          └──▶  Elasticsearch (keyword / BM25)
                              - vector search
                              - keyword search (ES)
                              - hybrid rank
```

Offline: Python ingestion pipeline cleans ESCI + product metadata, batch-generates embeddings, loads into Postgres/pgvector (Neon) AND indexes the same product subset into Elasticsearch — one source of truth, two read paths.

---

## 8. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript |
| Ranking/API service | FastAPI (Python), separate from Next.js |
| Embedding model | `bge-small-en-v1.5` (pretrained, no fine-tuning) |
| Vector storage | Postgres (Neon) + `pgvector` |
| Keyword baseline | Elasticsearch (BM25) |
| Ingestion | Python (pandas, batch embedding jobs) |
| Evaluation | Python — Recall@K, MRR, NDCG against ESCI labels |
| Deployment | Docker + Coolify (self-hosted) |

---

## 9. Success Criteria

- Semantic (and hybrid) retrieval shows measurable NDCG/Recall/MRR improvement over keyword baseline on the ESCI subset
- Deployed, publicly accessible demo with working search UI
- Evaluation report (numbers + short writeup) presentable as portfolio evidence
- Clean repo with README suitable for a portfolio/interview link

## 10. Milestones

See `docs/steps.md` for the full week-by-week plan (2–3 week MVP timeline).

## 11. Risks

| Risk | Mitigation |
|---|---|
| ESCI category subset doesn't have enough query volume for stable metrics | Pick category during Week 1 based on actual ESCI query counts, not assumption |
| Off-the-shelf embeddings underperform on product-specific vocabulary | Compare 2 candidate models (MiniLM vs bge-small) early, pick better one before committing |
| pgvector query latency at 200k rows without tuning | Add an IVFFlat/HNSW index; benchmark before assuming it's fine |
| Scope creep toward fine-tuning or larger catalog | Explicitly out of scope per this PRD — revisit only after MVP ships |
| Elasticsearch resource footprint on Coolify host (JVM heap, RAM) | Size the ES container appropriately for 50k-200k docs (single node, small heap, no cluster); test on target host early in Week 1 |
| Postgres and Elasticsearch drifting out of sync | Ingestion pipeline treats Postgres as source of truth; ES index is rebuilt from Postgres, not hand-maintained separately |

## 12. Out of Scope (explicit)

- Embedding fine-tuning
- Full Amazon catalog ingestion
- User accounts, personalization, click-through feedback loops
- A/B testing infrastructure
- Multi-language support
