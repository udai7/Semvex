"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { FrameHairline } from "@/components/frame";
import { Button } from "@/components/ui/button";
import { api, Session } from "@/lib/api";

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Semvex home">
      <span className="grid size-7 place-items-center bg-v2-text text-xs font-bold text-v2-bg">
        S
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-v2-text">Semvex</span>
    </Link>
  );
}

export default function SiteHeader() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function refresh() {
    const { data } = await api<Session>("/auth/me");
    setSession(data);
  }

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function signOut() {
    await api("/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  }

  const authed = session?.authenticated;

  const navLinks = [
    { href: "/features", label: "Features" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/benchmarks", label: "Benchmarks" },
    ...(authed
      ? [
          { href: "/search", label: "Search" },
          { href: "/account", label: "Account" },
          ...(session?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-v2-bg">
      <FrameHairline position="bottom" />

      <div className="relative mx-auto h-14 max-w-v2 v2-container-padded">
        <div className="flex h-full items-center justify-between">
          {/* Left: Logo + desktop nav */}
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-stretch gap-8 md:flex" aria-label="Site links">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex h-14 items-center text-sm text-v2-text-subtle transition-colors duration-150 hover:text-v2-text"
                >
                  {item.label}
                  <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-v2-text transition-transform duration-150 group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: action buttons (desktop) */}
          <div className="hidden items-center gap-3 md:flex">
            {authed ? (
              <>
                <a
                  href="https://github.com/udai7/Semvex"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Star the Repo
                  </Button>
                </a>
                <span className="hidden text-xs text-v2-text-muted lg:inline">{session?.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <a
                  href="https://github.com/udai7/Semvex"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Star the Repo
                  </Button>
                </a>
                <Link href="/signin">
                  <Button size="sm">Try the demo</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger toggle */}
          <button
            className="inline-flex items-center justify-center md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="border-t border-v2-border bg-v2-bg md:hidden">
          <nav className="mx-auto max-w-v2 v2-container-padded flex flex-col gap-1 py-4">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-v2-text-subtle transition-colors hover:bg-v2-tint-strong hover:text-v2-text"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-v2-border pt-4">
              <a
                href="https://github.com/udai7/Semvex"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="w-full">
                  Star the Repo
                </Button>
              </a>
              {authed ? (
                <>
                  <span className="text-xs text-v2-text-muted px-1">{session?.email}</span>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <Link href="/signin" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full">Try the demo</Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
