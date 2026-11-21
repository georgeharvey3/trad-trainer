import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { AlertIcon, MailIcon } from "../components/Icons";

type Mode = "signin" | "signup";

/** Plain-words versions of the auth errors people actually hit. */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don’t match. Check them and try again.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first: open the link we sent you, then sign in.";
  if (/already registered/i.test(message)) return "There’s already an account with that email. Sign in instead.";
  return message || "Something went wrong. Try again.";
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setSentTo(email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : ""));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="auth">
        <div className="wordmark">Trad Trainer</div>
        <div className="auth-rule" />
        <div className="stack center gap-sm" style={{ alignItems: "center", marginTop: 64 }}>
          <span style={{ color: "var(--color-accent)" }}>
            <MailIcon />
          </span>
          <h1 className="h2 mt-xs">Check your email</h1>
          <p className="lede" style={{ maxWidth: 300 }}>
            We sent a link to <b className="strong">{sentTo}</b>. Tap it to confirm your account, then come back and sign in.
          </p>
        </div>
        <div className="stack gap-sm mt-xl">
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={() => {
              setSentTo(null);
              setMode("signin");
            }}
          >
            Back to sign in
          </button>
          <button
            className="btn btn-quiet btn-block"
            onClick={() => {
              setSentTo(null);
              setMode("signup");
              setEmail("");
            }}
          >
            Wrong address? Start again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="wordmark">Trad Trainer</div>
      <div className="auth-rule" />
      <p className="lede mt-md">
        {mode === "signin"
          ? "Keep your tunes in your fingers. A little practice each day, a little faster each week."
          : "Make an account so your tunes and takes follow you to every device."}
      </p>
      <form className="stack gap-md mt-xl" onSubmit={onSubmit} noValidate={false}>
        {error && (
          <div className="banner error" role="alert">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="auth-pw">
            Password
          </label>
          <div className="pw-wrap">
            <input
              id="auth-pw"
              className="input"
              type={showPw ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              disabled={busy}
              aria-invalid={!!error && mode === "signin"}
              aria-describedby={mode === "signup" ? "auth-pw-hint" : undefined}
            />
            <button type="button" className="btn btn-text btn-sm" onClick={() => setShowPw(!showPw)} aria-pressed={showPw}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {mode === "signup" && (
            <span id="auth-pw-hint" className="hint" style={password.length >= 6 ? { color: "var(--color-good)" } : undefined}>
              At least 6 characters
            </span>
          )}
        </div>
        <button className="btn btn-primary btn-block btn-lg mt-xs" type="submit" disabled={busy} aria-busy={busy}>
          {busy && <span className="spinner" />}
          {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <div className="stack center gap-2xs push" style={{ borderTop: "1px solid var(--color-rule)", paddingTop: 18, marginTop: 40 }}>
        <span className="small">{mode === "signin" ? "New here?" : "Already have an account?"}</span>
        <button
          className="btn btn-text"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
