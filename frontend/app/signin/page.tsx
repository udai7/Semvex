"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Mode = "signin" | "signup";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/config").then(({ data }) => setGoogleEnabled(!!data.google_enabled));
    // Surface an error if we bounced back from a failed Google OAuth attempt.
    if (typeof window !== "undefined" && window.location.hash.startsWith("#error")) {
      setError("Google sign-in failed. Please try again.");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const path = mode === "signup" ? "/auth/signup" : "/auth/login";
    const { ok, data } = await api(path, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    sessionStorage.setItem("preauth", data.preauth);
    sessionStorage.setItem("flow", data.next === "totp" ? "verify" : "setup");
    router.push("/twofa");
  }

  function google() {
    if (!googleEnabled) {
      setError(
        "Google sign-in isn’t configured on this server — set GOOGLE_CLIENT_ID / SECRET to enable it. Use email + password below."
      );
      return;
    }
    window.location.href = "/auth/google/start";
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "signin" ? "is-active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "is-active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        <button className="btn btn-google" onClick={google}>
          <span className="g">G</span> Continue with Google
        </button>
        <div className="divider">
          <span>or</span>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mode === "signup" && (
            <p className="hint">
              Minimum 8 characters. You’ll set up 2-step verification next.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
