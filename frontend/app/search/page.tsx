"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  embedLabel,
  Health,
  keywordLabel,
  LiveMetrics,
  Product,
  rerankLabel,
  SearchMode,
  thumbEmoji,
  thumbGradient,
} from "@/lib/api";

// Verified against the 25k ESCI catalog — each returns strong, on-topic
// semantic matches, chosen to show breadth across categories.
const EXAMPLES = [
  "wireless noise cancelling headphones",
  "waterproof jacket for cold rainy hikes",
  "running shoes for a marathon",
  "cozy blanket for winter",
  "dog leash for large dogs",
  "board game for family night",
];

type Facets = {
  categories: { value: string; count: number }[];
  brands: { value: string; count: number }[];
  price: { min: number; max: number };
};

export default function SearchPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("compare");

  // controls
  const [alpha, setAlpha] = useState(0.5);
  const [rerank, setRerank] = useState(false);
  const [diversity, setDiversity] = useState(false);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // data
  const [health, setHealth] = useState<Health | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [resp, setResp] = useState<any>(null);
  const [single, setSingle] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, number>>({});

  // autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestTimer = useRef<any>(null);

  useEffect(() => {
    api("/auth/me").then(({ data }) => {
      if (!data.authenticated) return router.replace("/signin");
      setReady(true);
      // Deep-link support: /search?q=... (e.g. from a saved search)
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) { setQuery(q); run(q); }
    });
    api<Facets>("/facets").then(({ data }) => setFacets(data));
    api<Health>("/health").then(({ data }) => setHealth(data));
    api<{ favorites: Product[] }>("/me/favorites").then(({ data }) =>
      setFavorites(new Set((data.favorites || []).map((p) => p.sku)))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const params = useCallback(() => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (brand) p.set("brand", brand);
    if (maxPrice) p.set("max_price", maxPrice);
    if (rerank) p.set("rerank", "true");
    if (diversity) p.set("diversity", "true");
    return p;
  }, [category, brand, maxPrice, rerank, diversity]);

  async function run(q: string, m: SearchMode = mode) {
    q = q.trim();
    if (!q) return;
    setShowSuggest(false);
    setSubmitted(true);
    setLoading(true);
    const p = params();
    if (m === "hybrid" || m === "compare") p.set("alpha", String(alpha));
    const path =
      m === "compare"
        ? `/search/compare?q=${encodeURIComponent(q)}&${p}`
        : `/search/${m}?q=${encodeURIComponent(q)}&${p}`;
    const { ok, data } = await api(path);
    setLoading(false);
    if (!ok) {
      if (data?.error === "authentication required") router.replace("/signin");
      return;
    }
    if (m === "compare") {
      setSingle(null);
      setResp(data);
    } else {
      setResp(data);
      setSingle(data.results);
    }
  }

  function onQueryChange(v: string) {
    setQuery(v);
    clearTimeout(suggestTimer.current);
    if (!v.trim()) return setShowSuggest(false);
    suggestTimer.current = setTimeout(async () => {
      const { data } = await api<{ suggestions: string[] }>(
        `/suggest?q=${encodeURIComponent(v)}`
      );
      setSuggestions(data.suggestions || []);
      setShowSuggest((data.suggestions || []).length > 0);
    }, 120);
  }

  async function toggleFavorite(sku: string) {
    const next = new Set(favorites);
    if (next.has(sku)) {
      next.delete(sku);
      await api(`/me/favorites/${sku}`, { method: "DELETE" });
    } else {
      next.add(sku);
      await api("/me/favorites", { method: "POST", body: JSON.stringify({ sku }) });
    }
    setFavorites(next);
  }

  function sendFeedback(sku: string, m: string, rating: number) {
    setFeedbackGiven({ ...feedbackGiven, [sku + m]: rating });
    api("/feedback", {
      method: "POST",
      body: JSON.stringify({ query, sku, mode: m, rating }),
    });
  }

  function logClick(sku: string, m: string) {
    api("/click", { method: "POST", body: JSON.stringify({ query, sku, mode: m }) });
  }

  async function saveSearch() {
    await api("/me/saved-searches", {
      method: "POST",
      body: JSON.stringify({ query, mode }),
    });
  }

  function Card({ item, colMode, rank }: { item: Product; colMode: string; rank: number }) {
    const fav = favorites.has(item.sku);
    const fb = feedbackGiven[item.sku + colMode];
    return (
      <div className="card">
        <button
          className={`heart ${fav ? "on" : ""}`}
          title={fav ? "Remove favorite" : "Save favorite"}
          onClick={() => toggleFavorite(item.sku)}
        >
          {fav ? "♥" : "♡"}
        </button>
        <div
          className="thumb"
          style={{ background: thumbGradient(item.sku) }}
        >
          {thumbEmoji(item)}
        </div>
        <div className="card-top">
          <p className="card-title">
            <span className="rank">{rank}.</span>
            <Link href={`/product/${item.sku}`} onClick={() => logClick(item.sku, colMode)}>
              {item.title}
            </Link>
          </p>
          <span className="card-score">{item.score}</span>
        </div>
        <p className="card-meta">
          {item.brand} · {item.category} ·{" "}
          <span className="card-price">${item.price}</span>
        </p>
        <p className="card-desc">{item.description}</p>
        <div className="card-actions">
          <button
            className={`up ${fb === 1 ? "active" : ""}`}
            onClick={() => sendFeedback(item.sku, colMode, 1)}
          >
            👍 relevant
          </button>
          <button
            className={`down ${fb === -1 ? "active" : ""}`}
            onClick={() => sendFeedback(item.sku, colMode, -1)}
          >
            👎
          </button>
        </div>
      </div>
    );
  }

  function Column({ title, cls, items }: { title: string; cls: string; items: Product[] }) {
    return (
      <div className="result-col">
        <h4>
          <span className={`dot ${cls}`} />
          {title}
        </h4>
        {items.length ? (
          items.map((it, i) => <Card key={it.sku} item={it} colMode={cls} rank={i + 1} />)
        ) : (
          <p className="no-results">No results.</p>
        )}
      </div>
    );
  }

  const lm: LiveMetrics | null = resp?.live_metrics || null;
  const bestNdcg = lm
    ? Math.max(lm.keyword.ndcg, lm.semantic.ndcg, lm.hybrid.ndcg)
    : 0;

  if (!ready) return <div className="app-wrap" />;

  return (
    <main className="app-wrap">
      <form className="search-bar" onSubmit={(e) => { e.preventDefault(); run(query); }}>
        <input
          type="search"
          placeholder="Try: sports sneakers under 100…"
          value={query}
          autoComplete="off"
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => query.trim() && suggestions.length && setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
        />
        <button className="btn btn-primary" type="submit">Search</button>
        {showSuggest && (
          <div className="suggest-box">
            {suggestions.map((s) => (
              <div
                key={s}
                className="suggest-item"
                onMouseDown={() => { setQuery(s); run(s); }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="chips">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="chip" onClick={() => { setQuery(ex); run(ex); }}>
            {ex}
          </button>
        ))}
      </div>

      {/* catalog / dataset disclaimer */}
      <p className="catalog-note">
        Demo catalog: ~25,000 products sampled from the{" "}
        <a
          href="https://github.com/amazon-science/esci-data"
          target="_blank"
          rel="noopener noreferrer"
        >
          Amazon ESCI (Shopping Queries) dataset
        </a>
        . A specific item — say a named brand like “iPhone” — may not be in the
        catalog. Semantic search always returns the <em>closest</em> matches, so
        some results can look only loosely related when the exact product isn’t
        present.
      </p>

      {/* live engine/provider status — what's actually serving this search */}
      {health && (
        <div className="engine-status" title="Live engine configuration from /health">
          <span className="engine-pill">
            <span className="engine-k">products</span>
            <b>{health.products.toLocaleString()}</b>
          </span>
          <span className={`engine-pill ${embedLabel(health.embed_mode).dense ? "on" : "warn"}`}>
            <span className="engine-k">semantic</span>
            <b>{embedLabel(health.embed_mode).text}</b>
          </span>
          <span className={`engine-pill ${health.keyword_engine === "elasticsearch" ? "on" : ""}`}>
            <span className="engine-k">keyword</span>
            <b>{keywordLabel(health.keyword_engine)}</b>
          </span>
          <span className={`engine-pill ${rerankLabel(health.rerank_mode).active ? "on" : ""}`}>
            <span className="engine-k">rerank</span>
            <b>{rerankLabel(health.rerank_mode).text}</b>
          </span>
        </div>
      )}

      {/* mode + intelligence controls */}
      <div className="controls">
        <div className="mode-toggle">
          {(["compare", "keyword", "semantic", "hybrid"] as SearchMode[]).map((m) => (
            <button
              key={m}
              className={`mode ${mode === m ? "is-active" : ""}`}
              onClick={() => { setMode(m); if (query.trim()) run(query, m); }}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {(mode === "hybrid" || mode === "compare") && (
          <div className="slider-wrap">
            <span>keyword</span>
            <input
              type="range" min={0} max={1} step={0.1} value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              onMouseUp={() => query.trim() && run(query)}
              onTouchEnd={() => query.trim() && run(query)}
            />
            <span>semantic</span>
            <b>α={alpha.toFixed(1)}</b>
          </div>
        )}

        <label className="toggle">
          <input type="checkbox" checked={rerank}
            onChange={(e) => { setRerank(e.target.checked); if (query.trim()) setTimeout(() => run(query), 0); }} />
          <span className="switch" /> Rerank
        </label>
        <label className="toggle">
          <input type="checkbox" checked={diversity}
            onChange={(e) => { setDiversity(e.target.checked); if (query.trim()) setTimeout(() => run(query), 0); }} />
          <span className="switch" /> Diversity
        </label>
      </div>

      {/* filters */}
      {facets && (
        <div className="filters">
          <label>
            Category
            <select value={category} onChange={(e) => { setCategory(e.target.value); if (query.trim()) setTimeout(() => run(query), 0); }}>
              <option value="">All</option>
              {facets.categories.map((c) => (
                <option key={c.value} value={c.value}>{c.value} ({c.count})</option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <select value={brand} onChange={(e) => { setBrand(e.target.value); if (query.trim()) setTimeout(() => run(query), 0); }}>
              <option value="">All</option>
              {facets.brands.map((b) => (
                <option key={b.value} value={b.value}>{b.value} ({b.count})</option>
              ))}
            </select>
          </label>
          <label>
            Max price
            <input type="number" placeholder={`${facets.price.max}`} value={maxPrice}
              style={{ width: 90 }}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={() => query.trim() && run(query)} />
          </label>
          {query.trim() && (
            <button className="chip" onClick={saveSearch}>☆ Save search</button>
          )}
        </div>
      )}

      {/* did you mean */}
      {resp?.did_you_mean && (
        <p className="dym">
          Did you mean{" "}
          <a onMouseDown={() => { setQuery(resp.did_you_mean); run(resp.did_you_mean); }}>
            {resp.did_you_mean}
          </a>
          ?
        </p>
      )}

      {/* meta badges */}
      {submitted && resp && (
        <div className="meta-row">
          <span className="badge">
            embeddings: <b>{embedLabel(resp.embed_mode).text}</b>
          </span>
          {resp.keyword_engine && (mode === "keyword" || mode === "hybrid" || mode === "compare") && (
            <span className="badge">
              keyword: <b>{keywordLabel(resp.keyword_engine)}</b>
            </span>
          )}
          {rerank && (
            <span className="badge">
              rerank: <b>{rerankLabel(resp.rerank_mode).text}</b>
            </span>
          )}
          {typeof resp.took_ms === "number" && (
            <span className="badge">latency: <b>{resp.took_ms}ms</b></span>
          )}
          {resp.took_ms && typeof resp.took_ms === "object" && (
            <span className="badge">
              latency: kw <b>{resp.took_ms.keyword}ms</b> / sem <b>{resp.took_ms.semantic}ms</b> / hyb <b>{resp.took_ms.hybrid}ms</b>
            </span>
          )}
          {resp.applied_filters && Object.keys(resp.applied_filters).length > 0 && (
            <span className="badge">
              filters: <b>{Object.entries(resp.applied_filters).map(([k, v]) => `${k}=${v}`).join(", ")}</b>
            </span>
          )}
        </div>
      )}

      {/* live eval metrics */}
      {lm && (
        <div className="meta-row">
          {(["keyword", "semantic", "hybrid"] as const).map((m) => (
            <span key={m} className={`badge ${lm[m].ndcg === bestNdcg && bestNdcg > 0 ? "win" : ""}`}>
              {m} NDCG@5 <b>{lm[m].ndcg}</b> · R <b>{lm[m].recall}</b>
              {lm[m].ndcg === bestNdcg && bestNdcg > 0 ? " ★" : ""}
            </span>
          ))}
        </div>
      )}

      {/* results */}
      {loading ? (
        <p className="no-results">Searching…</p>
      ) : !submitted ? (
        <div className="empty-state">
          <p>
            Enter a query, or pick an example. In <b>Compare</b> mode you’ll see
            keyword, semantic, and hybrid side by side. Try the α slider, rerank,
            and diversity toggles — and labeled queries show live NDCG.
          </p>
        </div>
      ) : mode === "compare" && resp ? (
        <>
          {resp.overlap && (
            <p className="overlap-note">
              Overlap: {resp.overlap.all_three} shared by all three ·{" "}
              {resp.overlap.semantic_only} semantic-only ·{" "}
              {resp.overlap.keyword_only} keyword-only
            </p>
          )}
          <div className="results compare">
            <Column title="Keyword · BM25" cls="keyword" items={resp.keyword} />
            <Column title="Semantic" cls="semantic" items={resp.semantic} />
            <Column title="Hybrid · RRF" cls="hybrid" items={resp.hybrid} />
          </div>
        </>
      ) : single ? (
        <div className="results">
          <Column title={mode[0].toUpperCase() + mode.slice(1)} cls={mode} items={single} />
        </div>
      ) : null}
    </main>
  );
}
