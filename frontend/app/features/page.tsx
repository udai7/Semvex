import type { Metadata } from "next";
import {
  SlidersHorizontal,
  Wand2,
  Filter,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FrameContainer, FrameSection, SectionEyebrow } from "@/components/frame";
import { PageHero, CtaBand, PageSectionHead } from "@/components/page-kit";

export const metadata: Metadata = {
  title: "Features — Semvex",
  description:
    "Tunable α blending, cross-encoder rerank, NL price filters, MMR diversity, live NDCG/Recall/MRR, and secured accounts.",
};

const FEATURES = [
  { icon: SlidersHorizontal, title: "Tunable α blending", body: "Slide keyword ↔ semantic weighting live and watch the ranking shift in real time." },
  { icon: Wand2, title: "Cross-encoder rerank", body: "Two-stage retrieval: a reranker refines the top candidates for precision where it counts." },
  { icon: Filter, title: "Natural-language filters", body: "“laptop under 300” parses the price constraint straight out of the query before retrieval." },
  { icon: BarChart3, title: "Live NDCG / Recall / MRR", body: "Labeled-query metrics overlaid in the UI — the winning path is starred, not asserted." },
  { icon: ShieldCheck, title: "Secured accounts", body: "Email verification, TOTP 2FA, backup codes, Google OAuth, and rate limiting." },
  { icon: Sparkles, title: "MMR diversity", body: "Suppress near-duplicate results so the top-k spans the catalog instead of one cluster." },
];

// Feature → the exact control that exposes it in the search UI.
const CONTROLS = [
  { control: "Mode tabs", maps: "Keyword · Semantic · Hybrid · Rerank · Compare", body: "Switch engines per query, or open Compare to see all three at once." },
  { control: "α slider", maps: "Tunable α blending", body: "Drag between keyword and semantic weighting; the ranking and metrics update live." },
  { control: "Rerank toggle", maps: "Cross-encoder rerank", body: "Flip on two-stage retrieval to refine the top candidates." },
  { control: "MMR toggle", maps: "Diversity", body: "Suppress near-duplicates so the top-k spans the catalog." },
  { control: "Query box", maps: "Natural-language filters", body: "Type “under 80” or “over 200” and the price constraint is parsed automatically." },
  { control: "Metrics overlay", maps: "NDCG / Recall / MRR", body: "Labeled queries surface live scores, with the winning mode starred." },
];

export default function FeaturesPage() {
  return (
    <main className="v2-page">
      <PageHero
        eyebrow="Features"
        title="Everything a production stack needs."
        highlight="production stack"
        sub="Not just a search box — a ranking lab. Tune the blend, rerank the top-k, parse filters from language, and watch the metrics move."
      />

      {/* Feature grid */}
      <FrameSection tinted hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <PageSectionHead
            eyebrow="Retrieval, done properly"
            title="Six things most demos skip"
            sub="Each one is wired to a real engine and visible in the search UI."
          />
          <div className="v2-bleed v2-grid-6 mt-12 md:mt-14">
            {FEATURES.map((f) => (
              <div key={f.title} className="v2-cell">
                <f.icon className="size-5 text-v2-text" strokeWidth={1.75} />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Where each lives in the UI */}
      <FrameSection hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.4fr_0.6fr] md:gap-14">
            <div className="md:sticky md:top-24 md:self-start">
              <SectionEyebrow align="left">In the search UI</SectionEyebrow>
              <h2 className="text-balance text-display font-medium leading-tight">
                Every feature is a control you can touch
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                Nothing is hidden behind a config file — the whole ranking stack is
                adjustable from the demo.
              </p>
            </div>
            <div className="border-t border-v2-border">
              {CONTROLS.map((c) => (
                <div key={c.control} className="flex flex-col gap-1 border-b border-v2-border py-6 md:flex-row md:items-baseline md:gap-6 md:py-7">
                  <div className="shrink-0 md:w-40">
                    <p className="font-semibold">{c.control}</p>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">
                      {c.maps}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.78 }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FrameContainer>
      </FrameSection>

      <CtaBand title="Put the features to work." sub="Run a query, slide α, toggle rerank — and watch the metrics respond live." />
    </main>
  );
}
