"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Product, thumbEmoji, thumbGradient } from "@/lib/api";

type Saved = { id: number; query: string; mode: string };

function ProductGrid({ items, empty }: { items: Product[]; empty: string }) {
  if (!items.length) return <p className="no-results">{empty}</p>;
  return (
    <div className="grid">
      {items.map((p) => (
        <Link key={p.sku} href={`/product/${p.sku}`} className="card" style={{ display: "block" }}>
          <div className="thumb" style={{ background: thumbGradient(p.sku) }}>{thumbEmoji(p)}</div>
          <p className="card-title">{p.title}</p>
          <p className="card-meta">{p.brand} · <span className="card-price">${p.price}</span></p>
        </Link>
      ))}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);

  async function load() {
    const [f, r, s] = await Promise.all([
      api<{ favorites: Product[] }>("/me/favorites"),
      api<{ recently_viewed: Product[] }>("/me/recently-viewed"),
      api<{ saved_searches: Saved[] }>("/me/saved-searches"),
    ]);
    setFavorites(f.data.favorites || []);
    setRecent(r.data.recently_viewed || []);
    setSaved(s.data.saved_searches || []);
  }

  useEffect(() => {
    api("/auth/me").then(({ data }) => {
      if (!data.authenticated) return router.replace("/signin");
      setEmail(data.email);
      setReady(true);
      load();
    });
  }, [router]);

  async function removeSaved(id: number) {
    await api(`/me/saved-searches/${id}`, { method: "DELETE" });
    setSaved(saved.filter((s) => s.id !== id));
  }

  if (!ready) return <div className="panel" />;

  return (
    <div className="panel">
      <h1>Your account</h1>
      <p className="sub">{email}</p>

      <section className="acct-section">
        <h3 className="section-title">Saved searches</h3>
        {saved.length ? (
          saved.map((s) => (
            <div key={s.id} className="saved-row">
              <Link href={`/search?q=${encodeURIComponent(s.query)}`}>
                {s.query} <span style={{ color: "var(--text-faint)" }}>· {s.mode}</span>
              </Link>
              <button className="chip" onClick={() => removeSaved(s.id)}>Remove</button>
            </div>
          ))
        ) : (
          <p className="no-results">No saved searches yet.</p>
        )}
      </section>

      <section className="acct-section">
        <h3 className="section-title">Favorites</h3>
        <ProductGrid items={favorites} empty="No favorites yet — tap the ♡ on any result." />
      </section>

      <section className="acct-section">
        <h3 className="section-title">Recently viewed</h3>
        <ProductGrid items={recent} empty="Nothing viewed yet." />
      </section>
    </div>
  );
}
