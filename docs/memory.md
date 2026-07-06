# Project Memory

Purpose of this file: persistent context for whoever (or whatever agent) picks up this project across sessions, so decisions don't get re-litigated or lost. Update this file whenever a real decision is made or reversed.

## Project Identity

- **Name:** Semantic Product Search Engine
- **Owner:** Udai Das, Archilect Studio
- **Type:** Portfolio/product demo (not a client deliverable, not an academic paper)
- **Timeline:** 2-3 weeks, MVP-focused

## Core Decisions Made (with rationale)

| Decision | Choice | Rationale |
|---|---|---|
| Project purpose | Portfolio piece for Archilect | Needs a working demo; research rigor is secondary to a credible, deployable system |
| Build shape | Full production-shaped pipeline | Not offline-only — needs ingestion, vector DB, API, ranking service, live demo |
| Embedding strategy | Pretrained, off-the-shelf (`bge-small-en-v1.5`) | No fine-tuning — time constraint, and pretrained is defensible for a demo |
| Vector storage | pgvector on Supabase | Already in the stack; avoids standing up a dedicated vector DB (Qdrant considered, rejected for simplicity) |
| Keyword baseline | Elasticsearch (BM25) | Originally planned as Postgres `tsvector`, upgraded to Elasticsearch — stronger, more realistic keyword baseline, better portfolio narrative ("beat a real production search engine, not a strawman") |
| Dataset scale | 50k-200k products, 1-2 categories | Full Amazon catalog (millions of SKUs) explicitly rejected — too slow to build/index for a 2-3 week timeline |
| Backend structure | Separate FastAPI (Python) service | Next.js API routes considered, rejected — FastAPI keeps embedding/ranking logic reusable between the live API and the offline evaluation harness |
| Frontend | Next.js + TypeScript | Default stack, fast to build |
| Deployment | Docker + Coolify (self-hosted) | Matches existing Archilect infra pattern |

## Things Explicitly Out of Scope (don't re-add without a real reason)

- Embedding fine-tuning
- Full-catalog ingestion (millions of products)
- Auth, multi-tenancy, personalization
- A/B testing infrastructure
- Multi-language support
- Real-time catalog updates (ingestion is batch/offline)

## Open Questions / Not Yet Decided

- Exact product category for the demo (Week 1 decision — needs ESCI query volume check first)
- Hybrid ranking method specifics (starting point: reciprocal rank fusion, may need tuning)
- pgvector index type: IVFFlat vs HNSW (needs benchmarking at chosen scale)
- Elasticsearch container sizing on the Coolify host (needs early testing, flagged as a risk)

## Reference Docs in This Project

- `PRD.md` — product requirements, goals, scope, success criteria
- `docs/architecture.md` — system design, components, data flow, API contracts
- `docs/production.md` — deployment, Docker/Coolify setup, env vars, ops
- `docs/steps.md` — week-by-week build plan

## How to Use This File

If you're an AI agent or a future-you picking this project back up: read this file first. It tells you what's already been decided and why, so you don't waste time re-proposing Qdrant, tsvector, or fine-tuning. If a past decision needs to change, update the table above and note the reason — don't just silently overwrite it.
