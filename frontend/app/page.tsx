import Link from "next/link";

export default function Landing() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Semantic + keyword retrieval, side by side</p>
        <h1>
          Search that understands
          <br />
          <span className="grad">what shoppers mean.</span>
        </h1>
        <p className="lede">
          Keyword search matches strings. Semvex matches intent — so{" "}
          <em>“sports sneakers”</em> finds your running shoes and{" "}
          <em>“cheap gaming laptop”</em> understands budget and specs. Compare
          BM25, dense-vector, and hybrid ranking on one query.
        </p>
        <div className="hero-cta">
          <Link href="/signin" className="btn btn-primary">
            Try the demo →
          </Link>
          <a className="btn btn-ghost" href="#how">
            How it works
          </a>
        </div>
        <div className="hero-strip">
          <div>
            <b>3</b> retrieval modes
          </div>
          <div>
            <b>RRF</b> hybrid fusion
          </div>
          <div>
            <b>2FA</b> secured access
          </div>
        </div>
      </section>

      <section className="features" id="how">
        <article className="feature">
          <div className="feature-ic">⌨️</div>
          <h3>Keyword (BM25)</h3>
          <p>
            A real lexical baseline over title, brand, category and description —
            the honest strawman to beat.
          </p>
        </article>
        <article className="feature">
          <div className="feature-ic">🧭</div>
          <h3>Semantic</h3>
          <p>
            Dense embeddings (bge-small when installed) rank by meaning, catching
            synonyms and intent keywords miss.
          </p>
        </article>
        <article className="feature">
          <div className="feature-ic">⚖️</div>
          <h3>Hybrid</h3>
          <p>
            Reciprocal Rank Fusion blends both rankings, usually landing the best
            relevance of the three.
          </p>
        </article>
      </section>
    </main>
  );
}
