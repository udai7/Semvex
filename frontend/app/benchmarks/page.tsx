import type { Metadata } from "next";
import { FrameContainer, FrameSection, SectionEyebrow } from "@/components/frame";
import { PageHero, CtaBand, PageSectionHead } from "@/components/page-kit";

export const metadata: Metadata = {
  title: "Benchmarks — Semvex",
  description:
    "Offline NDCG/Recall/MRR from the eval harness on a curated, human-labeled catalog. Measured, not asserted.",
};

const METRICS = [
  { k: "+34%", l: "NDCG@5 lift, hybrid vs keyword" },
  { k: "3", l: "retrieval modes, one query" },
  { k: "384-d", l: "bge-small embeddings" },
  { k: "<40ms", l: "query-time embed (cached vectors)" },
];

// Per-mode offline scores on the labeled set.
const RESULTS: { mode: string; ndcg: string; recall: string; mrr: string; win?: boolean }[] = [
  { mode: "Keyword (BM25)", ndcg: ".58", recall: ".66", mrr: ".61" },
  { mode: "Semantic (pgvector)", ndcg: ".71", recall: ".79", mrr: ".74" },
  { mode: "Hybrid (RRF)", ndcg: ".78", recall: ".84", mrr: ".79", win: true },
];

const METHOD = [
  { label: "Labeled query set", body: "A curated set of shopper queries with human relevance judgments over the electronics + shoes catalog." },
  { label: "Offline harness", body: "NDCG@5, Recall@10, and MRR computed per mode — the same numbers that drive the live overlay in the UI." },
  { label: "Honest baseline", body: "BM25 over Elasticsearch is the strawman. A win only counts if it beats a real lexical engine, not a toy one." },
  { label: "Reproducible", body: "17 pytest tests, deterministic scoring, and a fixed catalog so runs are comparable across changes." },
];

export default function BenchmarksPage() {
  return (
    <main className="v2-page">
      <PageHero
        eyebrow="Benchmarks"
        title="Measured, not asserted."
        highlight="Measured"
        sub="Every claim on this site traces back to the offline eval harness — labeled queries, human relevance, and per-mode scores you can reproduce."
      />

      {/* Per-mode results table */}
      <FrameSection hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <SectionEyebrow align="left">Results</SectionEyebrow>
          <h2 className="text-balance max-w-2xl text-display font-medium leading-tight">
            Offline scores by retrieval mode
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
            Higher is better across all three metrics. Hybrid wins on every column.
          </p>

          <div className="v2-bleed mt-12 overflow-x-auto border-t border-v2-border md:mt-14">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-v2-border">
                  <th className="p-4 text-left font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">Mode</th>
                  <th className="p-4 text-right font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">NDCG@5</th>
                  <th className="p-4 text-right font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">Recall@10</th>
                  <th className="p-4 text-right font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">MRR</th>
                </tr>
              </thead>
              <tbody>
                {RESULTS.map((r) => (
                  <tr
                    key={r.mode}
                    className="border-b border-v2-border"
                    style={r.win ? { background: "color-mix(in srgb, var(--v2-color-volt) 10%, white)" } : undefined}
                  >
                    <td className="p-4">
                      <span className={r.win ? "font-semibold text-v2-text" : "text-v2-text-subtle"}>{r.mode}</span>
                      {r.win && <span className="ml-2 bg-v2-volt px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase">Best</span>}
                    </td>
                    <td className="p-4 text-right font-mono tabular-nums">{r.ndcg}</td>
                    <td className="p-4 text-right font-mono tabular-nums">{r.recall}</td>
                    <td className="p-4 text-right font-mono tabular-nums">{r.mrr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Headline metrics */}
      <FrameSection tinted hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <PageSectionHead
            eyebrow="Headline numbers"
            title="At a glance"
            sub="The signals that summarize the run."
          />
          <div className="v2-bleed v2-grid-4 v2-grid--flush mt-12 md:mt-14">
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

      {/* Methodology */}
      <FrameSection hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.4fr_0.6fr] md:gap-14">
            <div className="md:sticky md:top-24 md:self-start">
              <SectionEyebrow align="left">Methodology</SectionEyebrow>
              <h2 className="text-balance text-display font-medium leading-tight">
                How the numbers are made
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                No cherry-picked screenshots — a fixed catalog, labeled queries, and a
                deterministic scorer.
              </p>
            </div>
            <div className="border-t border-v2-border">
              {METHOD.map((m) => (
                <div key={m.label} className="border-b border-v2-border py-6 md:py-7">
                  <h3 className="flex items-baseline gap-3 text-base font-semibold md:text-lg">
                    <span className="mt-0.5 shrink-0 bg-v2-accent-green" style={{ width: "1.7px", height: "13.5px" }} />
                    {m.label}
                  </h3>
                  <p className="mt-2 pl-[calc(0.75rem+1.7px)] text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.78 }}>
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FrameContainer>
      </FrameSection>

      <CtaBand title="See the numbers move live." sub="Run a labeled query and watch NDCG / Recall / MRR update per mode." />
    </main>
  );
}
