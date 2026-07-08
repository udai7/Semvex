import Link from "next/link";
import { FrameContainer, FrameSection } from "@/components/frame";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Benchmarks", href: "/benchmarks" },
      { label: "Search demo", href: "/signin" },
    ],
  },
  {
    title: "Engine",
    links: [
      { label: "Semantic (pgvector)", href: "/how-it-works" },
      { label: "Keyword (BM25 / ES)", href: "/how-it-works" },
      { label: "Hybrid (RRF)", href: "/how-it-works" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Architecture", href: "/architecture" },
      { label: "Admin analytics", href: "/admin" },
      { label: "Account", href: "/account" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <FrameSection tinted hairline="top">
      <FrameContainer className="grid grid-cols-2 gap-10 py-14 md:grid-cols-5 md:py-16">
        <div className="col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center bg-v2-text text-xs font-bold text-v2-bg">
              S
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Semvex</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-v2-text-subtle" style={{ opacity: 0.72 }}>
            Semantic product search that ranks by meaning — keyword, dense-vector,
            and hybrid retrieval compared on a single query.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 font-mono text-xs uppercase tracking-wider text-v2-text-muted">
              {col.title}
            </h4>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-v2-text-subtle transition-colors hover:text-v2-text"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </FrameContainer>

      <div className="border-t border-v2-border">
        <FrameContainer className="flex flex-col items-start justify-between gap-3 py-6 text-xs text-v2-text-muted sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Semvex — semantic product search.</span>
          <span className="font-mono">BM25 · dense-vector · hybrid (RRF)</span>
        </FrameContainer>
      </div>
    </FrameSection>
  );
}
