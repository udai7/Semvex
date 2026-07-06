"""Product catalog + retrieval: keyword, semantic, hybrid — plus reranking,
diversity (MMR), natural-language filters, spell correction, autocomplete, and
similar-product kNN.

Mirrors the documented ranking service. In production the read paths would hit
Elasticsearch (BM25) and Supabase/pgvector (dense vectors); here they run
in-process over a sample catalog so the demo boots with no external services.

Embeddings use `sentence-transformers` (BAAI/bge-small-en-v1.5) when installed;
otherwise a lexical + synonym-expansion fallback keeps semantic search
meaningfully different from keyword search. A cross-encoder reranker
(BAAI/bge-reranker-base) is used for two-stage retrieval when available, with a
lexical-overlap fallback.
"""
from __future__ import annotations

import difflib
import json
import math
import re
from collections import Counter, defaultdict
from typing import Optional

from . import config

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


def _tokenize(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def _doc_text(p: dict) -> str:
    return f"{p['title']} {p['brand']} {p['category']} {p['description']}"


def _minmax(scores: list[float]) -> list[float]:
    lo, hi = (min(scores), max(scores)) if scores else (0.0, 0.0)
    if hi <= lo:
        return [0.0] * len(scores)
    return [(s - lo) / (hi - lo) for s in scores]


# --------------------------------------------------------------------------- #
# Embedder / Reranker
# --------------------------------------------------------------------------- #
class Embedder:
    def __init__(self, corpus: list[str]):
        self.mode = "fallback"
        self._model = None
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            self._model = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
            self.mode = f"dense:{config.EMBEDDING_MODEL_NAME}"
        except Exception:
            self._model = None
        if self._model is None:
            self._build_fallback(corpus)

    def _build_fallback(self, corpus: list[str]) -> None:
        df: Counter = Counter()
        for text in corpus:
            for tok in set(self._expand(_tokenize(text))):
                df[tok] += 1
        self._vocab = {tok: i for i, tok in enumerate(df)}
        n = max(len(corpus), 1)
        self._idf = {t: math.log((n + 1) / (df[t] + 1)) + 1.0 for t in self._vocab}

    @staticmethod
    def _expand(tokens: list[str]) -> list[str]:
        out = list(tokens)
        for t in tokens:
            out.extend(_SYNONYMS.get(t, []))
        return out

    def _fallback_vec(self, text: str) -> list[float]:
        vec = [0.0] * len(self._vocab)
        for tok in self._expand(_tokenize(text)):
            idx = self._vocab.get(tok)
            if idx is not None:
                vec[idx] += self._idf[tok]
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def encode(self, texts: list[str]) -> list[list[float]]:
        if self._model is not None:
            embs = self._model.encode(texts, normalize_embeddings=True)
            return [list(map(float, e)) for e in embs]
        return [self._fallback_vec(t) for t in texts]


class Reranker:
    """Cross-encoder reranker for two-stage retrieval, with a lexical fallback."""

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
        # fallback: idf-ish token overlap of the (synonym-expanded) query
        q = set(Embedder._expand(_tokenize(query)))
        out = []
        for d in docs:
            dt = _tokenize(d)
            dset = set(dt)
            overlap = sum(1 for t in q if t in dset)
            out.append(overlap / (1 + math.log(1 + len(dt))))
        return out


def _cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


# --------------------------------------------------------------------------- #
# BM25 (keyword baseline — stands in for Elasticsearch)
# --------------------------------------------------------------------------- #
class BM25:
    def __init__(self, docs: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.docs = docs
        self.doc_len = [len(d) for d in docs]
        self.avgdl = (sum(self.doc_len) / len(docs)) if docs else 0.0
        self.freqs = [Counter(d) for d in docs]
        df: Counter = Counter()
        for d in docs:
            for tok in set(d):
                df[tok] += 1
        n = len(docs)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}

    def scores(self, query_tokens: list[str]) -> list[float]:
        out = [0.0] * len(self.docs)
        for i in range(len(self.docs)):
            freq, dl, s = self.freqs[i], self.doc_len[i], 0.0
            for tok in query_tokens:
                if tok not in freq:
                    continue
                tf = freq[tok]
                denom = tf + self.k1 * (1 - self.b + self.b * dl / (self.avgdl or 1))
                s += self.idf.get(tok, 0.0) * (tf * (self.k1 + 1)) / denom
            out[i] = s
        return out


# --------------------------------------------------------------------------- #
# Natural-language filter parsing
# --------------------------------------------------------------------------- #
_PRICE_UNDER = re.compile(r"(?:under|below|less than|cheaper than|<)\s*\$?\s*(\d+)")
_PRICE_OVER = re.compile(r"(?:over|above|more than|>)\s*\$?\s*(\d+)")


def parse_nl_filters(query: str) -> dict:
    """Pull price constraints out of the query text. Returns filters + the
    residual query with the price phrase stripped."""
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
# Catalog
# --------------------------------------------------------------------------- #
class Catalog:
    def __init__(self, products: list[dict]):
        self.products = products
        self.by_sku = {p["sku"]: p for p in products}
        texts = [_doc_text(p) for p in products]
        self.bm25 = BM25([_tokenize(t) for t in texts])
        self.embedder = Embedder(texts)
        self.reranker = Reranker()
        self.embeddings = self.embedder.encode(texts)
        self._vocab = {t for txt in texts for t in _tokenize(txt)}
        # suggestion corpus for autocomplete
        self._suggestions = sorted({p["title"] for p in products}
                                   | {p["brand"] for p in products}
                                   | {p["category"] for p in products})

    @property
    def embed_mode(self) -> str:
        return self.embedder.mode

    @property
    def rerank_mode(self) -> str:
        return self.reranker.mode

    def _result(self, idx: int, score: float) -> dict:
        return {**self.products[idx], "score": round(float(score), 4)}

    # -- base per-mode scores over all products ----------------------------- #
    def _keyword_scores(self, query: str) -> list[float]:
        return self.bm25.scores(_tokenize(query))

    def _semantic_scores(self, query: str) -> list[float]:
        qv = self.embedder.encode([query])[0]
        return [_cosine(qv, e) for e in self.embeddings]

    def _hybrid_scores(self, query: str, alpha: Optional[float]) -> list[float]:
        kw = self._keyword_scores(query)
        sem = self._semantic_scores(query)
        if alpha is not None:
            kn, sn = _minmax(kw), _minmax(sem)
            return [alpha * sn[i] + (1 - alpha) * kn[i] for i in range(len(kw))]
        # Reciprocal Rank Fusion (default)
        kw_rank = {i: r for r, i in enumerate(sorted(range(len(kw)), key=lambda i: kw[i], reverse=True))}
        sem_rank = {i: r for r, i in enumerate(sorted(range(len(sem)), key=lambda i: sem[i], reverse=True))}
        k = 60
        return [
            (1.0 / (k + kw_rank[i] + 1) if kw[i] > 0 else 0.0) + 1.0 / (k + sem_rank[i] + 1)
            for i in range(len(kw))
        ]

    def _passes(self, idx: int, category, brand, min_price, max_price) -> bool:
        p = self.products[idx]
        if category and p["category"].lower() != category.lower():
            return False
        if brand and p["brand"].lower() != brand.lower():
            return False
        if min_price is not None and p["price"] < min_price:
            return False
        if max_price is not None and p["price"] > max_price:
            return False
        return True

    def _mmr(self, pool: list[int], rel: dict[int, float], top_k: int, lam: float = 0.7) -> list[int]:
        """Maximal Marginal Relevance: trade relevance against novelty to cut near-dupes."""
        rel_norm = {}
        vals = list(rel.values())
        lo, hi = (min(vals), max(vals)) if vals else (0.0, 0.0)
        for i in pool:
            rel_norm[i] = (rel[i] - lo) / (hi - lo) if hi > lo else 0.0
        selected: list[int] = []
        candidates = list(pool)
        while candidates and len(selected) < top_k:
            best, best_score = None, -1e9
            for i in candidates:
                if selected:
                    max_sim = max(_cosine(self.embeddings[i], self.embeddings[j]) for j in selected)
                else:
                    max_sim = 0.0
                score = lam * rel_norm[i] - (1 - lam) * max_sim
                if score > best_score:
                    best, best_score = i, score
            selected.append(best)  # type: ignore
            candidates.remove(best)  # type: ignore
        return selected

    def search(
        self,
        mode: str,
        query: str,
        top_k: Optional[int] = None,
        *,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        alpha: Optional[float] = None,
        diversity: bool = False,
        rerank: bool = False,
    ) -> list[dict]:
        top_k = top_k or config.DEFAULT_TOP_K
        if mode == "keyword":
            base = self._keyword_scores(query)
        elif mode == "semantic":
            base = self._semantic_scores(query)
        elif mode == "hybrid":
            base = self._hybrid_scores(query, alpha)
        else:
            raise ValueError(f"unknown search mode: {mode}")

        idxs = sorted(range(len(base)), key=lambda i: base[i], reverse=True)
        if mode == "keyword":
            idxs = [i for i in idxs if base[i] > 0]
        idxs = [i for i in idxs if self._passes(i, category, brand, min_price, max_price)]

        # candidate pool: widen it when a reranker or MMR will re-select from it,
        # so two-stage retrieval / diversity can pull items beyond the naive top-k.
        widen = rerank or diversity
        pool_size = max(top_k, config.RERANK_CANDIDATES) if widen else top_k
        pool = idxs[:pool_size]
        scores = {i: base[i] for i in pool}

        if rerank and pool:
            docs = [_doc_text(self.products[i]) for i in pool]
            r = self.reranker.score(query, docs)
            scores = {i: r[j] for j, i in enumerate(pool)}
            pool = sorted(pool, key=lambda i: scores[i], reverse=True)

        if diversity and pool:
            pool = self._mmr(pool, scores, top_k)

        return [self._result(i, scores[i]) for i in pool[:top_k]]

    # -- auxiliary features ------------------------------------------------- #
    def did_you_mean(self, query: str) -> Optional[str]:
        """Suggest a spelling-corrected query if any token is out-of-vocabulary."""
        changed = False
        out = []
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
        if sku not in self.by_sku:
            return []
        idx = self.products.index(self.by_sku[sku])
        qv = self.embeddings[idx]
        scored = [(i, _cosine(qv, e)) for i, e in enumerate(self.embeddings) if i != idx]
        scored.sort(key=lambda t: t[1], reverse=True)
        return [self._result(i, s) for i, s in scored[:top_k]]

    def facets(self) -> dict:
        cats = Counter(p["category"] for p in self.products)
        brands = Counter(p["brand"] for p in self.products)
        prices = [p["price"] for p in self.products]
        return {
            "categories": [{"value": k, "count": v} for k, v in cats.most_common()],
            "brands": [{"value": k, "count": v} for k, v in brands.most_common()],
            "price": {"min": min(prices), "max": max(prices)},
        }

    def browse(self, category=None, brand=None, min_price=None, max_price=None,
               sort="relevance", limit=40) -> list[dict]:
        items = [p for i, p in enumerate(self.products)
                 if self._passes(i, category, brand, min_price, max_price)]
        if sort == "price_asc":
            items.sort(key=lambda p: p["price"])
        elif sort == "price_desc":
            items.sort(key=lambda p: p["price"], reverse=True)
        return [{**p, "score": 0.0} for p in items[:limit]]


_catalog: Optional[Catalog] = None


def get_catalog() -> Catalog:
    global _catalog
    if _catalog is None:
        with open(config.DATA_DIR / "products.json") as f:
            products = json.load(f)
        _catalog = Catalog(products)
    return _catalog
