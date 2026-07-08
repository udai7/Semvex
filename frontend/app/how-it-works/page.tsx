import type { Metadata } from "next";
import { Search, Sparkles, Scale } from "lucide-react";
import { FrameContainer, FrameSection, SectionEyebrow } from "@/components/frame";
import { PageHero, CtaBand, PageSectionHead } from "@/components/page-kit";

export const metadata: Metadata = {
  title: "How it works — Semvex",
  description:
    "Keyword (BM25), dense-vector (pgvector), and hybrid (RRF) retrieval, explained — three ways to rank the same query.",
};

const MODES = [
  {
    icon: Search,
    name: "Keyword",
    tag: "BM25 · Elasticsearch",
    body: "Ranks by literal term overlap across title, brand, category and description. Fast, transparent, and the honest strawman every semantic system has to beat.",
    lime: false,
  },
  {
    icon: Sparkles,
    name: "Semantic",
    tag: "dense vector · pgvector",
    body: "Embeds the query with bge-small and ranks by cosine similarity — so “affordable notebook” finds the budget Chromebook that shares no keywords.",
    lime: true,
  },
  {
    icon: Scale,
    name: "Hybrid",
    tag: "reciprocal rank fusion",
    body: "Fuses both rankings with RRF under a tunable α. It recovers the literal match and the intent match — usually the best relevance of the three.",
    lime: false,
  },
];

// Worked example rows: how each engine treats the same query.
const EXAMPLE = [
  ["Top result", "Gamer Pro 17", "Budget Chromebook", "Gamer Pro 17"],
  ["Reads “cheap”?", "No — literal terms only", "Yes — as budget intent", "Yes"],
  ["Typical miss", "Budget / value picks", "The exact model asked for", "—"],
  ["Best for", "Exact names & SKUs", "Synonyms & paraphrases", "General shopper queries"],
];

const PIPELINE = [
  { n: "01", label: "Parse the query", body: "Natural-language price filters are pulled out (“laptop under 300”) before retrieval runs." },
  { n: "02", label: "Run three engines", body: "Keyword, semantic, and hybrid execute in parallel on every search." },
  { n: "03", label: "Fuse & rerank", body: "RRF blends rankings; an optional cross-encoder refines the top candidates." },
  { n: "04", label: "Score & diversify", body: "MMR suppresses near-duplicates; NDCG/Recall/MRR are computed on labeled queries." },
];

export default function HowItWorksPage() {
  return (
    <main className="v2-page">
      <PageHero
        eyebrow="How it works"
        title="Three ways to rank the same query."
        highlight="same query"
        sub="Every search runs keyword, semantic, and hybrid retrieval side by side — so the difference between matching strings and matching meaning is impossible to miss."
      />

      {/* Modes */}
      <FrameSection tinted hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <PageSectionHead
            eyebrow="Retrieval modes"
            title="One query, three rankings"
            sub="Each path has a real engine behind it — no hand-waving."
          />
          <div className="v2-bleed v2-grid-3 mt-12 md:mt-14">
            {MODES.map((m, i) => (
              <div key={m.name} className="v2-cell">
                <span className="font-mono text-xs text-v2-text-muted">0{i + 1}</span>
                <div className={`v2-icon-tile mt-4 ${m.lime ? "v2-icon-tile--lime" : ""}`}>
                  <m.icon className="size-5 text-v2-text" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-tight">{m.name}</h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-v2-text-muted">
                  {m.tag}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Worked example table */}
      <FrameSection hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <SectionEyebrow align="left">Worked example</SectionEyebrow>
          <h2 className="text-balance max-w-2xl text-display font-medium leading-tight">
            “cheap gaming laptop”, three ways
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
            Keyword nails the literal match but misses the value picks. Semantic reads the
            intent but drops the exact model. Hybrid keeps both.
          </p>

          <div className="v2-bleed mt-12 overflow-x-auto border-t border-v2-border md:mt-14">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-v2-border">
                  <th className="p-4 text-left font-mono text-[11px] uppercase tracking-wider text-v2-text-muted" />
                  <th className="p-4 text-left font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">Keyword</th>
                  <th className="p-4 text-left font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">Semantic</th>
                  <th className="p-4 text-left font-mono text-[11px] uppercase tracking-wider text-v2-text">
                    Hybrid
                    <span className="ml-2 bg-v2-volt px-1.5 py-0.5 text-[9px] font-semibold">BEST</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE.map((row) => (
                  <tr key={row[0]} className="border-b border-v2-border">
                    <td className="p-4 font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">{row[0]}</td>
                    <td className="p-4 text-v2-text-subtle">{row[1]}</td>
                    <td className="p-4 text-v2-text-subtle">{row[2]}</td>
                    <td className="p-4 font-medium text-v2-text">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Pipeline */}
      <FrameSection tinted hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <SectionEyebrow align="left">The request path</SectionEyebrow>
          <h2 className="text-balance max-w-2xl text-display font-medium leading-tight">
            What happens on every search
          </h2>
          <div className="v2-bleed v2-grid-4 v2-grid--flush mt-12 md:mt-14">
            {PIPELINE.map((s) => (
              <div key={s.n} className="v2-cell">
                <span className="font-mono text-xs text-v2-text-muted">{s.n}</span>
                <h3 className="mt-3 font-semibold">{s.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </FrameContainer>
      </FrameSection>

      <CtaBand title="Watch the three paths race." sub="Run any query in the demo and compare keyword, semantic, and hybrid side by side." />
    </main>
  );
}
