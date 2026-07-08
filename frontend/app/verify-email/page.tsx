"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";

export default function VerifyEmail() {
  const router = useRouter();
  const [preauth, setPreauth] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const pre = sessionStorage.getItem("preauth");
    if (!pre) {
      router.replace("/signin");
      return;
    }
    setPreauth(pre);
    setEmail(sessionStorage.getItem("verifyEmail") || "");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preauth) return;
    setError("");
    setNotice("");
    setBusy(true);
    const { ok, data } = await api("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ preauth, code }),
    });
    setBusy(false);
    if (!ok) {
      setError(apiError(data, "Verification failed."));
      return;
    }
    // Verified — carry the new setup preauth into the 2FA step.
    sessionStorage.setItem("preauth", data.preauth);
    sessionStorage.setItem("flow", "setup");
    sessionStorage.removeItem("verifyEmail");
    router.push("/twofa");
  }

  async function resend() {
    if (!preauth) return;
    setError("");
    setNotice("");
    setResending(true);
    const { ok, data } = await api("/auth/verify-email/resend", {
      method: "POST",
      body: JSON.stringify({ preauth }),
    });
    setResending(false);
    if (!ok) {
      setError(apiError(data, "Could not resend the code."));
      return;
    }
    setNotice("A new code is on its way. Check your inbox.");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Verify your email</h2>
        <p className="hint">
          We sent a 6-digit code to{" "}
          <strong>{email || "your email"}</strong>. Enter it below to finish
          creating your account.
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label>
            6-digit code
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="hint">{notice}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "…" : "Verify email"}
          </button>
        </form>
        <button
          className="btn btn-link"
          onClick={resend}
          disabled={resending}
          style={{ marginTop: 12 }}
        >
          {resending ? "Sending…" : "Didn’t get it? Resend code"}
        </button>
      </div>
    </div>
  );
}
