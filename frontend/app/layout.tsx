import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { FrameRails } from "@/components/frame";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import FooterSlot from "@/components/footer-slot";

// Primary grotesque (close free stand-in for Infisical's "Alliance No.2").
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Secondary monospace — Infisical uses JetBrains Mono for eyebrows, tags, numbers.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Set NEXT_PUBLIC_SITE_URL to your deployed origin in production so shared-link
// (OpenGraph/Twitter) image URLs resolve absolutely. Falls back to localhost in dev.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const OG_DESC =
  "Search that understands what shoppers mean — compare keyword (BM25), dense-vector, and hybrid (RRF) retrieval side by side on ~25k real products.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Semvex — Semantic Product Search",
  description: OG_DESC,
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Semvex",
    title: "Semvex — Semantic Product Search",
    description: OG_DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Semvex — Semantic Product Search" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Semvex — Semantic Product Search",
    description: OG_DESC,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <div className="relative min-h-screen bg-v2-bg">
          <FrameRails />
          <SiteHeader />
          {children}
          <FooterSlot>
            <SiteFooter />
          </FooterSlot>
        </div>
      </body>
    </html>
  );
}
