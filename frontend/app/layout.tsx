import type { Metadata } from "next";
import "./globals.css";
import TopBar from "./TopBar";

export const metadata: Metadata = {
  title: "Semvex — Semantic Product Search",
  description:
    "Semantic vs. keyword vs. hybrid product search. Search that understands what shoppers mean.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔎</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        {children}
        <footer className="footer">
          Semvex · semantic product search demo · BM25 vs dense-vector vs hybrid (RRF)
        </footer>
      </body>
    </html>
  );
}
