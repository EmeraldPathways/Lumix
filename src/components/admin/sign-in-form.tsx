"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AdminSignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      const result = mode === "sign-in"
        ? await authClient.signIn.email({ email, password, callbackURL: "/admin" })
        : await authClient.signUp.email({ name, email, password, callbackURL: "/admin" });
      if (result.error) {
        setError(mode === "create"
          ? "Account creation is limited to administrator emails already authorized on the server. Check the address and ask the project owner to add it if needed."
          : "Sign in failed. Check the email and password, then try again.");
      } else {
        setMessage(mode === "create" ? "Administrator account created. Opening the dashboard…" : "Signed in. Opening the dashboard…");
        router.replace("/admin");
        router.refresh();
      }
    } catch {
      setError("Authentication is not configured or is temporarily unavailable. Check the server environment and try again.");
    } finally { setBusy(false); }
  }

  return <div className="admin-auth-form-wrap">
    <div className="admin-auth-tabs" role="tablist" aria-label="Administrator authentication">
      <button type="button" role="tab" aria-selected={mode === "sign-in"} className={mode === "sign-in" ? "active" : ""} onClick={() => { setMode("sign-in"); setError(""); setMessage(""); }}>Sign in</button>
      <button type="button" role="tab" aria-selected={mode === "create"} className={mode === "create" ? "active" : ""} onClick={() => { setMode("create"); setError(""); setMessage(""); }}>Create authorized account</button>
    </div>
    <form className="admin-auth-form" onSubmit={submit}>
      {mode === "create" && <label className="admin-form-field"><span>Name</span><input required autoComplete="name" value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={80} /></label>}
      <label className="admin-form-field"><span>Email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} maxLength={254} /></label>
      <label className="admin-form-field"><span>Password · 12 characters minimum</span><input required type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.currentTarget.value)} minLength={12} maxLength={128} /></label>
      <button type="submit" className="button button-dark" disabled={busy}>{busy ? "Please wait…" : mode === "create" ? "Create account" : "Sign in"}</button>
      {message && <p className="admin-feedback success-feedback" role="status">{message}</p>}
      {error && <p className="admin-feedback error-feedback" role="alert">{error}</p>}
    </form>
    <p className="admin-auth-note">No public accounts are available. New identities are accepted only when their email has been added to the server-side administrator allowlist.</p>
  </div>;
}
