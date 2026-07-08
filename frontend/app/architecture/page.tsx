import type { Metadata } from "next";
import { FrameContainer, FrameSection, SectionEyebrow } from "@/components/frame";
import { PageHero, CtaBand, PageSectionHead } from "@/components/page-kit";

export const metadata: Metadata = {
  title: "Architecture — Semvex",
  description:
    "Postgres + pgvector, Elasticsearch BM25, HuggingFace embeddings, and a streaming ESCI ingest pipeline — env-driven and Dockerized.",
};

const FLOW = [
  { n: "01", label: "Ingest", body: "ESCI parquet streams via pyarrow in 50k-row batches — low memory, resumable." },
  { n: "02", label: "Embed", body: "bge-small-en-v1.5 produces 384-d vectors; HF Inference API at query time." },
  { n: "03", label: "Index", body: "Vectors upsert to pgvector (HNSW); BM25 docs bulk-index into Elasticsearch." },
  { n: "04", label: "Serve", body: "FastAPI runs all three engines, fuses with RRF, and returns ranked results." },
];

const LAYERS = [
  { label: "Storage", body: "Postgres on Neon with the pgvector extension auto-created on first connect — vectors and app data in one place." },
  { label: "Keyword engine", body: "Elasticsearch BM25 with a Postgres tsvector fallback, so search never hard-fails when ES is down." },
  { label: "Embeddings", body: "A pluggable Embedder (auto | local | hf | hashing) — bge-small by default, hashing fallback with no model installed." },
  { label: "API + web", body: "FastAPI proxied same-origin behind Next.js, so the httponly session cookie and OAuth callback stay on one origin." },
  { label: "Ingestion", body: "A streaming, idempotent, resumable pipeline that keeps pgvector and Elasticsearch in sync from one command." },
  { label: "Security", body: "Signed session cookies, TOTP 2FA, backup codes, Google OAuth, rate limiting, and email verification." },
];

const DEPLOY = [
  { label: "Local", tag: "docker-compose up", body: "Postgres, Elasticsearch, and the API come up together — one command, no cloud account." },
  { label: "Managed DB", tag: "Neon", body: "Point DATABASE_URL at Neon; the pgvector extension is created automatically on first connect." },
  { label: "VPS", tag: "4 GB target", body: "Neon for vectors, self-hosted Elasticsearch, and HF query embeddings — runs comfortably on a small box." },
];

export default function ArchitecturePage() {
  return (
    <main className="v2-page">
      <PageHero
        eyebrow="Architecture"
        title="The stack behind Semvex."
        highlight="the stack"
        sub="Postgres + pgvector, Elasticsearch, and HuggingFace embeddings — every piece env-driven, Dockerized, and swappable."
      />

      {/* Data flow */}
      <FrameSection tinted hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <SectionEyebrow align="left">Data flow</SectionEyebrow>
          <h2 className="text-balance max-w-2xl text-display font-medium leading-tight">
            From parquet to ranked results
          </h2>
          <div className="v2-bleed v2-grid-4 v2-grid--flush mt-12 md:mt-14">
            {FLOW.map((s) => (
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

      {/* Layers */}
      <FrameSection hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <PageSectionHead eyebrow="The pieces" title="Every layer, and why it's there" />
          <div className="v2-bleed v2-grid-6 mt-12 md:mt-14">
            {LAYERS.map((l) => (
              <div key={l.label} className="v2-cell">
                <p className="font-mono text-[11px] uppercase tracking-wider text-v2-text-muted">
                  {l.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                  {l.body}
                </p>
              </div>
            ))}
          </div>
        </FrameContainer>
      </FrameSection>

      {/* Deployment targets */}
      <FrameSection tinted hairline="both">
        <FrameContainer className="py-16 md:py-24">
          <PageSectionHead
            eyebrow="Deployment"
            title="Runs where you run"
            sub="The same env-driven config scales from a laptop to a small VPS."
          />
          <div className="v2-bleed v2-grid-3 mt-12 md:mt-14">
            {DEPLOY.map((d) => (
              <div key={d.label} className="v2-cell">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{d.label}</h3>
                  <span className="border border-v2-border bg-v2-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-v2-text-muted">
                    {d.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </FrameContainer>
      </FrameSection>

      <CtaBand title="Deployable in an afternoon." sub="Clone, set the env, docker-compose up — Neon, Elasticsearch, and the API come up together." />
    </main>
  );
}
