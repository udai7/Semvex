# Architecture

System design for Semvex **as built**. PostgreSQL + pgvector is the single
source of truth; Elasticsearch is an optional BM25 ranker (with a Postgres
`tsvector` fallback); query embeddings come from a local model, the HuggingFace
Inference API, or a hashing fallback.

## 1. System Design

### 1.1 Component architecture

```mermaid
flowchart TB
  subgraph client["Client"]
    B["Browser (SPA)"]
  end

  subgraph edge["Next.js · :3000"]
    N["App Router pages<br/>landing · signin · verify-email · twofa<br/>search · product · account · admin"]
    RW["Same-origin rewrites<br/>/auth /search /me /admin /eval /config"]
  end

  subgraph svc["FastAPI ranking service · :8000"]
    AUTH["Auth / 2FA / email-verify / OAuth"]
    SRCH["Search + compare routes"]
    CAT["Catalog engine<br/>pools · RRF+α · rerank · MMR"]
    EMB["Embedder<br/>local | hf | hashing"]
    RER["Reranker<br/>cross-encoder | lexical"]
  end

  subgraph data["Data plane"]
    PG[("PostgreSQL + pgvector<br/>Neon — source of truth")]
    ES[("Elasticsearch<br/>BM25 keyword index")]
  end

  subgraph ext["External services"]
    HF["HF Inference API<br/>bge-small"]
    SMTP["Gmail SMTP"]
    GOO["Google OAuth 2.0"]
  end

  B --> N --> RW --> AUTH
  RW --> SRCH --> CAT
  CAT --> EMB
  CAT --> RER
  CAT -->|"semantic: pgvector cosine kNN"| PG
  CAT -->|"keyword: BM25"| ES
  CAT -.->|"fallback when ES down/off"| PG
  EMB -.->|"provider = hf"| HF
  AUTH -->|"users, sessions, codes"| PG
  AUTH -->|"verification code"| SMTP
  AUTH -.->|"authorization code flow"| GOO
```

### 1.2 Query-time search flow

```mermaid
flowchart TD
  Q["GET /search keyword / semantic / hybrid or /compare"] --> G{"authenticated?"}
  G -- no --> E401["401"]
  G -- yes --> NL["parse NL price filters<br/>(residual query + min/max)"]
  NL --> M{"mode"}

  M -- keyword --> KWE
  M -- hybrid --> KWE
  M -- semantic --> SEMB
  M -- hybrid --> SEMB

  subgraph KW["keyword pool"]
    KWE{"ES enabled and reachable?"}
    KWE -- yes --> ESQ["ES multi_match BM25<br/>title^3 brand^2 category^2 desc"]
    ESQ --> PGF["fetch product rows from PG by sku<br/>(preserve BM25 order)"]
    KWE -- no --> TSV["Postgres tsvector<br/>ts_rank_cd"]
  end

  subgraph SEM["semantic pool"]
    SEMB["embed query → vector"] --> KNN["pgvector cosine kNN<br/>ORDER BY distance"]
  end

  PGF --> FUSE
  TSV --> FUSE
  KNN --> FUSE
  FUSE["fuse pools<br/>RRF (default) + tunable α"] --> RR{"rerank?"}
  RR -- yes --> CE["cross-encoder or lexical overlap"]
  RR -- no --> DV
  CE --> DV{"diversity?"}
  DV -- yes --> MMR["MMR (λ) de-dup"]
  DV -- no --> TOPK["top-k"]
  MMR --> TOPK
  TOPK --> LOG["log query (latency, n_results)"]
  LOG --> RESP["results + scores + did-you-mean + live metrics"]
```

### 1.3 Ingestion pipeline (offline, streaming)

```mermaid
flowchart LR
  SRC[("ESCI products.parquet<br/>~1.8M rows")] --> IT["pyarrow iter_batches<br/>(low memory)"]
  IT --> FL["filter locale<br/>apply --offset / --limit"]
  FL --> NM["normalize<br/>strip HTML · synth price · heuristic category"]
  NM --> BUF["batch buffer (N)"]
  BUF --> ENC["Embedder.encode(batch)<br/>bge-small (local) / HF"]
  ENC --> UPG["upsert → Postgres<br/>vector + weighted tsvector"]
  ENC --> BLK["bulk index → Elasticsearch"]
  UPG --> RF
  BLK --> RF["ES refresh"]
  RF --> DN["done · idempotent · resumable"]
```

### 1.4 Signup → verification → 2FA (auth sequence)

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Next.js
  participant API as FastAPI
  participant DB as Postgres
  participant M as Gmail SMTP

  U->>FE: Create account (name, phone, email, pw+confirm, agree)
  FE->>API: POST /auth/signup
  API->>DB: insert unverified user
  API->>DB: store 6-digit code (hashed, 10-min TTL)
  API->>M: email verification code
  API-->>FE: next=verify_email + preauth(verify)

  U->>FE: enter 6-digit code
  FE->>API: POST /auth/verify-email
  API->>DB: check code (attempts, expiry) → mark verified
  API-->>FE: next=totp_setup + preauth(setup)

  FE->>API: POST /auth/totp/provision
  API-->>FE: otpauth QR + secret
  U->>FE: scan + enter TOTP
  FE->>API: POST /auth/totp/enable
  API->>DB: store secret + 8 backup codes
  API-->>FE: Set-Cookie session (httponly) + backup codes
```

### 1.5 Data model (Postgres)

```mermaid
erDiagram
  users ||--o{ backup_codes : "has (FK)"
  users ||--o{ email_codes : "pending code"
  users ||--o{ favorites : "email"
  users ||--o{ recently_viewed : "email"
  users ||--o{ saved_searches : "email"
  users ||--o{ feedback : "email"
  products ||--o{ favorites : "sku"

  users {
    text email PK
    text password_hash
    text provider
    text first_name
    text last_name
    text phone
    bool email_verified
    text totp_secret
    bool totp_enabled
  }
  products {
    text sku PK
    text title
    text brand
    text category
    int price
    text description
    vector embedding "pgvector(384), HNSW"
    tsvector search_tsv "GIN"
  }
  email_codes {
    text email PK
    text code_hash
    timestamptz expires_at
    int attempts
  }
  backup_codes {
    text email FK
    text code_hash
    bool used
  }
```

### 1.6 Deployment topology

```mermaid
flowchart TB
  U["Recruiter / Browser"]

  subgraph vps["Self-hosted VPS (~4 GB)"]
    FE["Next.js"]
    API["FastAPI (uvicorn)"]
    ES[("Elasticsearch<br/>single node, small heap")]
  end

  subgraph mgd["Managed / external (off-VPS)"]
    NEON[("Neon<br/>Postgres + pgvector")]
    HF["HF Inference API"]
    SMTP["Gmail SMTP"]
  end

  U --> FE --> API
  API --> NEON
  API --> ES
  API -.->|"provider=hf query embeddings"| HF
  API -.->|"signup codes"| SMTP
```

> Keyword search is rebuilt from Postgres into Elasticsearch, never maintained
> independently — Postgres stays the source of truth, so there's no sync drift.

## 2. Components

### 2.1 Frontend (Next.js + TypeScript, `frontend/`)
- App-router pages: landing, `/signin` (create account), `/verify-email`, `/twofa`, `/search`, `/product/[sku]`, `/account`, `/admin`.
- Mode toggle (Keyword / Semantic / Hybrid) + **Compare** view showing all three side by side with relevance scores; tunable α slider; filters; live metrics; feedback.
- Rewrites in `next.config.mjs` proxy `/auth/*`, `/search/*`, `/me/*`, `/admin/*`, `/eval/*`, `/config`, `/health` to FastAPI so the browser is single-origin and the session cookie stays same-origin.

### 2.2 Ranking / search service (FastAPI, `app/`)

| Area | Endpoints |
|---|---|
| Search | `GET /search/{keyword,semantic,hybrid}`, `/search/compare` (`?alpha=&rerank=&diversity=&category=&brand=&min_price=&max_price=`) |
| Auth | `/auth/signup`, `/auth/login`, `/auth/verify-email` (+ `/resend`), `/auth/totp/{provision,enable,verify}`, `/auth/google/{start,callback}`, `/auth/logout`, `/auth/me` |
| Discovery | `/suggest`, `/product/{sku}`, `/facets`, `/browse` |
| Account | `/me/{favorites,recently-viewed,saved-searches}` |
| Signals | `/feedback`, `/click` |
| Admin / eval / meta | `/admin/analytics`, `/eval/{labels,live}`, `/health`, `/config` |

Responsibilities: query-time embedding (`app/catalog.py::Embedder`), keyword pool via ES or `tsvector`, pgvector cosine kNN, RRF+α hybrid fusion, cross-encoder/lexical rerank, MMR diversity, NL price parsing, did-you-mean, autocomplete.

### 2.3 Data layer

**PostgreSQL + pgvector** (`app/db.py`) — the single source of truth. Managed via Neon (`DATABASE_URL`); the extension is auto-created on first connect. Tables: `users`, `backup_codes`, `email_codes`, `favorites`, `recently_viewed`, `saved_searches`, `feedback`, `query_log`, `click_log`, and `products` (`embedding vector(384)` HNSW + `search_tsv` GIN).

**Elasticsearch** (`app/search_es.py`) — optional BM25 keyword engine. English analyzer on text fields; `keyword` sub-fields on brand/category for exact filters; a pure ranker returning SKUs+scores (rows are read back from Postgres). Falls back to `tsvector` when unreachable. Pin `elasticsearch>=8,<9` to match an ES 8.x server.

### 2.4 Embeddings (`app/catalog.py::Embedder`)
`SEMVEX_EMBEDDING_PROVIDER = auto|local|hf|hashing`. `local` = sentence-transformers bge-small (bulk ingestion); `hf` = HF Inference API (low-RAM serving); `hashing` = stateless fallback. local and hf are both bge-small (384-d) and interchangeable — embed the catalog locally once, serve live queries via HF.

### 2.5 Ingestion (`app/ingest.py`, `app/ingest_esci.py`)
Sample seed on first boot; the ESCI pipeline streams the products parquet in pyarrow record batches, normalizes, batch-embeds, and writes pgvector + Elasticsearch. Idempotent (upsert by SKU), resumable (`--offset`).

### 2.6 Evaluation harness (`eval/evaluate.py`)
Runs the labeled query set through all three paths and reports Recall@K / MRR / NDCG@K — the portfolio proof point. The same labels power the live NDCG overlay in the search UI.

## 3. Data flow

**Ingestion (offline):** ESCI parquet → clean/normalize → embed (batched) → upsert Postgres (vector + tsvector) → bulk-index Elasticsearch → refresh.

**Query (online):** user query → Next.js proxy → FastAPI → (embed query for semantic) + (BM25 keyword via ES or tsvector) → pgvector kNN + keyword pool → RRF+α fuse → optional rerank → optional MMR → top-k → log → render.

## 4. Why FastAPI is separate from Next.js
- The same embedding/ranking code path serves the live API **and** the offline eval harness — no duplication between "demo" and "proof".
- Next.js stays a thin presentation layer (proxy + UI).
- Legible three-tier story for a walkthrough: frontend / ranking service / data layer.
