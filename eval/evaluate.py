"""Offline evaluation harness — the actual proof point of the project.

Runs a small labeled query set against the keyword, semantic, and hybrid paths
and reports Recall@K, MRR, and NDCG@K for each. In the real system these labels
come from the Amazon ESCI benchmark; here a compact hand-labeled set (relevant
SKUs per query) stands in so the harness runs with no dataset download.

    python -m eval.evaluate
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.catalog import get_catalog  # noqa: E402

K = 5

# query -> set of relevant product SKUs (the "exact/substitute" matches)
LABELS: dict[str, set[str]] = {
    "sports sneakers": {"S-2001", "S-2002", "S-2009", "S-2013"},
    "cheap gaming laptop": {"E-1001", "E-1018"},
    "wireless earphones for running": {"E-1006", "E-1005"},
    "waterproof shoes for the mountains": {"S-2007", "S-2008", "S-2016"},
    "warm footwear for snow": {"S-2012", "S-2007"},
    "budget fitness tracker": {"E-1009", "E-1008"},
    "noise cancelling headphones": {"E-1005", "E-1007"},
    "formal shoes for the office": {"S-2011"},
    "camera for vlogging": {"E-1011", "E-1010"},
    "kids running shoes": {"S-2013"},
}


def recall_at_k(ranked: list[str], rel: set[str]) -> float:
    if not rel:
        return 0.0
    return len(set(ranked[:K]) & rel) / len(rel)


def mrr(ranked: list[str], rel: set[str]) -> float:
    for i, sku in enumerate(ranked[:K], start=1):
        if sku in rel:
            return 1.0 / i
    return 0.0


def ndcg_at_k(ranked: list[str], rel: set[str]) -> float:
    dcg = sum(1.0 / math.log2(i + 1) for i, sku in enumerate(ranked[:K], start=1) if sku in rel)
    ideal = sum(1.0 / math.log2(i + 1) for i in range(1, min(len(rel), K) + 1))
    return dcg / ideal if ideal else 0.0


def evaluate() -> None:
    cat = get_catalog()
    print(f"Semvex evaluation · {len(cat.products)} products · embeddings: {cat.embed_mode}")
    print(f"{len(LABELS)} labeled queries · metrics @{K}\n")

    modes = ["keyword", "semantic", "hybrid"]
    totals = {m: {"recall": 0.0, "mrr": 0.0, "ndcg": 0.0} for m in modes}

    for mode in modes:
        for q, rel in LABELS.items():
            ranked = [r["sku"] for r in cat.search(mode, q, top_k=K)]
            totals[mode]["recall"] += recall_at_k(ranked, rel)
            totals[mode]["mrr"] += mrr(ranked, rel)
            totals[mode]["ndcg"] += ndcg_at_k(ranked, rel)

    n = len(LABELS)
    print(f"{'Mode':<10} {'Recall@'+str(K):>10} {'MRR':>8} {'NDCG@'+str(K):>10}")
    print("-" * 40)
    for mode in modes:
        t = totals[mode]
        print(f"{mode:<10} {t['recall']/n:>10.3f} {t['mrr']/n:>8.3f} {t['ndcg']/n:>10.3f}")
    print("\nHigher is better. Semantic/hybrid are expected to beat the keyword baseline")
    print("on intent- and synonym-heavy queries.")


if __name__ == "__main__":
    evaluate()
