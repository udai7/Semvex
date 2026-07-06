# Architecture

## 1. System Diagram

```
┌──────────────────────┐
│  Next.js (TS)         │
│  Search UI            │
│  - query input         │
│  - results (keyword /  │
│    semantic / hybrid)  │
└──────────┬────────────┘
           │ HTTP (JSON)
           ▼
┌──────────────────────────────────────┐
│  FastAPI Service (Python)             │
│  - /search/keyword                    │
│  - /search/semantic                   │
│  - /search/hybrid                     │
│  - embeds query at request time       │
│  - merges/re-ranks for hybrid mode    │
└───────┬───────────────────┬──────────┘
        │                   │
        ▼                   ▼
┌───────────────────┐  ┌─────────────────────┐
│ Elasticsearch      │  │ Supabase Postgres    │
│ - BM25 keyword      │  │ + pgvector           │
│   search over        │  │ - product embeddings │
│   product index       │  │ - product metadata   │
└───────────────────┘  └─────────────────────┘
        ▲                   ▲
        └─────────┬─────────┘
                   │
        ┌──────────────────────┐
        │ Ingestion Pipeline     │
        │ (Python, offline)      │
        │ - clean Amazon Product │
        │   Metadata + ESCI      │
        │ - generate embeddings  │
        │   (bge-small-en-v1.5)  │
        │ - write to Postgres    │
        │ - index into ES        │
        └──────────────────────┘
```

Postgres is the source of truth for product data. Elasticsearch is rebuilt from Postgres, not maintained independently — this avoids sync drift.

## 2. Components

### 2.1 Frontend (Next.js + TypeScript)
- Search bar + results list
- Mode toggle: Keyword / Semantic / Hybrid (so the comparison is visible to anyone using the demo)
- Displays relevance score per result (useful for portfolio credibility — shows you're not hiding the ranking mechanics)
- Calls FastAPI service directly (no business logic in Next.js API routes beyond thin proxying if needed for CORS/env reasons)

### 2.2 Ranking/Search Service (FastAPI, Python)
Endpoints:

| Endpoint | Description |
|---|---|
| `GET /search/keyword?q=` | Query Elasticsearch, return BM25-ranked results |
| `GET /search/semantic?q=` | Embed query with `bge-small-en-v1.5`, run pgvector similarity search, return ranked results |
| `GET /search/hybrid?q=` | Run both, merge/re-rank (e.g. weighted score combination or reciprocal rank fusion) |
| `GET /health` | Basic health check for Coolify/monitoring |

Responsibilities:
- Query-time embedding generation (small model, CPU inference is fine at this scale)
- Elasticsearch query construction (multi-match across title/description/brand/category)
- pgvector similarity query (cosine distance, top-K)
- Hybrid re-ranking logic (start simple: reciprocal rank fusion; document it clearly since it's the most "designed" part of the system)

### 2.3 Data Layer

**Supabase Postgres**
- `products` table: sku, title, description, category, brand, attributes (jsonb), embedding (vector column via pgvector)
- Index: IVFFlat or HNSW on the embedding column (benchmark both at chosen scale)

**Elasticsearch**
- Single index, one document per product
- Mapping: title/description as `text` (analyzed, English analyzer), category/brand as `keyword` (exact filter), attributes as nested/object
- Single-node, small heap — this is a demo, not a cluster

### 2.4 Ingestion Pipeline (Python, offline/batch)
1. Load Amazon Product Metadata subset (chosen category)
2. Load Amazon ESCI, filter to matching products/queries
3. Clean/normalize text fields
4. Generate embeddings in batches (`bge-small-en-v1.5`)
5. Write products + embeddings to Postgres
6. Bulk-index same products into Elasticsearch
7. Idempotent: re-running the pipeline rebuilds both indexes from the same cleaned dataset

### 2.5 Evaluation Harness (Python, offline)
- Runs both search paths against the ESCI query set
- Computes Recall@K, MRR, NDCG per method
- Outputs a comparison table/report (this is the actual proof point for the portfolio piece — treat it as a first-class deliverable, not an afterthought)

## 3. Data Flow

**Ingestion time (offline, once):**
Raw data → clean → embed → write to Postgres → index into ES

**Query time (online, per request):**
User query → FastAPI → embed query (semantic path) + raw query (keyword path) → Postgres/pgvector + Elasticsearch in parallel → merge (if hybrid) → return ranked results → render in Next.js

## 4. Why This Split (FastAPI separate from Next.js)

Keeping ranking logic in a dedicated Python service means:
- The same embedding/ranking code path is reusable by both the live API and the offline evaluation harness — no logic duplication between "demo" and "proof"
- Next.js stays a thin presentation layer
- Clean story for a portfolio walkthrough: "frontend / ranking service / data layer" is a legible three-tier architecture
