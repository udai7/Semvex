import Link from "next/link";
import {
  ArrowUpRight,
  Binary,
  Boxes,
  ChevronRight,
  Container,
  Database,
  Search,
  Server,
  Sparkles,
  Triangle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Highlight, SectionEyebrow } from "@/components/frame";

/* ------------------------------------------------------------------ */
/* Shared mock chrome                                                   */
/* ------------------------------------------------------------------ */

function MockWindow({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`v2-mock w-full max-w-lg overflow-hidden ${className}`}>
      <div className="v2-mock-bar">
        <span className="v2-mock-dot" />
        <span className="v2-mock-dot" />
        <span className="v2-mock-dot" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[#808591]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product block — Infisical split layout (copy + mock)                 */
/* ------------------------------------------------------------------ */

export function ProductBlock({
  eyebrow,
  title,
  highlight,
  description,
  href,
  linkLabel,
  features,
  mock,
  flip = false,
  tone = "graphite",
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  href: string;
  linkLabel: string;
  features: { label: string; body: string }[];
  mock: React.ReactNode;
  flip?: boolean;
  tone?: "lime" | "amber" | "graphite";
}) {
  return (
    <div className={`v2-bleed v2-product-split ${flip ? "v2-product-split--flip" : ""}`}>
      <div className="v2-product-copy flex flex-col justify-center">
        <SectionEyebrow align="left">{eyebrow}</SectionEyebrow>
        <h3 className="text-balance text-2xl font-medium leading-tight tracking-tight md:text-[1.75rem]">
          {highlight ? (
            <>
              {title.split(highlight)[0]}
              <Highlight>{highlight}</Highlight>
              {title.split(highlight)[1]}
            </>
          ) : (
            title
          )}
        </h3>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
          {description}
        </p>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-v2-accent-green hover:underline"
        >
          <ChevronRight className="size-4" />
          {linkLabel}
        </Link>
        <ul className="mt-8 space-y-5 border-t border-v2-border pt-8">
          {features.map((f) => (
            <li key={f.label}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-v2-text-muted">
                {f.label}
              </p>
              <p className="mt-1 text-sm text-v2-text-subtle" style={{ opacity: 0.72 }}>
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className={`v2-product-mock v2-product-mock--${tone}`}>{mock}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Individual mocks                                                     */
/* ------------------------------------------------------------------ */

export function KeywordSearchMock() {
  const rows = [
    { rank: 1, title: "Gamer Pro 17 Laptop", score: "8.42", brand: "Acer" },
    { rank: 2, title: "Gaming Mousepad XL", score: "6.14", brand: "Razer" },
    { rank: 3, title: "Laptop Sleeve 15\"", score: "4.91", brand: "Amazon" },
    { rank: 4, title: "USB-C Gaming Hub", score: "4.22", brand: "Anker" },
  ];
  return (
    <MockWindow title="elasticsearch · bm25">
      <div className="border-b border-[#dbdee5] px-3 py-2 font-mono text-[11px] text-[#808591]">
        q = &quot;cheap gaming laptop&quot;
      </div>
      {rows.map((r) => (
        <div key={r.rank} className="v2-mock-row">
          <span className="truncate">
            <span className="mr-2 font-mono text-[#999ea8]">{r.rank}</span>
            {r.title}
          </span>
          <span className="shrink-0 font-mono tabular-nums text-[#808591]">{r.score}</span>
        </div>
      ))}
      <div className="border-t border-[#dbdee5] bg-[#f5f7fa] px-3 py-2 font-mono text-[10px] text-[#999ea8]">
        tsvector fallback when ES unavailable
      </div>
    </MockWindow>
  );
}

export function SemanticSearchMock() {
  const rows = [
    { title: "Budget Chromebook 14", sim: 0.81 },
    { title: "Gamer Pro 17 Laptop", sim: 0.78 },
    { title: "ValueBook 14", sim: 0.74 },
    { title: "Student Laptop 15", sim: 0.71 },
  ];
  return (
    <MockWindow title="pgvector · cosine">
      <div className="flex items-center justify-between border-b border-[#dbdee5] px-3 py-2">
        <span className="font-mono text-[10px] text-[#808591]">bge-small · 384-d</span>
        <span className="v2-mock-tag">kNN</span>
      </div>
      {rows.map((r) => (
        <div key={r.title} className="v2-mock-row flex-col !items-stretch gap-1.5 !py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px]">{r.title}</span>
            <span className="font-mono text-[10px] tabular-nums text-[#808591]">
              {r.sim.toFixed(2)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#eef0f4]">
            <div
              className="h-full bg-v2-volt"
              style={{ width: `${r.sim * 100}%` }}
            />
          </div>
        </div>
      ))}
    </MockWindow>
  );
}

export function HybridSearchMock() {
  return (
    <MockWindow title="hybrid · rrf fusion">
      <div className="space-y-3 border-b border-[#dbdee5] p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#808591]">α blend</span>
          <span className="font-mono font-semibold">0.55</span>
        </div>
        <div className="relative h-2 bg-[#eef0f4]">
          <div className="absolute inset-y-0 left-0 w-[55%] bg-v2-volt" />
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 border border-[#14171f] bg-white"
            style={{ left: "55%" }}
          />
        </div>
        <div className="flex justify-between font-mono text-[9px] uppercase text-[#999ea8]">
          <span>keyword</span>
          <span>semantic</span>
        </div>
      </div>
      {([
        ["Gamer Pro 17", ".92", true],
        ["Budget Chromebook", ".88", false],
        ["ValueBook 14", ".79", false],
      ] as const).map(([title, score, win]) => (
        <div key={title} className="v2-mock-row">
          <span className="truncate">{title}</span>
          <span className="flex items-center gap-2">
            {win && <span className="v2-mock-tag v2-mock-tag--win">best</span>}
            <span className="font-mono tabular-nums text-[#808591]">{score}</span>
          </span>
        </div>
      ))}
    </MockWindow>
  );
}

export function SearchAppMock() {
  return (
    <MockWindow title="semvex · /search" className="max-w-xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#dbdee5] p-3">
        <div className="flex-1 border border-[#dbdee5] bg-white px-3 py-2 text-[12px]">
          sports sneakers under 80
        </div>
        <span className="v2-mock-tag">hybrid</span>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-[#dbdee5] bg-[#f5f7fa] p-2">
        {["keyword", "semantic", "hybrid", "rerank", "compare"].map((m, i) => (
          <span
            key={m}
            className={`px-2 py-1 font-mono text-[9px] uppercase ${
              i === 2
                ? "border border-[#14171f] bg-[#14171f] text-white"
                : "border border-[#dbdee5] bg-white text-[#808591]"
            }`}
          >
            {m}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#dbdee5] border-b border-[#dbdee5] text-center">
        {([
          ["NDCG@5", ".71", false],
          ["Recall@10", ".84", false],
          ["MRR", ".79", true],
        ] as const).map(([k, v, win]) => (
          <div key={k} className="p-2">
            <div className="font-mono text-[9px] uppercase text-[#999ea8]">{k}</div>
            <div className={`font-mono text-sm font-semibold ${win ? "text-[#0f7a47]" : ""}`}>
              {v}
              {win && " ★"}
            </div>
          </div>
        ))}
      </div>
      {[
        "Nike Air Zoom Pegasus 40",
        "Adidas Ultraboost Light",
        "Brooks Ghost 15",
      ].map((t, i) => (
        <div key={t} className="v2-mock-row">
          <span>
            <span className="mr-2 font-mono text-[#999ea8]">{i + 1}</span>
            {t}
          </span>
          <span className="font-mono text-[10px] text-[#0f7a47]">$74</span>
        </div>
      ))}
    </MockWindow>
  );
}

export function AdminDashboardMock() {
  return (
    <MockWindow title="semvex · /admin" className="max-w-xl">
      <div className="grid grid-cols-3 divide-x divide-[#dbdee5] border-b border-[#dbdee5]">
        {[
          ["1,284", "queries"],
          ["312", "clicks"],
          ["68%", "hybrid wins"],
        ].map(([n, l]) => (
          <div key={l} className="p-3 text-center">
            <div className="font-mono text-lg font-semibold">{n}</div>
            <div className="font-mono text-[9px] uppercase text-[#999ea8]">{l}</div>
          </div>
        ))}
      </div>
      <div className="border-b border-[#dbdee5] px-3 py-2 font-mono text-[10px] uppercase text-[#808591]">
        top queries · 24h
      </div>
      {[
        ["running shoes", "hybrid", "41"],
        ["cheap laptop", "semantic", "28"],
        ["wireless earbuds", "keyword", "19"],
      ].map(([q, mode, n]) => (
        <div key={q} className="v2-mock-row">
          <span className="truncate font-mono text-[11px]">{q}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="v2-mock-tag">{mode}</span>
            <span className="font-mono text-[#808591]">{n}</span>
          </span>
        </div>
      ))}
    </MockWindow>
  );
}

export function IngestPipelineMock() {
  const steps = [
    { n: "01", label: "ESCI parquet stream", sub: "pyarrow batches" },
    { n: "02", label: "bge-small embed", sub: "384-d vectors" },
    { n: "03", label: "pgvector upsert", sub: "HNSW index" },
    { n: "04", label: "ES bulk index", sub: "BM25 mirror" },
  ];
  return (
    <div className="v2-mock w-full max-w-md">
      <div className="v2-mock-bar">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#808591]">
          ingest pipeline
        </span>
      </div>
      {steps.map((s, i) => (
        <div
          key={s.n}
          className="flex items-start gap-3 border-b border-[#dbdee5] p-3 last:border-b-0"
        >
          <span className="font-mono text-xs text-[#999ea8]">{s.n}</span>
          <div className="flex-1">
            <div className="text-[12px] font-medium">{s.label}</div>
            <div className="font-mono text-[10px] text-[#808591]">{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <span className="font-mono text-[#999ea8]">↓</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stack + social proof                                                 */
/* ------------------------------------------------------------------ */

/** Brand-colored icon tiles (null = dotted placeholder) — Infisical integrations grid. */
const STACK_TILES: ({ icon: LucideIcon; name: string; bg: string; fg: string } | null)[] = [
  null,
  { icon: Database, name: "Postgres", bg: "#336791", fg: "#ffffff" },
  { icon: Boxes, name: "pgvector", bg: "#1e40af", fg: "#ffffff" },
  null,
  { icon: Search, name: "Elasticsearch", bg: "#f5c518", fg: "#111111" },
  { icon: Sparkles, name: "HuggingFace", bg: "#ffd21e", fg: "#111111" },
  { icon: Container, name: "Docker", bg: "#2496ed", fg: "#ffffff" },
  { icon: Triangle, name: "Next.js", bg: "#111111", fg: "#ffffff" },
  null,
  { icon: Server, name: "FastAPI", bg: "#059669", fg: "#ffffff" },
  { icon: Zap, name: "Neon", bg: "#00e599", fg: "#05231a" },
  null,
];

export function StackShowcase() {
  return (
    <div className="grid items-stretch gap-0 lg:grid-cols-[0.6fr_0.4fr]">
      <div className="v2-integrations-panel flex items-center justify-center border border-v2-border p-6 md:p-10">
        <div className="v2-tile-grid">
          {STACK_TILES.map((t, i) =>
            t ? (
              <div
                key={i}
                className="v2-tile shadow-[0_10px_20px_-12px_rgba(0,0,0,0.45)]"
                style={{ background: t.bg, color: t.fg }}
                title={t.name}
                aria-label={t.name}
              >
                <t.icon strokeWidth={1.75} />
              </div>
            ) : (
              <div key={i} className="v2-tile v2-int-placeholder" />
            )
          )}
        </div>
      </div>

      <div className="flex flex-col justify-center border-x border-b border-v2-border p-6 md:p-10 lg:border-l-0 lg:border-b-0 lg:border-r lg:border-y">
        <SectionEyebrow align="left">Integrations</SectionEyebrow>
        <h2 className="text-balance text-display font-medium leading-tight">
          We support <Highlight>your stack</Highlight>.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
          Postgres + pgvector for vectors, Elasticsearch for BM25, and HuggingFace for
          query embeddings — env-driven and fully Dockerized.
        </p>
        <Link
          href="/#features"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-v2-accent-green hover:underline"
        >
          <ChevronRight className="size-4" />
          Explore the engine
        </Link>
      </div>
    </div>
  );
}

const QUOTES = [
  {
    name: "Offline eval",
    handle: "@labels.json",
    body: "Hybrid beat keyword on NDCG@5 by 34% on the labeled electronics set — the live overlay made it obvious.",
    mark: "34%",
    href: "/#metrics",
  },
  {
    name: "Compare mode",
    handle: "@/search",
    body: "Semantic finally surfaces the budget Chromebook for “affordable notebook” — keyword never got close.",
    mark: "budget Chromebook",
    href: "/signin",
  },
  {
    name: "RRF fusion",
    handle: "@α=0.55",
    body: "Blending keyword and semantic landed the best of both worlds — the α slider is the whole story.",
    mark: "best of both worlds",
    href: "/#features",
  },
  {
    name: "pgvector",
    handle: "@cosine",
    body: "384-d bge-small vectors with sub-ms kNN over the full catalog on an HNSW index.",
    mark: "sub-ms kNN",
    href: "/#features",
  },
  {
    name: "Elasticsearch",
    handle: "@bm25",
    body: "An honest lexical baseline, with tsvector fallback the moment ES is unreachable.",
    mark: "tsvector fallback",
    href: "/#products",
  },
  {
    name: "Admin",
    handle: "@/admin",
    body: "68% of clicks in the last 24h came from the hybrid path — the telemetry proves it.",
    mark: "68% of clicks",
    href: "/admin",
  },
];

function markGreen(body: string, mark: string) {
  const parts = body.split(mark);
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <span key={i} className="font-medium text-v2-accent-green">
            {mark}
          </span>,
          part,
        ]
  );
}

export function QuoteGrid() {
  return (
    <div className="v2-bleed v2-grid-6">
      {QUOTES.map((q) => (
        <div key={q.name} className="v2-cell flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center border border-v2-border bg-v2-tint-strong font-mono text-xs font-semibold text-v2-text-muted">
                {q.name[0]}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{q.name}</div>
                <div className="font-mono text-[11px] text-v2-text-muted">{q.handle}</div>
              </div>
            </div>
            <Link
              href={q.href}
              aria-label={`Explore ${q.name}`}
              className="text-v2-accent-green transition-opacity hover:opacity-70"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <p className="text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.85 }}>
            {markGreen(q.body, q.mark)}
          </p>
        </div>
      ))}
    </div>
  );
}

