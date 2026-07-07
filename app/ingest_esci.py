"""Scalable ingestion of the Amazon ESCI product catalog.

Streams the ESCI products Parquet (Amazon Shopping Queries Dataset), normalizes
each row into Semvex's product shape, embeds in batches, and upserts into
Postgres (pgvector) + indexes into Elasticsearch (when configured). Designed to
handle 50k–1M+ rows without loading the whole file into memory: it iterates the
Parquet in record batches via pyarrow.

Get the data (once):
    # from the amazon-science/esci-data repo (git-lfs) or a HF mirror, grab
    #   shopping_queries_dataset_products.parquet
    # then:
    python -m app.ingest_esci --source /path/to/...products.parquet --limit 50000

Notes / synthesized fields:
  * ESCI products have no price or category, so price is a deterministic synthetic
    value (stable per SKU) and category is a lightweight keyword heuristic — both
    swappable, and enough to make facets/filters meaningful in the demo.

Flags:
    --source PATH     ESCI products parquet (required)
    --locale us       keep only this product_locale (default: us)
    --limit N         stop after N products (default: all)
    --offset N        skip the first N matching products (resume)
    --batch N         embed/upsert batch size (default: 500)
    --target both     both | pg | es  (default: both when ES configured, else pg)
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys

from . import config, db, search_es
from .catalog import Embedder, doc_text
from .ingest import upsert_batch

_HTML = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")

# Coarse category from title keywords — first match wins, else "General".
_CATEGORY_RULES: list[tuple[tuple[str, ...], str]] = [
    (("shoe", "sneaker", "boot", "sandal", "loafer", "heel", "footwear", "cleat"), "Shoes"),
    (("laptop", "headphone", "earbud", "camera", "phone", "tablet", "speaker",
      "charger", "monitor", "keyboard", "mouse", "console", "router", "webcam"), "Electronics"),
    (("shirt", "dress", "jacket", "pant", "jean", "hoodie", "sweater", "apparel",
      "clothing", "sock", "hat", "coat"), "Clothing"),
    (("sofa", "chair", "table", "lamp", "furniture", "mattress", "curtain", "rug", "shelf"), "Home"),
    (("toy", "game", "lego", "puzzle", "doll", "action figure"), "Toys & Games"),
    (("book", "novel", "paperback", "hardcover"), "Books"),
    (("vitamin", "supplement", "shampoo", "cream", "lotion", "makeup", "serum"), "Beauty & Health"),
    (("dog", "cat", "pet", "aquarium", "leash"), "Pet Supplies"),
    (("kitchen", "cookware", "blender", "pan", "utensil", "knife", "mug"), "Kitchen"),
    (("tool", "drill", "wrench", "hammer", "screwdriver"), "Tools"),
]


def _clean(text: str | None) -> str:
    if not text:
        return ""
    return _WS.sub(" ", _HTML.sub(" ", text)).strip()


def _category_for(title: str) -> str:
    t = title.lower()
    for keywords, cat in _CATEGORY_RULES:
        if any(k in t for k in keywords):
            return cat
    return "General"


def _synth_price(sku: str) -> int:
    """Deterministic pseudo price in [5, 499] — stable per SKU across runs."""
    h = int(hashlib.md5(sku.encode()).hexdigest(), 16)
    return 5 + (h % 495)


def _normalize(row: dict) -> dict | None:
    sku = (row.get("product_id") or "").strip()
    title = _clean(row.get("product_title"))
    if not sku or not title:
        return None
    description = _clean(row.get("product_description")) or _clean(row.get("product_bullet_point"))
    return {
        "sku": sku,
        "title": title[:500],
        "brand": _clean(row.get("product_brand")) or "Generic",
        "category": _category_for(f"{title} {row.get('product_bullet_point') or ''}"),
        "price": _synth_price(sku),
        "description": (description or title)[:2000],
    }


def _iter_products(source: str, locale: str, limit: int | None, offset: int):
    """Yield normalized product dicts, streaming the parquet in record batches."""
    import pyarrow.parquet as pq

    cols = [
        "product_id", "product_title", "product_description",
        "product_bullet_point", "product_brand", "product_locale",
    ]
    pf = pq.ParquetFile(source)
    available = set(pf.schema.names)
    read_cols = [c for c in cols if c in available]

    seen = 0      # matched (post-filter) rows encountered
    yielded = 0
    for batch in pf.iter_batches(batch_size=2000, columns=read_cols):
        for row in batch.to_pylist():
            if locale and row.get("product_locale") not in (locale, None):
                continue
            norm = _normalize(row)
            if norm is None:
                continue
            seen += 1
            if seen <= offset:
                continue
            yield norm
            yielded += 1
            if limit and yielded >= limit:
                return


def ingest_esci(source, locale="us", limit=None, offset=0, batch_size=500, target="auto") -> int:
    db.init_schema()
    embedder = Embedder()

    use_es = target in ("both", "es") or (target == "auto" and config.ES_CONFIGURED)
    use_pg = target in ("both", "pg", "auto")
    if use_es:
        search_es.ensure_index()

    total = 0
    buf: list[dict] = []

    def flush():
        nonlocal total
        if not buf:
            return
        embeddings = embedder.encode([doc_text(p) for p in buf])
        if use_pg:
            with db.connection() as c:
                upsert_batch(c, buf, embeddings)
                c.commit()
        if use_es:
            search_es.bulk_index(buf)
        total += len(buf)
        print(f"[ingest_esci] {total} products ingested…", flush=True)
        buf.clear()

    for product in _iter_products(source, locale, limit, offset):
        buf.append(product)
        if len(buf) >= batch_size:
            flush()
    flush()
    if use_es:
        search_es.refresh()  # make the whole batch immediately searchable

    print(
        f"[ingest_esci] done · {total} products · embeddings: {embedder.mode} "
        f"(dim={embedder.dim}) · pg={use_pg} es={use_es}"
    )
    return total


def main(argv=None):
    ap = argparse.ArgumentParser(description="Ingest the Amazon ESCI catalog into Semvex.")
    ap.add_argument("--source", required=True, help="Path to ESCI products parquet")
    ap.add_argument("--locale", default="us")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--batch", type=int, default=500, dest="batch_size")
    ap.add_argument("--target", default="auto", choices=["auto", "both", "pg", "es"])
    args = ap.parse_args(argv)
    try:
        ingest_esci(**vars(args))
    except FileNotFoundError:
        sys.exit(f"[ingest_esci] source not found: {args.source}")


if __name__ == "__main__":
    main()
