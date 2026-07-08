import Link from "next/link";
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  BarChart3,
  Wand2,
  ArrowRight,
  ChevronRight,
  Boxes,
  Server,
  Database,
  Zap,
} from "lucide-react";
import {
  FrameContainer,
  FrameSection,
  Highlight,
  SectionEyebrow,
} from "@/components/frame";
import {
  AdminDashboardMock,
  HybridSearchMock,
  IngestPipelineMock,
  KeywordSearchMock,
  ProductBlock,
  QuoteGrid,
  SemanticSearchMock,
  StackShowcase,
} from "@/components/landing-mocks";
import { Button } from "@/components/ui/button";

type CmpRow = { title: string; score: string; pct: number; hit?: boolean };
type CmpCol = { name: string; sub: string; rows: CmpRow[]; win?: boolean };

const COMPARE_COLS: CmpCol[] = [
  {
    name: "keyword",
    sub: "BM25 · ES",
    rows: [
      { title: "Gamer Pro 17", score: "8.4", pct: 100 },
      { title: "Gaming Mousepad", score: "6.1", pct: 73 },
      { title: "Laptop Sleeve", score: "4.9", pct: 58 },
    ],
  },
  {
    name: "semantic",
    sub: "vector",
    rows: [
      { title: "Budget Chromebook", score: ".81", pct: 100, hit: true },
      { title: "Gamer Pro 17", score: ".78", pct: 96 },
      { title: "ValueBook 14", score: ".74", pct: 91, hit: true },
    ],
  },
  {
    name: "hybrid",
    sub: "RRF",
    win: true,
    rows: [
      { title: "Gamer Pro 17", score: ".92", pct: 100, hit: true },
      { title: "Budget Chromebook", score: ".88", pct: 96, hit: true },
      { title: "ValueBook 14", score: ".79", pct: 86, hit: true },
    ],
  },
];

function CompareRow({
  rank,
  row,
  win,
}: {
  rank: number;
  row: CmpRow;
  win?: boolean;
}) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="font-mono text-[#606775]">{rank}</span>
          <span className={`truncate ${win ? "font-medium text-[#e2e8f0]" : "text-[#999ea8]"}`}>
            {row.title}
          </span>
        </span>
        <span className="shrink-0 font-mono tabular-nums text-[#808591]">{row.score}</span>
      </div>
      <div className="mt-1.5 h-1 w-full bg-[#1b1f27]">
        <div
          className={win || row.hit ? "h-full bg-v2-volt" : "h-full bg-[#3e4451]"}
          style={{ width: `${row.pct}%` }}
        />
      </div>
    </div>
  );
}

function CompareMock() {
  return (
    <div className="w-full border border-[#2d3139] bg-[#0c0e12] rounded-md overflow-hidden">
      {/* query bar */}
      <div className="flex items-center justify-between border-b border-[#2d3139] px-4 py-3 bg-[#13161c]">
        <div className="flex items-center gap-2 bg-[#1b1f27] border border-[#2d3139] px-3 py-1.5 rounded-md min-w-[180px] sm:min-w-[220px]">
          <Search className="size-3.5 text-[#808591]" />
          <span className="text-xs text-[#e2e8f0]">cheap gaming laptop</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[9px] uppercase tracking-wider text-[#808591] sm:inline">
            3 engines · one query
          </span>
          <span className="border border-[#e2e8f0]/20 bg-[#1b1f27] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#e2e8f0] rounded">
            compare
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#2d3139]">
        {COMPARE_COLS.map((col) => (
          <div
            key={col.name}
            className={col.win ? "bg-[#141a0f]/40" : undefined}
          >
            {/* column header */}
            <div className="flex items-center justify-between gap-1 border-b border-[#2d3139] px-3 py-2 bg-[#13161c]/50">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#e2e8f0]">
                {col.name}
              </span>
              {col.win ? (
                <span className="bg-v2-volt px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-black rounded">
                  Best
                </span>
              ) : (
                <span className="font-mono text-[9px] uppercase text-[#606775]">{col.sub}</span>
              )}
            </div>
            {col.rows.map((row, i) => (
              <CompareRow key={row.title} rank={i + 1} row={row} win={col.win} />
            ))}
          </div>
        ))}
      </div>

      {/* footer legend */}
      <div className="flex items-center justify-between border-t border-[#2d3139] px-4 py-2.5 font-mono text-[9px] text-[#808591] bg-[#13161c]/40">
        <span>
          <span className="inline-block size-1.5 translate-y-[-1px] bg-v2-volt rounded-full mr-1.5" /> relevant hit
        </span>
        <span className="hidden sm:inline text-right text-[#808591]">hybrid recovers the budget pick keyword misses</span>
      </div>
    </div>
  );
}

/** Small filled square that reads as a selection/resize handle. */
function CornerHandle({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-40 size-2 border border-v2-bg bg-v2-text ${className}`}
    />
  );
}

/** CompareMock inside an Infisical-style technical frame: selection handles,
    a POS coordinate readout, dashed guides, and a status callout. */
function HeroVisual() {
  return (
    <div className="relative">
      {/* status callout — mirrors Infisical's [ADDING TO INFISICAL] tag */}
      <div className="absolute -top-3 left-6 z-50 flex items-center gap-2 border border-[#2d3139] bg-[#0c0e12] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]">
        <span aria-hidden className="size-1.5 bg-v2-accent-green" />
        <span className="text-v2-accent-green">Hybrid wins</span>
        <span className="text-v2-text-muted">RRF · α 0.55</span>
      </div>

      <div className="relative z-40 v2-bleed">
        {/* dashed technical guides */}
        <div aria-hidden className="pointer-events-none absolute inset-x-[-100vw] top-0 border-t border-dashed border-[#2d3139]/40 z-0 hidden md:block" />
        <div aria-hidden className="pointer-events-none absolute inset-x-[-100vw] bottom-0 border-t border-dashed border-[#2d3139]/40 z-0 hidden md:block" />

        <span className="absolute right-0 top-0 -translate-y-full pb-1 pr-1 font-mono text-[10px] text-v2-text-muted hidden md:block">
          POS 436, 65
        </span>

        <div className="v2-product-mock v2-product-mock--graphite border border-v2-border p-4 md:p-8 shadow-2xl rounded-lg">
          <CompareMock />
        </div>

        <CornerHandle className="left-0 top-0 -translate-x-1/2 -translate-y-1/2" />
        <CornerHandle className="right-0 top-0 translate-x-1/2 -translate-y-1/2" />
        <CornerHandle className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <CornerHandle className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
}

/** White headline box floating on the grainy proof band, framed with dashed
    guides and selection handles (Infisical "loved by developers" banner). */
function ProofHeadlineBox() {
  return (
    <div className="relative mx-auto max-w-3xl">
      {/* full-bleed dashed guides through the box edges (clipped by the band) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[-100vw] top-0 border-t border-dashed border-black/25" />
      <div aria-hidden className="pointer-events-none absolute inset-x-[-100vw] bottom-0 border-t border-dashed border-black/25" />

      <div className="relative z-40 border border-v2-border bg-v2-bg px-6 py-12 text-center shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] md:py-16">
        <h2 className="text-balance text-display font-medium leading-tight">
          The proof shows up in the <Highlight>numbers</Highlight>.
        </h2>

        {/* corner + mid-edge selection handles */}
        <CornerHandle className="left-0 top-0 -translate-x-1/2 -translate-y-1/2" />
        <CornerHandle className="right-0 top-0 translate-x-1/2 -translate-y-1/2" />
        <CornerHandle className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <CornerHandle className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <CornerHandle className="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" />
        <CornerHandle className="left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" />
        <CornerHandle className="left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        <CornerHandle className="right-0 top-1/2 translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

/** Decorative dotted 3×3 icon grid (Infisical reliability visual). */
function ReliabilityVisual() {
  const cells: ({ icon: typeof Database; lime?: boolean } | null)[] = [
    { icon: ShieldCheck },
    null,
    { icon: Boxes },
    null,
    { icon: Zap, lime: true },
    null,
    { icon: Server },
    null,
    { icon: Database },
  ];
  return (
    <div className="v2-integrations-panel flex items-center justify-center border border-v2-border p-6 md:p-8 mt-8">
      <div className="v2-decor-grid">
        {cells.map((c, i) =>
          c ? (
            <div
              key={i}
              className={`v2-tile border text-v2-text shadow-[0_10px_20px_-12px_rgba(0,0,0,0.45)] ${
                c.lime ? "border-v2-border bg-v2-volt" : "border-v2-border bg-v2-bg"
              }`}
            >
              <c.icon strokeWidth={1.6} />
            </div>
          ) : (
            <div key={i} className="v2-tile v2-int-placeholder" />
          )
        )}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: SlidersHorizontal, title: "Tunable α blending", body: "Slide keyword ↔ semantic weighting live and watch the ranking shift in real time.", href: "/#features" },
  { icon: Wand2, title: "Cross-encoder rerank", body: "Two-stage retrieval: a reranker refines the top candidates for precision.", href: "/#features" },
  { icon: BarChart3, title: "Live NDCG / Recall / MRR", body: "Labeled-query metrics overlaid in the UI — the winning path is starred, not asserted.", href: "/#metrics" },
  { icon: ShieldCheck, title: "Secured accounts", body: "Email verification, TOTP 2FA, backup codes, Google OAuth, and rate limiting.", href: "/signin" },
];

const METRICS = [
  { k: "+34%", l: "NDCG@5 lift, hybrid vs keyword" },
  { k: "3", l: "retrieval modes, one query" },
  { k: "384-d", l: "bge-small embeddings" },
  { k: "<40ms", l: "query-time embed (cached vectors)" },
];

const FAQS = [
  {
    q: "What's the difference between keyword, semantic, and hybrid?",
    a: "Keyword (BM25) matches literal terms. Semantic embeds the query and ranks by meaning in pgvector. Hybrid fuses both with Reciprocal Rank Fusion and a tunable α — usually the best of the three.",
  },
  {
    q: "Do I need a GPU to run the semantic search?",
    a: "No. Semvex uses bge-small-en-v1.5 (384-d) via the HuggingFace Inference API for query-time embeddings, with a hashing fallback when no model is configured. Catalog vectors are precomputed and cached.",
  },
  {
    q: "Is Elasticsearch required?",
    a: "It's optional. The keyword engine runs on Elasticsearch BM25 when available and transparently falls back to Postgres tsvector full-text search when ES is unreachable.",
  },
  {
    q: "Can I ingest my own product catalog?",
    a: "Yes. The streaming ingester reads the Amazon ESCI parquet in 50k-row batches via pyarrow — embed, upsert to pgvector, and bulk-index to ES in one idempotent, resumable command. Point it at your own data the same way.",
  },
  {
    q: "How are the NDCG / Recall / MRR numbers computed?",
    a: "From a labeled query set with human relevance judgments, scored by the offline eval harness. The same data powers the live metrics overlay in the search UI, so the winning path is measured, not asserted.",
  },
  {
    q: "What secures the accounts?",
    a: "Email verification, TOTP two-factor with backup codes, Google OAuth, and rate limiting — backed by Postgres on Neon.",
  },
];

export default function Landing() {
  return (
    <main className="v2-page">
      {/* Hero — left-aligned heading, split copy/CTA row, framed compare card below */}
      <FrameSection hairline="bottom">
        <FrameContainer className="pt-16 md:pt-24 pb-0">
          <SectionEyebrow align="left">Semantic + keyword retrieval, side by side</SectionEyebrow>

          <h1 className="max-w-none text-display-lg font-medium leading-[1.04] tracking-tight md:whitespace-nowrap">
            Search that understands <Highlight>what shoppers mean</Highlight>.
          </h1>

          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[640px] text-base leading-relaxed text-v2-text-subtle md:text-lg" style={{ opacity: 0.72 }}>
              Keyword search matches strings. Semvex matches intent — compare BM25,
              dense-vector, and hybrid ranking on one query.
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/signin">
                <Button size="lg">
                  Try the demo <ArrowRight />
                </Button>
              </Link>
              <a href="#products">
                <Button size="lg" variant="outline">
                  Explore the engine
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-14 md:mt-20">
            <HeroVisual />
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Header: Trust strip */}
      <FrameSection hairline="both" className="py-5">
        <FrameContainer>
          <SectionEyebrow align="left" className="mb-0" textSize="text-sm font-semibold tracking-wider">BUILT WITH THE TOOLS YOU ALREADY RUN</SectionEyebrow>
        </FrameContainer>
      </FrameSection>

      {/* Trust strip — Infisical "trusted by" logo row */}
      <FrameSection hairline="bottom">
        <div className="py-8">
          <FrameContainer>
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
              {["Postgres", "pgvector", "Elasticsearch", "HuggingFace", "Next.js", "Docker"].map(
                (name) => (
                  <span
                    key={name}
                    className="text-lg font-semibold tracking-tight text-[#6b7280] transition-colors hover:text-v2-text md:text-xl"
                  >
                    {name}
                  </span>
                )
              )}
            </div>
          </FrameContainer>
        </div>
      </FrameSection>

      {/* Header: Retrieval modes */}
      <FrameSection hairline="both" className="py-5">
        <FrameContainer>
          <SectionEyebrow align="left" className="mb-0" textSize="text-sm font-semibold tracking-wider">RETRIEVAL MODES</SectionEyebrow>
        </FrameContainer>
        <div
          className="absolute right-0 top-0 bottom-0 v2-yellow-grain-bg z-10"
          style={{ width: "calc(max((100% - var(--v2-max-width)) / 2, 0px) + var(--v2-content-padding))" }}
        />
      </FrameSection>

      {/* Products — Infisical-style deep dives with mocks */}
      <FrameSection id="products" tinted hairline="bottom">
        <FrameContainer className="pb-0 pt-16 md:pt-20">
          <div className="mb-10 md:mb-14">
            <h2 className="text-balance max-w-2xl text-display font-medium leading-tight">
              Meet the <Highlight>three-path</Highlight> ranking stack for product search.
            </h2>
            <p className="mt-4 max-w-xl text-sm text-v2-text-subtle" style={{ opacity: 0.72 }}>
              Keyword, semantic, and hybrid — each with a real engine behind it, shown side by side
              so the difference between matching strings and matching meaning is impossible to miss.
            </p>
          </div>

          <ProductBlock
            tone="graphite"
            eyebrow="Lexical baseline"
            title="Keyword search that keeps you honest"
            highlight="Keyword"
            description="BM25 over Elasticsearch (or Postgres full-text as fallback) — the strawman every semantic system needs to beat. Title, brand, category, and description fields indexed for a fair lexical baseline."
            href="/signin"
            linkLabel="Try keyword search"
            features={[
              { label: "Elasticsearch BM25", body: "Optional ES engine with tsvector fallback when ES is unreachable." },
              { label: "Honest strawman", body: "Curated catalog makes keyword misses visible — gaming mousepad for “laptop” queries." },
            ]}
            mock={<KeywordSearchMock />}
          />

          <ProductBlock
            flip
            tone="lime"
            eyebrow="Dense retrieval"
            title="Semantic search that catches intent"
            highlight="Semantic"
            description="bge-small-en-v1.5 embeddings stored in pgvector. Cosine similarity ranks by meaning — synonyms, paraphrases, and shopper intent that BM25 never sees."
            href="/signin"
            linkLabel="Try semantic search"
            features={[
              { label: "384-d vectors", body: "Pretrained bge-small — no fine-tuning, HF Inference API for query-time embed on VPS." },
              { label: "pgvector kNN", body: "HNSW index for sub-ms vector lookup; hashing fallback when no model is installed." },
            ]}
            mock={<SemanticSearchMock />}
          />

          <ProductBlock
            tone="amber"
            eyebrow="Production default"
            title="Hybrid fusion you can tune live"
            highlight="Hybrid"
            description="Reciprocal Rank Fusion blends keyword and semantic rankings. The α slider in the search UI lets you weight keyword vs semantic live — and watch NDCG shift in real time."
            href="/signin"
            linkLabel="Try hybrid ranking"
            features={[
              { label: "RRF + tunable α", body: "Default fusion with an interactive slider — recruiters see the tradeoff, not just the result." },
              { label: "Usually wins", body: "+34% NDCG@5 lift vs keyword alone on the labeled eval set." },
            ]}
            mock={<HybridSearchMock />}
          />
        </FrameContainer>
      </FrameSection>

      {/* Header: Integrations */}
      <FrameSection hairline="both" className="py-5">
        <FrameContainer>
          <SectionEyebrow align="left" className="mb-0" textSize="text-sm font-semibold tracking-wider">INTEGRATIONS</SectionEyebrow>
        </FrameContainer>
      </FrameSection>

      {/* Stack — Infisical "We support your stack" integrations panel */}
      <FrameSection hairline="bottom">
        <FrameContainer className="py-16 md:py-24">
          <StackShowcase />
        </FrameContainer>
      </FrameSection>

      {/* Header: Production ready */}
      <FrameSection hairline="both" className="py-5">
        <FrameContainer>
          <SectionEyebrow align="left" className="mb-0" textSize="text-sm font-semibold tracking-wider">PRODUCTION READY</SectionEyebrow>
        </FrameContainer>
      </FrameSection>

      {/* Feature grid — Infisical "reliability" two-column layout */}
      <FrameSection id="features" hairline="bottom">
        <FrameContainer className="py-16 md:py-24">
          <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left: promo + decorative dotted icon grid */}
            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">
                Built to ship
              </p>
              <h2 className="text-balance text-display font-medium leading-tight">
                <Highlight>Production</Highlight> ready.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                Everything a real product-search stack needs — reranking, diversity,
                natural-language filters, secured accounts, and a live eval overlay.
              </p>
              <Link
                href="/signin"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-v2-accent-green hover:underline"
              >
                <ChevronRight className="size-4" />
                Explore the engine
              </Link>

              <ReliabilityVisual />
            </div>

            {/* Right: feature list */}
            <div className="flex flex-col gap-9">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <div className="flex items-center gap-2.5">
                    <f.icon className="size-5 text-v2-text" strokeWidth={1.75} />
                    <h3 className="text-base font-semibold md:text-lg">{f.title}</h3>
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                    {f.body}
                  </p>
                  <Link
                    href={f.href}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-v2-accent-green hover:underline"
                  >
                    <ChevronRight className="size-4" />
                    Learn more
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Header: Analytics */}
      <FrameSection hairline="both" className="py-5">
        <FrameContainer>
          <SectionEyebrow align="left" className="mb-0" textSize="text-sm font-semibold tracking-wider">ANALYTICS</SectionEyebrow>
        </FrameContainer>
      </FrameSection>

      {/* Admin + ingest */}
      <FrameSection hairline="bottom">
        <FrameContainer className="pb-0 pt-16 md:pt-20">
          <ProductBlock
            tone="graphite"
            eyebrow="Analytics"
            title="Admin dashboard with real query telemetry"
            highlight="Admin"
            description="Click tracking, query logs, mode breakdowns, and top-query tables — the same data that powers the offline eval harness, visible in the admin UI."
            href="/admin"
            linkLabel="View admin dashboard"
            features={[
              { label: "Click + query logs", body: "Every search and click recorded for relevance feedback and analytics." },
              { label: "Mode breakdown", body: "See which retrieval path wins per query — hybrid, semantic, or keyword." },
            ]}
            mock={<AdminDashboardMock />}
          />

          <ProductBlock
            flip
            tone="lime"
            eyebrow="Ingestion"
            title="Stream ESCI at scale into pgvector + ES"
            highlight="ESCI"
            description="The Amazon ESCI products parquet streams via pyarrow in 50k-row batches — embed with bge-small, upsert pgvector, bulk-index Elasticsearch. Idempotent and resumable."
            href="/#metrics"
            linkLabel="See benchmark results"
            features={[
              { label: "Low-memory stream", body: "pyarrow record batches — 1M+ rows without loading the full parquet into RAM." },
              { label: "Dual index", body: "Vectors in Postgres, BM25 docs in ES — one ingest command keeps both in sync." },
            ]}
            mock={<IngestPipelineMock />}
          />
        </FrameContainer>
      </FrameSection>

      {/* Header: Customer stories */}
      <FrameSection hairline="both" className="py-5">
        <FrameContainer>
          <SectionEyebrow align="left" className="mb-0" textSize="text-sm font-semibold tracking-wider">CUSTOMER STORIES</SectionEyebrow>
        </FrameContainer>
      </FrameSection>

      {/* Quotes — Infisical testimonial band: grainy banner + headline box, then card grid */}
      <FrameSection hairline="bottom" className="!p-0">
        <div className="v2-proof-band">
          <FrameContainer className="py-10 md:py-14">
            <ProofHeadlineBox />
          </FrameContainer>
        </div>
        <div className="border-t border-v2-border">
          <FrameContainer className="py-0">
            <QuoteGrid />
          </FrameContainer>
        </div>
      </FrameSection>

      {/* Metrics */}
      <FrameSection id="metrics" hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <SectionHead
            eyebrow="Benchmarks"
            title={<>Headline numbers from the <Highlight>eval harness</Highlight></>}
            sub="Offline scores on the curated electronics + shoes catalog with human relevance labels."
          />

          <div className="v2-bleed v2-grid-4 border-b border-v2-border mt-12 md:mt-14">
            {METRICS.map((m) => (
              <div key={m.l} className="v2-cell">
                <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{m.k}</div>
                <div className="mt-2 text-sm text-v2-text-subtle" style={{ opacity: 0.72 }}>
                  {m.l}
                </div>
              </div>
            ))}
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Header: FAQ */}
      <FrameSection hairline="both" className="py-5">
        <FrameContainer>
          <SectionEyebrow align="left" className="mb-0" textSize="text-sm font-semibold tracking-wider">FAQ</SectionEyebrow>
        </FrameContainer>
      </FrameSection>

      {/* FAQ */}
      <FrameSection id="faq" tinted hairline="bottom">
        <FrameContainer className="py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.4fr_0.6fr] md:gap-14">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 className="text-balance text-display font-medium leading-tight">
                Questions, <Highlight>answered</Highlight>.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                How the three retrieval paths work, what runs the engine, and how the
                numbers are measured.
              </p>
            </div>

            <div className="border-t border-v2-border">
              {FAQS.map((f) => (
                <div key={f.q} className="border-b border-v2-border py-6 md:py-7">
                  <h3 className="flex items-baseline gap-3 text-base font-semibold leading-snug md:text-lg">
                    <span className="mt-0.5 shrink-0 bg-v2-accent-green" style={{ width: "1.7px", height: "13.5px" }} />
                    {f.q}
                  </h3>
                  <p className="mt-2 pl-[calc(0.75rem+1.7px)] text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.78 }}>
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FrameContainer>
      </FrameSection>

      {/* CTA */}
      <FrameSection hairline="top">
        <div className="v2-yellow-grain-bg v2-cta-band">
          <FrameContainer className="py-16 text-center md:py-20">
            <h2 className="text-balance mx-auto max-w-xl text-display font-medium text-v2-text">
              Starting with Semvex is simple, fast, and free.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <Link href="/signin">
                <Button size="lg">Try the demo <ArrowRight /></Button>
              </Link>
              <Link
                href="/signin"
                className="inline-flex min-h-[44px] items-center gap-2 font-sans text-sm font-medium text-v2-text hover:underline"
              >
                <span className="font-mono text-xs opacity-80">&gt;</span>
                <span>Sign in</span>
              </Link>
            </div>
          </FrameContainer>
        </div>
      </FrameSection>
    </main>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2 className="text-balance text-display font-medium leading-tight">{title}</h2>
      <p className="text-balance mx-auto mt-4 max-w-xl text-v2-text-subtle" style={{ opacity: 0.72 }}>
        {sub}
      </p>
    </div>
  );
}
