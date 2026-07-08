"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";

export default function TwoFactor() {
  const router = useRouter();
  const [flow, setFlow] = useState<"setup" | "verify" | null>(null);
  const [preauth, setPreauth] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // Send the user back to where they were headed before hitting the auth gate.
  function finishAuth() {
    const next = sessionStorage.getItem("postauth_next");
    sessionStorage.removeItem("postauth_next");
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/search";
    router.push(dest);
  }

  useEffect(() => {
    const pre = sessionStorage.getItem("preauth");
    const f = sessionStorage.getItem("flow") as "setup" | "verify" | null;
    if (!pre || !f) {
      router.replace("/signin");
      return;
    }
    setPreauth(pre);
    setFlow(f);
    if (f === "setup") {
      api("/auth/totp/provision", {
        method: "POST",
        body: JSON.stringify({ preauth: pre }),
      }).then(({ ok, data }) => {
        if (!ok) setError(apiError(data, "Could not start 2FA setup."));
        else {
          setQrSvg(data.qr_svg);
          setSecret(data.secret);
        }
      });
    }
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preauth || !flow) return;
    setError("");
    setBusy(true);
    const path = flow === "setup" ? "/auth/totp/enable" : "/auth/totp/verify";
    const { ok, data } = await api(path, {
      method: "POST",
      body: JSON.stringify({ preauth, code }),
    });
    setBusy(false);
    if (!ok) {
      setError(apiError(data, "Verification failed."));
      return;
    }
    sessionStorage.removeItem("preauth");
    sessionStorage.removeItem("flow");
    // On first-time setup, show the one-time backup codes before continuing.
    if (flow === "setup" && data.backup_codes?.length) {
      setBackupCodes(data.backup_codes);
      return;
    }
    finishAuth();
  }

  if (backupCodes) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h2>Save your backup codes</h2>
          <p className="hint">
            Each code works once if you lose your authenticator. Store them
            somewhere safe — they won’t be shown again.
          </p>
          <div className="backup-codes">
            <div className="grid2">
              {backupCodes.map((c) => (
                <code key={c}>{c}</code>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={finishAuth}>
            I’ve saved them — continue
          </button>
        </div>
      </div>
    );
  }

  const codeField = (
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
  );

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {flow === "setup" ? (
          <>
            <h2>Set up 2-step verification</h2>
            <p className="hint">
              Scan this QR code with Google Authenticator, Authy, or any TOTP app.
            </p>
            <div
              className="qr-box"
              dangerouslySetInnerHTML={{ __html: qrSvg || "Loading…" }}
            />
            <p className="secret-line">
              Can’t scan? Enter this key manually:
              <br />
              <code>{secret || "—"}</code>
            </p>
            <form className="auth-form" onSubmit={submit}>
              {codeField}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "…" : "Verify & enable"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Two-step verification</h2>
            <p className="hint">Enter the 6-digit code from your authenticator app.</p>
            <form className="auth-form" onSubmit={submit}>
              {codeField}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "…" : "Verify"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
