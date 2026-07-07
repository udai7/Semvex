import Link from "next/link";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Search demo", href: "/signin" },
      { label: "How it works", href: "/#how" },
      { label: "Benchmarks", href: "/#metrics" },
    ],
  },
  {
    title: "Engine",
    links: [
      { label: "Semantic (pgvector)", href: "/#features" },
      { label: "Keyword (BM25 / ES)", href: "/#features" },
      { label: "Hybrid (RRF)", href: "/#features" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Architecture", href: "/#how" },
      { label: "Admin analytics", href: "/admin" },
      { label: "Account", href: "/account" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border">
      <div className="bg-dots absolute inset-0 opacity-[0.5] mask-fade-b" aria-hidden />
      <div className="container relative grid grid-cols-2 gap-10 py-16 md:grid-cols-5">
        <div className="col-span-2 md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-[15px] font-bold">
              S
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Semvex</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Semantic product search that ranks by meaning — keyword, dense-vector,
            and hybrid retrieval compared on a single query.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {col.title}
            </h4>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container relative flex flex-col items-start justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <span>© {new Date().getFullYear()} Semvex — semantic product search.</span>
        <span className="font-mono">BM25 · dense-vector · hybrid (RRF)</span>
      </div>
    </footer>
  );
}
