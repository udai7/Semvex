"""Ingestion pipeline — loads the product catalog into Postgres.

Reads `data/products.json`, computes an embedding per product with the same
`Embedder` the API uses at query time, and upserts rows into `products` with a
weighted `tsvector` for keyword search and a `pgvector` embedding for semantic
search. Idempotent: re-running rebuilds every row from the source file.

    python -m app.ingest            # ingest / refresh all products
    python -m app.ingest --force    # same (explicit)
"""
from __future__ import annotations

import json
import sys

from . import config, db
from .catalog import Embedder, doc_text

# One VALUES tuple per product. `search_tsv` is a weighted tsvector built from
# (title+brand)=A, description=B, (category+brand)=C for keyword ranking.
_VALUES_TUPLE = (
    "(%s, %s, %s, %s, %s, %s, %s, "
    "setweight(to_tsvector('english', %s), 'A') || "
    "setweight(to_tsvector('english', %s), 'B') || "
    "setweight(to_tsvector('english', %s), 'C'))"
)
_UPSERT_HEAD = (
    "INSERT INTO products "
    "(sku, title, brand, category, price, description, embedding, search_tsv) VALUES "
)
_UPSERT_TAIL = (
    " ON CONFLICT (sku) DO UPDATE SET "
    "title = EXCLUDED.title, brand = EXCLUDED.brand, category = EXCLUDED.category, "
    "price = EXCLUDED.price, description = EXCLUDED.description, "
    "embedding = EXCLUDED.embedding, search_tsv = EXCLUDED.search_tsv"
)


def upsert_batch(c, products: list[dict], embeddings) -> None:
    """Upsert a batch of product dicts (+ their embeddings) into Postgres in a
    single multi-row statement. Shared by the demo seed (`ingest`) and the ESCI
    pipeline (`ingest_esci`). One statement per batch keeps round-trips to a
    remote DB (e.g. Neon) to one per batch instead of one per row — the
    difference between minutes and seconds at 25k+ rows."""
    rows = list(zip(products, embeddings))
    if not rows:
        return
    params: list = []
    for p, emb in rows:
        params += [
            p["sku"], p["title"], p["brand"], p["category"], p["price"], p["description"],
            emb,
            f"{p['title']} {p['brand']}", p["description"], f"{p['category']} {p['brand']}",
        ]
    sql = _UPSERT_HEAD + ", ".join([_VALUES_TUPLE] * len(rows)) + _UPSERT_TAIL
    c.execute(sql, params)


def ingest() -> int:
    db.init_schema()
    with open(config.DATA_DIR / "products.json") as f:
        products = json.load(f)

    embedder = Embedder()
    embeddings = embedder.encode([doc_text(p) for p in products])

    with db.connection() as c:
        upsert_batch(c, products, embeddings)
        c.commit()
    print(f"[ingest] {len(products)} products upserted · embeddings: {embedder.mode} (dim={embedder.dim})")
    return len(products)


def ensure_ingested() -> None:
    """Seed the catalog on first boot if the products table is empty."""
    db.init_schema()
    if db.products_count() == 0:
        print("[ingest] products table empty — seeding from data/products.json")
        ingest()


if __name__ == "__main__":
    ingest()
    if "--verify" in sys.argv:
        print(f"[ingest] products in db: {db.products_count()}")
