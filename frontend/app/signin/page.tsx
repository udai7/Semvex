"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Mode = "signin" | "signup";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
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

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!agree) {
        setError("You must agree to the Terms and Privacy Policy.");
        return;
      }
    }

    setBusy(true);
    const path = mode === "signup" ? "/auth/signup" : "/auth/login";
    const body =
      mode === "signup"
        ? {
            first_name: firstName,
            last_name: lastName,
            phone,
            email,
            password,
            confirm_password: confirmPassword,
            agree_terms: agree,
          }
        : { email, password };
    const { ok, data } = await api(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    sessionStorage.setItem("preauth", data.preauth);
    if (data.next === "verify_email") {
      sessionStorage.setItem("verifyEmail", data.email || email);
      router.push("/verify-email");
      return;
    }
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
          {mode === "signup" && (
            <>
              <div className="grid2">
                <label>
                  First name
                  <input
                    type="text"
                    required
                    autoComplete="given-name"
                    placeholder="Ada"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label>
                  Last name
                  <input
                    type="text"
                    required
                    autoComplete="family-name"
                    placeholder="Lovelace"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Phone number
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
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
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mode === "signup" && (
            <>
              <label>
                Confirm password
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I agree to the Terms and Privacy Policy.
                </span>
              </label>
              <p className="hint">
                Minimum 8 characters. We’ll email you a 6-digit code to verify
                your address, then you’ll set up 2-step verification.
              </p>
            </>
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
