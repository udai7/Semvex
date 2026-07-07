import Link from "next/link";
import {
  Search,
  Sparkles,
  Scale,
  SlidersHorizontal,
  ShieldCheck,
  BarChart3,
  Wand2,
  Filter,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Hero comparison mock — shows the product in one glance             */
/* ------------------------------------------------------------------ */
function ResultRow({ rank, title, score, dim }: { rank: number; title: string; score: string; dim?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${dim ? "opacity-45" : ""}`}>
      <span className="truncate">
        <span className="mr-1.5 font-mono text-muted-foreground">{rank}</span>
        {title}
      </span>
      <span className="font-mono tabular-nums text-muted-foreground">{score}</span>
    </div>
  );
}

function CompareMock() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(30,20,8,0.35)]">
      {/* query bar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <span className="text-sm">cheap gaming laptop</span>
        <span className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-700">
          compare
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        {[
          { name: "keyword", sub: "BM25", rows: [["Gamer Pro 17", "8.4"], ["Gaming Mousepad", "6.1"], ["Laptop Sleeve", "4.9"]], win: false },
          { name: "semantic", sub: "vector", rows: [["Budget Chromebook", ".81"], ["Gamer Pro 17", ".78"], ["ValueBook 14", ".74"]], win: false },
          { name: "hybrid", sub: "RRF", rows: [["Gamer Pro 17", ".92"], ["Budget Chromebook", ".88"], ["ValueBook 14", ".79"]], win: true },
        ].map((col) => (
          <div key={col.name} className="p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {col.name}
              </span>
              {col.win ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  BEST
                </span>
              ) : (
                <span className="font-mono text-[9px] text-muted-foreground">{col.sub}</span>
              )}
            </div>
            <div className="space-y-0.5">
              {col.rows.map((r, i) => (
                <ResultRow key={r[0]} rank={i + 1} title={r[0]} score={r[1]} dim={!col.win && i === 2} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
const MODES = [
  {
    icon: Search,
    name: "Keyword",
    tag: "BM25 · Elasticsearch",
    body: "A real lexical baseline over title, brand, category and description — the honest strawman to beat, served by Elasticsearch or Postgres full-text.",
  },
  {
    icon: Sparkles,
    name: "Semantic",
    tag: "dense vector · pgvector",
    body: "bge-small embeddings rank by meaning, catching synonyms and intent that keyword search misses — “affordable notebook” finds the budget Chromebook.",
  },
  {
    icon: Scale,
    name: "Hybrid",
    tag: "reciprocal rank fusion",
    body: "RRF blends both rankings with a tunable α — usually landing the best relevance of the three, and the one you’d ship.",
  },
];

const FEATURES = [
  { icon: SlidersHorizontal, title: "Tunable α blending", body: "Slide keyword ↔ semantic weighting live and watch the ranking shift." },
  { icon: Wand2, title: "Cross-encoder rerank", body: "Two-stage retrieval: a reranker refines the top candidates for precision." },
  { icon: Filter, title: "Natural-language filters", body: "“laptop under 300” parses the price constraint straight out of the query." },
  { icon: BarChart3, title: "Live NDCG / Recall / MRR", body: "Labeled-query metrics overlaid in the UI — the winner is starred, no hand-waving." },
  { icon: ShieldCheck, title: "Secured accounts", body: "Email verification, TOTP 2-step, backup codes, Google OAuth, rate limiting." },
  { icon: Sparkles, title: "MMR diversity", body: "Suppress near-duplicate results so the top-k actually spans the catalog." },
];

const METRICS = [
  { k: "+34%", l: "NDCG@5 lift, hybrid vs keyword" },
  { k: "3", l: "retrieval modes, one query" },
  { k: "384-d", l: "bge-small embeddings" },
  { k: "<40ms", l: "query-time embed (cached vectors)" },
];

export default function Landing() {
  return (
    <main className="overflow-hidden">
      {/* ---------------- Hero ---------------- */}
      <section className="relative">
        <div className="bg-grid mask-fade absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-primary/[0.07] to-transparent" aria-hidden />
        <div className="container flex flex-col items-center pt-20 pb-16 text-center md:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            Semantic + keyword retrieval, side by side
          </div>

          <h1 className="text-balance mt-6 max-w-3xl text-display-lg font-semibold">
            Search that understands{" "}
            <span className="relative whitespace-nowrap text-primary">
              what shoppers mean
              <svg className="absolute -bottom-1.5 left-0 w-full" height="8" viewBox="0 0 300 8" fill="none" preserveAspectRatio="none" aria-hidden>
                <path d="M2 5.5C60 2 220 1.5 298 4.5" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h1>

          <p className="text-balance mt-6 max-w-xl text-lg text-muted-foreground">
            Keyword search matches strings. Semvex matches intent — so{" "}
            <span className="font-medium text-foreground">“sports sneakers”</span> finds your
            running shoes. Compare BM25, dense-vector, and hybrid ranking on one query.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signin">
              <Button size="lg">
                Try the demo <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline">How it works</Button>
            </a>
          </div>

          <div className="mt-14 w-full max-w-3xl text-left">
            <CompareMock />
          </div>
        </div>
      </section>

      {/* ---------------- Trust strip ---------------- */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span>Postgres + pgvector</span><span className="text-border">/</span>
          <span>Elasticsearch BM25</span><span className="text-border">/</span>
          <span>bge-small embeddings</span><span className="text-border">/</span>
          <span>RRF hybrid fusion</span><span className="text-border">/</span>
          <span>FastAPI · Next.js</span>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="container py-24">
        <SectionHead
          eyebrow="How it works"
          title="Three ways to rank the same query"
          sub="Semvex runs all three retrieval paths in parallel and shows them side by side — so the difference between matching strings and matching meaning is impossible to miss."
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {MODES.map((m, i) => (
            <div key={m.name} className="group relative bg-card p-7">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <div className="mt-4 inline-flex size-11 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <m.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-title font-semibold">{m.name}</h3>
              <p className="mt-1 font-mono text-xs uppercase tracking-wide text-amber-700">{m.tag}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="relative border-y border-border">
        <div className="bg-grid-sm absolute inset-0 opacity-40 mask-fade" aria-hidden />
        <div className="container relative py-24">
          <SectionHead
            eyebrow="Retrieval, done properly"
            title="Not a search box — a ranking system"
            sub="Everything you'd expect from a production relevance stack, exposed so you can see the mechanics, not just the results."
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card p-6">
                <f.icon className="size-5 text-primary" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Metrics ---------------- */}
      <section id="metrics" className="container py-24">
        <SectionHead
          eyebrow="Benchmarks, not vibes"
          title="The proof is in the metrics"
          sub="An offline eval harness scores every path with Recall@K, MRR, and NDCG@K — and the same labels power a live metrics overlay right in the search UI."
        />
        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.l} className="bg-card p-7">
              <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-primary">{m.k}</div>
              <div className="mt-2 text-sm text-muted-foreground">{m.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-foreground px-8 py-16 text-center">
          <div className="bg-grid absolute inset-0 opacity-[0.08]" aria-hidden />
          <div className="relative">
            <h2 className="text-balance mx-auto max-w-xl text-display font-semibold text-background">
              See semantic search beat keyword — live.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-background/70">
              Spin up an account, run a query, and watch hybrid ranking win in real time.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signin">
                <Button size="lg">
                  Try the demo <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-amber-700">{eyebrow}</p>
      <h2 className="text-balance mt-3 text-display font-semibold">{title}</h2>
      <p className="text-balance mx-auto mt-4 max-w-xl text-muted-foreground">{sub}</p>
    </div>
  );
}
