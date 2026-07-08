"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  return (
    <header className="sticky top-0 z-50 bg-v2-bg">
      <FrameHairline position="bottom" />

      <div
        className="relative mx-auto h-14 max-w-v2 v2-container-padded"
      >
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-stretch gap-8 lg:flex" aria-label="Site links">
              {[
                { href: "/features", label: "Features" },
                { href: "/how-it-works", label: "How it works" },
                { href: "/benchmarks", label: "Benchmarks" },
                { href: "/architecture", label: "Architecture" },
                ...(authed
                  ? [
                      { href: "/search", label: "Search" },
                      { href: "/account", label: "Account" },
                      ...(session?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
                    ]
                  : []),
              ].map((item) => (
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

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/udai7/Semvex"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block"
            >
              <Button variant="outline" size="sm">
                Star the Repo
              </Button>
            </a>

            {authed ? (
              <>
                <span className="hidden text-xs text-v2-text-muted sm:inline">{session?.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/signin" className="hidden sm:block">
                  <Button variant="outline" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signin">
                  <Button size="sm">Try the demo</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
