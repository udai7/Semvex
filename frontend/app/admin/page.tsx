"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    api("/admin/analytics").then(({ status, data }) => {
      if (status === 401) return router.replace("/signin");
      if (status === 403) return setDenied(true);
      setData(data);
    });
  }, [router]);

  if (denied)
    return (
      <div className="panel">
        <h1>Analytics</h1>
        <p className="no-results">
          Admin access required. Set <code>SEMVEX_ADMIN_EMAILS</code> to include your account.
        </p>
      </div>
    );
  if (!data) return <div className="panel" />;

  const fmt = (n: number) => (typeof n === "number" ? n.toFixed(1) : n);

  return (
    <div className="panel">
      <h1>Analytics</h1>
      <p className="sub">Search usage, latency, and relevance signals.</p>

      <div className="stat-grid">
        <div className="stat">
          <div className="n">{data.total_queries}</div>
          <div className="l">Total queries</div>
        </div>
        <div className="stat">
          <div className="n">{data.zero_result_queries?.length || 0}</div>
          <div className="l">Zero-result queries</div>
        </div>
        <div className="stat">
          <div className="n">
            {data.clicks_by_mode?.reduce((a: number, c: any) => a + c.n, 0) || 0}
          </div>
          <div className="l">Result clicks</div>
        </div>
      </div>

      <h3 className="section-title">Top queries</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Query</th><th>Count</th></tr></thead>
          <tbody>
            {(data.top_queries || []).map((r: any) => (
              <tr key={r.query}><td>{r.query}</td><td>{r.n}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Latency by mode</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Mode</th><th>Avg ms</th><th>Max ms</th><th>Queries</th></tr></thead>
          <tbody>
            {(data.latency_by_mode || []).map((r: any) => (
              <tr key={r.mode}>
                <td>{r.mode}</td><td>{fmt(r.avg_ms)}</td><td>{fmt(r.max_ms)}</td><td>{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Clicks &amp; feedback by mode</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Mode</th><th>Clicks</th><th>👍</th><th>👎</th></tr></thead>
          <tbody>
            {["keyword", "semantic", "hybrid"].map((m) => {
              const clk = (data.clicks_by_mode || []).find((c: any) => c.mode === m);
              const fb = (data.feedback_by_mode || []).find((c: any) => c.mode === m);
              return (
                <tr key={m}>
                  <td>{m}</td>
                  <td>{clk?.n || 0}</td>
                  <td>{fb?.up || 0}</td>
                  <td>{fb?.down || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.zero_result_queries?.length > 0 && (
        <>
          <h3 className="section-title">Zero-result queries (fix these)</h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Query</th><th>Count</th></tr></thead>
              <tbody>
                {data.zero_result_queries.map((r: any) => (
                  <tr key={r.query}><td>{r.query}</td><td>{r.n}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
