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

_UPSERT = """
INSERT INTO products (sku, title, brand, category, price, description, embedding, search_tsv)
VALUES (%(sku)s, %(title)s, %(brand)s, %(category)s, %(price)s, %(description)s, %(embedding)s,
        setweight(to_tsvector('english', %(a)s), 'A') ||
        setweight(to_tsvector('english', %(b)s), 'B') ||
        setweight(to_tsvector('english', %(c)s), 'C'))
ON CONFLICT (sku) DO UPDATE SET
    title = EXCLUDED.title, brand = EXCLUDED.brand, category = EXCLUDED.category,
    price = EXCLUDED.price, description = EXCLUDED.description,
    embedding = EXCLUDED.embedding, search_tsv = EXCLUDED.search_tsv;
"""


def upsert_batch(c, products: list[dict], embeddings) -> None:
    """Upsert a batch of product dicts (+ their embeddings) into Postgres.
    Shared by the demo seed (`ingest`) and the ESCI pipeline (`ingest_esci`)."""
    for p, emb in zip(products, embeddings):
        c.execute(_UPSERT, {
            **p,
            "embedding": emb,
            "a": f"{p['title']} {p['brand']}",
            "b": p["description"],
            "c": f"{p['category']} {p['brand']}",
        })


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
