"""Elasticsearch keyword (BM25) engine — optional, with graceful degradation.

Elasticsearch acts as a *pure keyword ranker*: it indexes just enough product
fields to score BM25 and returns ranked SKUs + scores. Product data and vectors
stay in Postgres, so the app runs fine with no ES at all — the catalog falls
back to Postgres full-text (`tsvector`) whenever ES is unreachable.

Requires `elasticsearch>=8` (an optional dependency). If the package isn't
installed or `ELASTICSEARCH_URL` is unset, `available()` is False and callers
use the tsvector path.
"""
from __future__ import annotations

import logging
import time
from functools import lru_cache

from . import config

log = logging.getLogger("semvex")

# BM25 field mapping. English analyzer for full-text; keyword sub-fields on
# brand/category so we can filter (facets) exactly.
_MAPPINGS = {
    "properties": {
        "sku": {"type": "keyword"},
        "title": {"type": "text", "analyzer": "english"},
        "brand": {"type": "text", "analyzer": "english", "fields": {"raw": {"type": "keyword"}}},
        "category": {"type": "text", "analyzer": "english", "fields": {"raw": {"type": "keyword"}}},
        "description": {"type": "text", "analyzer": "english"},
        "price": {"type": "integer"},
    }
}

_SEARCH_FIELDS = ["title^3", "brand^2", "category^2", "description"]

_ping = {"ok": False, "ts": 0.0}
_PING_TTL = 30.0  # seconds — avoid pinging ES on every query


@lru_cache(maxsize=1)
def _client():
    from elasticsearch import Elasticsearch

    kwargs: dict = {"request_timeout": 10}
    if config.ELASTICSEARCH_API_KEY:
        kwargs["api_key"] = config.ELASTICSEARCH_API_KEY
    return Elasticsearch(config.ELASTICSEARCH_URL, **kwargs)


def available() -> bool:
    """True if ES is configured, importable, and reachable (cached ~30s)."""
    if not config.ES_CONFIGURED:
        return False
    try:
        import elasticsearch  # noqa: F401
    except Exception:
        return False
    now = time.time()
    if now - _ping["ts"] < _PING_TTL:
        return _ping["ok"]
    try:
        ok = bool(_client().ping())
    except Exception as exc:  # noqa: BLE001
        log.warning("elasticsearch ping failed: %s", exc)
        ok = False
    _ping.update(ok=ok, ts=now)
    return ok


def ensure_index() -> None:
    es = _client()
    if not es.indices.exists(index=config.ELASTICSEARCH_INDEX):
        es.indices.create(index=config.ELASTICSEARCH_INDEX, mappings=_MAPPINGS)
        log.info("created elasticsearch index %s", config.ELASTICSEARCH_INDEX)


def bulk_index(products: list[dict], refresh: bool = False) -> int:
    """Index (upsert by sku) a batch of product dicts. Returns count indexed."""
    from elasticsearch.helpers import bulk

    ensure_index()
    actions = [
        {
            "_index": config.ELASTICSEARCH_INDEX,
            "_id": p["sku"],
            "_source": {
                "sku": p["sku"],
                "title": p["title"],
                "brand": p["brand"],
                "category": p["category"],
                "description": p["description"],
                "price": p["price"],
            },
        }
        for p in products
    ]
    n, _ = bulk(_client(), actions, refresh=refresh)
    return n


def refresh() -> None:
    """Make recently-indexed docs searchable (call once after a batch ingest)."""
    try:
        _client().indices.refresh(index=config.ELASTICSEARCH_INDEX)
    except Exception as exc:  # noqa: BLE001
        log.warning("elasticsearch refresh failed: %s", exc)


def count() -> int:
    try:
        return int(_client().count(index=config.ELASTICSEARCH_INDEX)["count"])
    except Exception:
        return 0


def search(
    query: str,
    n: int,
    *,
    category: str | None = None,
    brand: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
) -> list[dict]:
    """BM25 search → [{'sku', 'score'}] ranked best-first."""
    must = {
        "multi_match": {
            "query": query,
            "fields": _SEARCH_FIELDS,
            "type": "best_fields",
            "fuzziness": "AUTO",
        }
    }
    filt: list[dict] = []
    if category:
        filt.append({"term": {"category.raw": category}})
    if brand:
        filt.append({"term": {"brand.raw": brand}})
    price_range: dict = {}
    if min_price is not None:
        price_range["gte"] = min_price
    if max_price is not None:
        price_range["lte"] = max_price
    if price_range:
        filt.append({"range": {"price": price_range}})

    res = _client().search(
        index=config.ELASTICSEARCH_INDEX,
        query={"bool": {"must": must, "filter": filt}},
        size=n,
    )
    return [{"sku": h["_id"], "score": h["_score"]} for h in res["hits"]["hits"]]
