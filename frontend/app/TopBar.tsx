"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Session } from "@/lib/api";

export default function TopBar() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  async function refresh() {
    const { data } = await api<Session>("/auth/me");
    setSession(data);
  }

  useEffect(() => {
    refresh();
    // re-check when returning to the tab (e.g. after Google OAuth redirect)
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function signOut() {
    await api("/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">◈</span> Semvex
      </Link>
      <nav className="topbar-actions">
        {session?.authenticated ? (
          <>
            <Link href="/search" className="nav-link">
              Search
            </Link>
            <Link href="/account" className="nav-link">
              Account
            </Link>
            {session.is_admin && (
              <Link href="/admin" className="nav-link">
                Admin
              </Link>
            )}
            <span className="user-chip">{session.email}</span>
            <button className="btn btn-ghost" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <Link href="/signin" className="btn btn-ghost">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
