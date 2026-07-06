// Thin client for the FastAPI ranking service (proxied same-origin via rewrites).

export type ApiResult<T = any> = { ok: boolean; status: number; data: T };

export async function api<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...opts,
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  return { ok: res.ok, status: res.status, data };
}

export type Product = {
  sku: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  description: string;
  score: number;
};

export type Session = {
  authenticated: boolean;
  email?: string;
  provider?: string;
  is_admin?: boolean;
};

export type Metric = { recall: number; mrr: number; ndcg: number };
export type LiveMetrics = Record<"keyword" | "semantic" | "hybrid", Metric>;

// Deterministic emoji + gradient per category/brand so cards have a visual
// without shipping real product images (placeholder, swap for a CDN later).
const CATEGORY_EMOJI: Record<string, string> = {
  Electronics: "💻",
  Shoes: "👟",
};
export function thumbEmoji(p: { category: string; title: string }): string {
  const t = p.title.toLowerCase();
  if (t.includes("headphone") || t.includes("earbud") || t.includes("earphone")) return "🎧";
  if (t.includes("camera") || t.includes("vlog")) return "📷";
  if (t.includes("watch") || t.includes("band")) return "⌚";
  if (t.includes("boot")) return "🥾";
  if (t.includes("sandal") || t.includes("slide") || t.includes("flip")) return "🩴";
  if (t.includes("keyboard")) return "⌨️";
  if (t.includes("mouse")) return "🖱️";
  if (t.includes("speaker")) return "🔊";
  if (t.includes("monitor")) return "🖥️";
  if (t.includes("tablet")) return "📱";
  return CATEGORY_EMOJI[p.category] || "📦";
}
export function thumbGradient(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 45% 22%), hsl(${(h + 40) % 360} 45% 14%))`;
}

export type CompareResponse = {
  query: string;
  embed_mode: string;
  keyword: Product[];
  semantic: Product[];
  hybrid: Product[];
};

export type SearchMode = "compare" | "keyword" | "semantic" | "hybrid";
