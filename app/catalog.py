"""Retrieval layer — PostgreSQL-backed.

- Semantic search: pgvector cosine (`embedding <=> query`) — the PRD's design.
- Keyword search: Postgres full-text (`tsvector` / `ts_rank_cd`) as the in-DB BM25
  baseline (Elasticsearch is the documented alternative; see docs/production.md).
- Hybrid: fetch candidate pools from both and fuse (RRF or tunable α) in the app.
- Reranking (cross-encoder) and MMR diversity operate on candidate pools pulled
  from Postgres. Similar-products is a pgvector kNN on the stored embedding.

Query embeddings are computed at request time by the same `Embedder` used at
ingestion, so both live in the same vector space. With `sentence-transformers`
installed that's `bge-small-en-v1.5` (384-d); otherwise a deterministic,
fixed-dimension feature-hashing fallback keeps semantic search meaningful with
no model download.
"""
from __future__ import annotations

import difflib
import hashlib
import logging
import math
import re
from collections import defaultdict
from typing import Optional

import numpy as np

from . import config, db, search_es

log = logging.getLogger("semvex")

_WORD = re.compile(r"[a-z0-9]+")

_SYNONYMS = {
    "sneakers": ["shoes", "trainers"], "sneaker": ["shoes"],
    "trainers": ["shoes", "sneakers"], "kicks": ["shoes", "sneakers"],
    "footwear": ["shoes", "boots", "sandals"],
    "running": ["run", "marathon", "jog", "runner"], "jogging": ["running", "run"],
    "cheap": ["budget", "affordable", "inexpensive", "low", "value"],
    "budget": ["cheap", "affordable", "inexpensive", "value"],
    "affordable": ["cheap", "budget"],
    "laptop": ["notebook", "ultrabook", "chromebook", "probook"], "notebook": ["laptop"],
    "computer": ["laptop", "notebook"],
    "headphones": ["earphones", "earbuds", "headset"],
    "earphones": ["headphones", "earbuds"], "earbuds": ["headphones", "earphones"],
    "headset": ["headphones"],
    "workout": ["gym", "fitness", "exercise", "training", "sport"],
    "gym": ["workout", "fitness", "training"], "fitness": ["workout", "gym", "activity"],
    "waterproof": ["water", "sweatproof", "rain"],
    "kids": ["children", "child", "youth"], "children": ["kids", "child"],
    "warm": ["winter", "insulated", "cold"], "winter": ["warm", "snow", "insulated"],
    "camera": ["mirrorless", "photography", "photo"], "photography": ["camera", "photo"],
    "smartwatch": ["watch", "wearable", "tracker"], "watch": ["smartwatch", "wearable"],
    "wireless": ["bluetooth", "cordless"], "bluetooth": ["wireless"],
    "gaming": ["gamer", "esports", "game"],
    "office": ["work", "business", "productivity"], "work": ["office", "business"],
    "formal": ["dress", "business"],
    "hiking": ["trail", "mountain", "outdoor", "trekking"], "trail": ["hiking", "outdoor"],
    "casual": ["everyday", "canvas"],
}

_PRODUCT_COLS = "sku, title, brand, category, price, description"


def _tokenize(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def doc_text(p: dict) -> str:
    return f"{p['title']} {p['brand']} {p['category']} {p['description']}"


def _expand(tokens: list[str]) -> list[str]:
    out = list(tokens)
    for t in tokens:
        out.extend(_SYNONYMS.get(t, []))
    return out


def _stable_hash(token: str) -> int:
    return int.from_bytes(hashlib.md5(token.encode()).digest()[:8], "big")


# --------------------------------------------------------------------------- #
# Embedder / Reranker — shared by ingestion and query time
# --------------------------------------------------------------------------- #
class Embedder:
    """Fixed-dimension embeddings (config.EMBED_DIM = 384 for bge-small).

    Provider is chosen by `SEMVEX_EMBEDDING_PROVIDER`:
      * local   — sentence-transformers `bge-small` in-process (best for bulk
                  ingestion; ~2 GB RAM with torch).
      * hf      — HuggingFace Inference API for `bge-small` (query-time on a
                  low-RAM VPS; no model resident, needs HF_API_TOKEN).
      * hashing — stateless signed feature-hashing (no model, lower quality).
      * auto    — local if importable, else hf if a token is set, else hashing.

    local and hf both run bge-small, so their 384-d vectors are interchangeable:
    embed the catalog locally once, serve live queries via HF, no mismatch."""

    def __init__(self):
        self.dim = config.EMBED_DIM
        self._model = None       # sentence-transformers model (local)
        self._hf_url = None      # HF Inference API endpoint (remote)
        self.mode = "hashing-fallback"

        provider = config.EMBEDDING_PROVIDER.lower()
        if provider in ("auto", "local") and self._init_local():
            return
        if provider == "local":
            return  # explicit local but unavailable → hashing fallback
        if provider in ("auto", "hf") and self._init_hf():
            return
        # provider == "hashing", or nothing else was available.

    def _init_local(self) -> bool:
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            self._model = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
            self.dim = self._model.get_sentence_embedding_dimension()
            self.mode = f"local:{config.EMBEDDING_MODEL_NAME}"
            return True
        except Exception:
            self._model = None
            return False

    def _init_hf(self) -> bool:
        if not config.HF_API_TOKEN:
            return False
        self._hf_url = config.HF_API_URL
        self.mode = f"hf:{config.HF_EMBEDDING_MODEL}"
        return True

    # -- fallbacks / remote ------------------------------------------------- #
    def _fallback_vec(self, text: str) -> list[float]:
        vec = np.zeros(self.dim, dtype=np.float32)
        for tok in _expand(_tokenize(text)):
            h = _stable_hash(tok)
            vec[h % self.dim] += 1.0 if (h >> 63) & 1 else -1.0
        norm = float(np.linalg.norm(vec)) or 1.0
        return (vec / norm).tolist()

    def _hf_encode(self, texts: list[str]) -> list[list[float]]:
        import json
        import time
        import urllib.error
        import urllib.request

        payload = json.dumps({"inputs": texts, "options": {"wait_for_model": True}}).encode()
        last_err: Exception | None = None
        for attempt in range(4):
            req = urllib.request.Request(
                self._hf_url,
                data=payload,
                headers={
                    "Authorization": f"Bearer {config.HF_API_TOKEN}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    return self._normalize_hf(json.loads(r.read()))
            except urllib.error.HTTPError as e:
                last_err = e
                if e.code == 503:  # model cold-loading — back off and retry
                    time.sleep(2 * (attempt + 1))
                    continue
                raise
            except Exception as e:  # noqa: BLE001 — transient network; retry
                last_err = e
                time.sleep(1.5 * (attempt + 1))
        # Never silently fall back to a different vector space — surface the error.
        raise RuntimeError(f"HF embedding request failed after retries: {last_err}")

    def _normalize_hf(self, data) -> list[list[float]]:
        arr = np.asarray(data, dtype=np.float32)
        if arr.ndim == 3:      # per-token embeddings → mean-pool to sentence vector
            arr = arr.mean(axis=1)
        if arr.ndim == 1:      # a single vector for a single input
            arr = arr[None, :]
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return [row.tolist() for row in (arr / norms)]

    # -- public ------------------------------------------------------------- #
    def encode(self, texts: list[str]) -> list[list[float]]:
        if self._model is not None:
            embs = self._model.encode(texts, normalize_embeddings=True)
            return [list(map(float, e)) for e in embs]
        if self._hf_url is not None:
            return self._hf_encode(texts)
        return [self._fallback_vec(t) for t in texts]

    def encode_one(self, text: str) -> list[float]:
        return self.encode([text])[0]


class Reranker:
    def __init__(self):
        self._model = None
        self.mode = "lexical-fallback"
        try:
            from sentence_transformers import CrossEncoder  # type: ignore

            self._model = CrossEncoder(config.RERANKER_MODEL_NAME)
            self.mode = f"cross-encoder:{config.RERANKER_MODEL_NAME}"
        except Exception:
            self._model = None

    def score(self, query: str, docs: list[str]) -> list[float]:
        if self._model is not None:
            return [float(s) for s in self._model.predict([(query, d) for d in docs])]
        q = set(_expand(_tokenize(query)))
        out = []
        for d in docs:
            dt = _tokenize(d)
            dset = set(dt)
            overlap = sum(1 for t in q if t in dset)
            out.append(overlap / (1 + math.log(1 + len(dt))))
        return out


# --------------------------------------------------------------------------- #
# Natural-language filter parsing
# --------------------------------------------------------------------------- #
_PRICE_UNDER = re.compile(r"(?:under|below|less than|cheaper than|<)\s*\$?\s*(\d+)")
_PRICE_OVER = re.compile(r"(?:over|above|more than|>)\s*\$?\s*(\d+)")


def parse_nl_filters(query: str) -> dict:
    filters: dict = {}
    residual = query
    m = _PRICE_UNDER.search(query)
    if m:
        filters["max_price"] = int(m.group(1))
        residual = _PRICE_UNDER.sub("", residual)
    m = _PRICE_OVER.search(query)
    if m:
        filters["min_price"] = int(m.group(1))
        residual = _PRICE_OVER.sub("", residual)
    return {"filters": filters, "residual": re.sub(r"\s+", " ", residual).strip()}


# --------------------------------------------------------------------------- #
# Postgres-backed catalog
# --------------------------------------------------------------------------- #
def _as_vec(v) -> np.ndarray:
    """Coerce a pgvector `Vector`, list, or ndarray to a float32 numpy array."""
    if hasattr(v, "to_numpy"):  # pgvector.Vector
        v = v.to_numpy()
    return np.asarray(v, dtype=np.float32)


class Catalog:
    def __init__(self):
        self.embedder = Embedder()
        self.reranker = Reranker()
        # Lightweight metadata loaded once for vocab (did-you-mean), autocomplete,
        # and counts. Retrieval itself always hits Postgres.
        with db.connection() as c:
            rows = c.execute(f"SELECT {_PRODUCT_COLS} FROM products").fetchall()
        self.products = [dict(r) for r in rows]
        self.by_sku = {p["sku"]: p for p in self.products}
        self._vocab = {t for p in self.products for t in _tokenize(doc_text(p))}
        self._suggestions = sorted(
            {p["title"] for p in self.products}
            | {p["brand"] for p in self.products}
            | {p["category"] for p in self.products}
        )

    @property
    def embed_mode(self) -> str:
        return self.embedder.mode

    @property
    def rerank_mode(self) -> str:
        return self.reranker.mode

    # -- filter WHERE builder ---------------------------------------------- #
    @staticmethod
    def _where(category, brand, min_price, max_price, extra_sql=""):
        clauses, params = [], []
        if category:
            clauses.append("category = %s")
            params.append(category)
        if brand:
            clauses.append("brand = %s")
            params.append(brand)
        if min_price is not None:
            clauses.append("price >= %s")
            params.append(min_price)
        if max_price is not None:
            clauses.append("price <= %s")
            params.append(max_price)
        if extra_sql:
            clauses.append(extra_sql)
        return (" WHERE " + " AND ".join(clauses)) if clauses else "", params

    def _row_to_result(self, row, score):
        return {
            "sku": row["sku"], "title": row["title"], "brand": row["brand"],
            "category": row["category"], "price": row["price"],
            "description": row["description"], "score": round(float(score), 4),
        }

    # -- candidate pools from Postgres ------------------------------------- #
    def _semantic_pool(self, query, n, filters, want_embedding=False):
        # numpy array (not a Python list) so pgvector/register_vector sends it as a
        # real `vector` — Postgres coerces a list on INSERT but not inside `<=>`.
        qv = np.asarray(self.embedder.encode_one(query), dtype=np.float32)
        where, params = self._where(*filters)
        emb_col = ", embedding" if want_embedding else ""
        sql = (
            f"SELECT {_PRODUCT_COLS}{emb_col}, 1 - (embedding <=> %s) AS score "
            f"FROM products{where} ORDER BY embedding <=> %s LIMIT %s"
        )
        with db.connection() as c:
            rows = c.execute(sql, [qv, *params, qv, n]).fetchall()
        return rows

    def _use_es(self) -> bool:
        engine = config.KEYWORD_ENGINE.lower()
        if engine == "tsvector":
            return False
        if engine == "elasticsearch":
            return True  # forced; a runtime failure still falls back to tsvector
        return search_es.available()  # "auto"

    @property
    def keyword_mode(self) -> str:
        return "elasticsearch" if self._use_es() else "tsvector"

    def _keyword_pool(self, query, n, filters, want_embedding=False):
        """BM25 keyword candidates. Uses Elasticsearch when enabled/reachable,
        otherwise Postgres full-text. ES is only the ranker — product rows are
        always read back from Postgres so vectors/data have a single source."""
        if self._use_es():
            try:
                return self._keyword_pool_es(query, n, filters, want_embedding)
            except Exception as exc:  # noqa: BLE001
                log.warning("elasticsearch keyword search failed, using tsvector: %s", exc)
        return self._keyword_pool_tsvector(query, n, filters, want_embedding)

    def _keyword_pool_es(self, query, n, filters, want_embedding):
        category, brand, min_price, max_price = filters
        hits = search_es.search(
            query, n, category=category, brand=brand, min_price=min_price, max_price=max_price
        )
        if not hits:
            return []
        skus = [h["sku"] for h in hits]
        score_by_sku = {h["sku"]: h["score"] for h in hits}
        emb_col = ", embedding" if want_embedding else ""
        with db.connection() as c:
            rows = c.execute(
                f"SELECT {_PRODUCT_COLS}{emb_col} FROM products WHERE sku = ANY(%s)", (skus,)
            ).fetchall()
        by_sku = {r["sku"]: r for r in rows}
        out = []
        for sku in skus:  # preserve ES (BM25) rank order
            r = by_sku.get(sku)
            if r is None:
                continue  # indexed in ES but absent from Postgres — skip
            r = dict(r)
            r["score"] = score_by_sku[sku]
            out.append(r)
        return out

    def _keyword_pool_tsvector(self, query, n, filters, want_embedding=False):
        where, params = self._where(*filters, extra_sql="search_tsv @@ plainto_tsquery('english', %s)")
        # the tsquery param goes where extra_sql sits (last clause); prepend rank param
        emb_col = ", embedding" if want_embedding else ""
        sql = (
            f"SELECT {_PRODUCT_COLS}{emb_col}, "
            f"ts_rank_cd(search_tsv, plainto_tsquery('english', %s)) AS score "
            f"FROM products{where} ORDER BY score DESC LIMIT %s"
        )
        with db.connection() as c:
            rows = c.execute(sql, [query, *params, query, n]).fetchall()
        return [r for r in rows if r["score"] > 0]

    # -- public search ------------------------------------------------------ #
    def search(self, mode, query, top_k=None, *, category=None, brand=None,
               min_price=None, max_price=None, alpha=None, diversity=False, rerank=False):
        top_k = top_k or config.DEFAULT_TOP_K
        if not query or not query.strip():
            return []
        filters = (category, brand, min_price, max_price)
        want_emb = diversity  # MMR needs vectors
        pool_n = max(top_k, config.RERANK_CANDIDATES) if (rerank or diversity) else top_k

        if mode == "keyword":
            rows = self._keyword_pool(query, pool_n, filters, want_emb)
            scored = [(r, r["score"]) for r in rows]
        elif mode == "semantic":
            rows = self._semantic_pool(query, pool_n, filters, want_emb)
            scored = [(r, r["score"]) for r in rows]
        elif mode == "hybrid":
            scored = self._hybrid(query, pool_n, filters, alpha, want_emb)
        else:
            raise ValueError(f"unknown search mode: {mode}")

        if rerank and scored:
            docs = [doc_text(r) for r, _ in scored]
            rr = self.reranker.score(query, docs)
            scored = sorted(zip((r for r, _ in scored), rr), key=lambda t: t[1], reverse=True)

        if diversity and scored:
            scored = self._mmr(scored, top_k)

        return [self._row_to_result(r, s) for r, s in scored[:top_k]]

    def _hybrid(self, query, n, filters, alpha, want_emb):
        sem = self._semantic_pool(query, n, filters, want_emb)
        kw = self._keyword_pool(query, n, filters, want_emb)
        rows_by_sku = {r["sku"]: r for r in sem}
        rows_by_sku.update({r["sku"]: r for r in kw})

        if alpha is not None:
            sem_s = {r["sku"]: float(r["score"]) for r in sem}
            kw_s = {r["sku"]: float(r["score"]) for r in kw}
            sn = _minmax(sem_s)
            kn = _minmax(kw_s)
            fused = {
                sku: alpha * sn.get(sku, 0.0) + (1 - alpha) * kn.get(sku, 0.0)
                for sku in rows_by_sku
            }
        else:  # Reciprocal Rank Fusion
            k = 60
            sem_rank = {r["sku"]: i for i, r in enumerate(sem)}
            kw_rank = {r["sku"]: i for i, r in enumerate(kw)}
            fused = {}
            for sku in rows_by_sku:
                s = 0.0
                if sku in sem_rank:
                    s += 1.0 / (k + sem_rank[sku] + 1)
                if sku in kw_rank:
                    s += 1.0 / (k + kw_rank[sku] + 1)
                fused[sku] = s
        ranked = sorted(rows_by_sku.values(), key=lambda r: fused[r["sku"]], reverse=True)
        return [(r, fused[r["sku"]]) for r in ranked]

    def _mmr(self, scored, top_k, lam=0.7):
        rel = {r["sku"]: float(s) for r, s in scored}
        vals = list(rel.values())
        lo, hi = (min(vals), max(vals)) if vals else (0.0, 0.0)
        rel_norm = {k: (v - lo) / (hi - lo) if hi > lo else 0.0 for k, v in rel.items()}
        emb = {r["sku"]: _as_vec(r["embedding"]) for r, _ in scored}
        rows = {r["sku"]: r for r, _ in scored}
        candidates = list(rows.keys())
        selected: list[str] = []
        while candidates and len(selected) < top_k:
            best, best_score = None, -1e9
            for sku in candidates:
                max_sim = max((float(emb[sku] @ emb[j]) for j in selected), default=0.0)
                score = lam * rel_norm[sku] - (1 - lam) * max_sim
                if score > best_score:
                    best, best_score = sku, score
            selected.append(best)  # type: ignore
            candidates.remove(best)  # type: ignore
        return [(rows[sku], rel[sku]) for sku in selected]

    # -- auxiliary ---------------------------------------------------------- #
    def did_you_mean(self, query: str) -> Optional[str]:
        changed, out = False, []
        for tok in _tokenize(query):
            if tok in self._vocab or len(tok) <= 3 or tok.isdigit():
                out.append(tok)
                continue
            match = difflib.get_close_matches(tok, self._vocab, n=1, cutoff=0.8)
            if match:
                out.append(match[0])
                changed = True
            else:
                out.append(tok)
        return " ".join(out) if changed else None

    def suggest(self, prefix: str, limit: int = 6) -> list[str]:
        p = prefix.strip().lower()
        if not p:
            return []
        starts = [s for s in self._suggestions if s.lower().startswith(p)]
        contains = [s for s in self._suggestions if p in s.lower() and s not in starts]
        return (starts + contains)[:limit]

    def similar(self, sku: str, top_k: int = 6) -> list[dict]:
        sql = (
            f"SELECT {_PRODUCT_COLS}, 1 - (embedding <=> "
            "(SELECT embedding FROM products WHERE sku = %s)) AS score "
            "FROM products WHERE sku <> %s "
            "ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku = %s) LIMIT %s"
        )
        with db.connection() as c:
            rows = c.execute(sql, [sku, sku, sku, top_k]).fetchall()
        return [self._row_to_result(r, r["score"]) for r in rows]

    def facets(self) -> dict:
        with db.connection() as c:
            cats = c.execute(
                "SELECT category AS value, COUNT(*) AS count FROM products "
                "GROUP BY category ORDER BY count DESC"
            ).fetchall()
            brands = c.execute(
                "SELECT brand AS value, COUNT(*) AS count FROM products "
                "GROUP BY brand ORDER BY count DESC"
            ).fetchall()
            pr = c.execute("SELECT MIN(price) AS min, MAX(price) AS max FROM products").fetchone()
        return {
            "categories": [dict(r) for r in cats],
            "brands": [dict(r) for r in brands],
            "price": {"min": pr["min"], "max": pr["max"]},
        }

    def browse(self, category=None, brand=None, min_price=None, max_price=None,
               sort="relevance", limit=40) -> list[dict]:
        where, params = self._where(category, brand, min_price, max_price)
        order = {"price_asc": "price ASC", "price_desc": "price DESC"}.get(sort, "title ASC")
        sql = f"SELECT {_PRODUCT_COLS} FROM products{where} ORDER BY {order} LIMIT %s"
        with db.connection() as c:
            rows = c.execute(sql, [*params, limit]).fetchall()
        return [self._row_to_result(r, 0.0) for r in rows]


def _minmax(scores: dict) -> dict:
    if not scores:
        return {}
    vals = list(scores.values())
    lo, hi = min(vals), max(vals)
    if hi <= lo:
        return {k: 0.0 for k in scores}
    return {k: (v - lo) / (hi - lo) for k, v in scores.items()}


_catalog: Optional[Catalog] = None


def get_catalog() -> Catalog:
    global _catalog
    if _catalog is None:
        _catalog = Catalog()
    return _catalog
