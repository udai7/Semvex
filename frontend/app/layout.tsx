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

export const metadata: Metadata = {
  title: "Semvex — Semantic Product Search",
  description:
    "Search that understands what shoppers mean. Compare keyword (BM25), dense-vector, and hybrid (RRF) retrieval side by side.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔎</text></svg>",
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
