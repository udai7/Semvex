"""Search intelligence + discovery + analytics tests."""
from app.catalog import get_catalog, parse_nl_filters

from .conftest import register_and_login


def test_nl_filter_parsing():
    p = parse_nl_filters("gaming laptop under 300")
    assert p["filters"]["max_price"] == 300
    assert "under" not in p["residual"]


def test_semantic_beats_keyword_on_intent():
    """The core thesis: semantic ranks the budget item above keyword for
    an intent query where the literal word isn't in the best result."""
    cat = get_catalog()
    kw = [r["sku"] for r in cat.search("keyword", "affordable notebook for school", top_k=3)]
    sem = [r["sku"] for r in cat.search("semantic", "affordable notebook for school", top_k=3)]
    assert "E-1018" in sem  # Budget Chromebook
    assert sem[0] != kw[0] or "E-1018" not in kw[:1]


def test_alpha_changes_hybrid_ranking():
    cat = get_catalog()
    kw_biased = [r["sku"] for r in cat.search("hybrid", "affordable notebook for school", top_k=4, alpha=0.0)]
    sem_biased = [r["sku"] for r in cat.search("hybrid", "affordable notebook for school", top_k=4, alpha=1.0)]
    assert kw_biased != sem_biased


def test_price_filter_applied():
    cat = get_catalog()
    res = cat.search("keyword", "laptop", top_k=10, max_price=300)
    assert all(r["price"] <= 300 for r in res)


def test_diversity_reduces_brand_repetition():
    cat = get_catalog()
    normal = [r["brand"] for r in cat.search("semantic", "shoes", top_k=6)]
    diverse = [r["brand"] for r in cat.search("semantic", "shoes", top_k=6, diversity=True)]
    assert len(set(diverse)) >= len(set(normal))


def test_did_you_mean():
    cat = get_catalog()
    assert cat.did_you_mean("runing shooes") == "running shoes"


def test_similar_products():
    cat = get_catalog()
    sim = cat.similar("S-2001", top_k=3)
    assert len(sim) == 3 and all(s["sku"] != "S-2001" for s in sim)


def test_compare_endpoint_and_analytics(client):
    register_and_login(client)
    r = client.get("/search/compare?q=sports sneakers").json()
    assert set(r.keys()) >= {"keyword", "semantic", "hybrid", "overlap", "took_ms"}
    assert r["live_metrics"] is not None  # labeled query
    client.get("/search/compare?q=asdfqwer")  # zero-result
    an = client.get("/admin/analytics").json()
    assert an["total_queries"] >= 3
    assert any(z["query"] == "asdfqwer" for z in an["zero_result_queries"])


def test_favorites_roundtrip(client):
    register_and_login(client)
    client.post("/me/favorites", json={"sku": "S-2001"})
    favs = client.get("/me/favorites").json()["favorites"]
    assert any(f["sku"] == "S-2001" for f in favs)
    client.delete("/me/favorites/S-2001")
    assert client.get("/me/favorites").json()["favorites"] == []


def test_suggest_and_product(client):
    register_and_login(client)
    s = client.get("/suggest?q=stri").json()["suggestions"]
    assert any("Strider" in x for x in s)
    p = client.get("/product/E-1001").json()
    assert p["product"]["sku"] == "E-1001" and len(p["similar"]) > 0
