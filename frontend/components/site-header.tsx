"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Session } from "@/lib/api";
import { Button } from "@/components/ui/button";

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-[15px] font-bold shadow-sm">
        S
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Semvex</span>
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          {!authed && (
            <nav className="hidden items-center gap-6 md:flex">
              <a href="/#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                How it works
              </a>
              <a href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Features
              </a>
              <a href="/#metrics" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Benchmarks
              </a>
            </nav>
          )}
          {authed && (
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/search" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Search
              </Link>
              <Link href="/account" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Account
              </Link>
              {session?.is_admin && (
                <Link href="/admin" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {authed ? (
            <>
              <span className="hidden rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground sm:inline">
                {session?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/signin" className="hidden sm:block">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signin">
                <Button size="sm">Try the demo</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
