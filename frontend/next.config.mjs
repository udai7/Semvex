/** @type {import('next').NextConfig} */
const API = process.env.SEMVEX_API_URL || "http://localhost:8000";

// Proxy the FastAPI ranking service through Next so the browser talks to a
// single origin — keeps the httponly session cookie same-origin and lets the
// Google OAuth callback (/auth/google/callback) land back on the frontend.
const nextConfig = {
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${API}/auth/:path*` },
      { source: "/search/:path*", destination: `${API}/search/:path*` },
      { source: "/me/:path*", destination: `${API}/me/:path*` },
      { source: "/admin/:path*", destination: `${API}/admin/:path*` },
      { source: "/eval/:path*", destination: `${API}/eval/:path*` },
      { source: "/suggest", destination: `${API}/suggest` },
      { source: "/facets", destination: `${API}/facets` },
      { source: "/browse", destination: `${API}/browse` },
      { source: "/feedback", destination: `${API}/feedback` },
      { source: "/click", destination: `${API}/click` },
      // NOTE: /product/:sku is proxied to the API; the UI page lives at
      // /product/[sku] but Next serves the page and only rewrites the API shape
      // below via an explicit prefix to avoid clashing with the page route.
      { source: "/api/product/:sku", destination: `${API}/product/:sku` },
      { source: "/health", destination: `${API}/health` },
      { source: "/config", destination: `${API}/config` },
    ];
  },
};

export default nextConfig;
