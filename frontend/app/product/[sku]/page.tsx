"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Product, thumbEmoji, thumbGradient } from "@/lib/api";

export default function ProductPage() {
  const router = useRouter();
  const { sku } = useParams<{ sku: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [fav, setFav] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api<{ product: Product; similar: Product[] }>(`/api/product/${sku}`).then(({ ok, status, data }) => {
      if (status === 401) return router.replace("/signin");
      if (!ok) return setNotFound(true);
      setProduct(data.product);
      setSimilar(data.similar);
    });
    api<{ favorites: Product[] }>("/me/favorites").then(({ data }) =>
      setFav((data.favorites || []).some((p) => p.sku === sku))
    );
  }, [sku, router]);

  async function toggleFav() {
    if (fav) await api(`/me/favorites/${sku}`, { method: "DELETE" });
    else await api("/me/favorites", { method: "POST", body: JSON.stringify({ sku }) });
    setFav(!fav);
  }

  if (notFound)
    return (
      <div className="product-page">
        <Link href="/search" className="back-link">← Back to search</Link>
        <p className="no-results">Product not found.</p>
      </div>
    );
  if (!product) return <div className="product-page" />;

  return (
    <div className="product-page">
      <Link href="/search" className="back-link">← Back to search</Link>
      <div className="product-hero">
        <div className="product-thumb" style={{ background: thumbGradient(product.sku) }}>
          {thumbEmoji(product)}
        </div>
        <div className="product-info">
          <h1>{product.title}</h1>
          <p className="meta">
            {product.brand} · {product.category} · SKU {product.sku}
          </p>
          <p style={{ color: "var(--text-dim)", maxWidth: 520 }}>{product.description}</p>
          <p className="price" style={{ margin: "16px 0" }}>${product.price}</p>
          <button className={`btn ${fav ? "btn-ghost" : "btn-primary"}`} onClick={toggleFav}>
            {fav ? "♥ Saved" : "♡ Save to favorites"}
          </button>
        </div>
      </div>

      <h3 className="section-title">Similar products (vector kNN)</h3>
      <div className="grid">
        {similar.map((s) => (
          <Link key={s.sku} href={`/product/${s.sku}`} className="card" style={{ display: "block" }}>
            <div className="thumb" style={{ background: thumbGradient(s.sku) }}>
              {thumbEmoji(s)}
            </div>
            <p className="card-title">{s.title}</p>
            <p className="card-meta">
              {s.brand} · <span className="card-price">${s.price}</span> ·{" "}
              <span className="card-score">{s.score}</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
