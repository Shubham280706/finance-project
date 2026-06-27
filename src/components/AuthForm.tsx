"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { LogoMark } from "./LogoMark";

type Mode = "signin" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = getSupabaseBrowser();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-paper text-ink">
      {/* brand panel */}
      <section className="hidden w-[clamp(384px,38%,520px)] shrink-0 flex-col bg-brand px-12 pb-10 pt-12 text-on-green lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-on-green text-brand">
            <LogoMark size={18} />
          </span>
          <span className="font-serif text-[22px] font-semibold tracking-[-0.01em] text-on-green-bright">
            FilingIQ
          </span>
        </div>
        <div className="my-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-on-green-mono">
            Document intelligence
          </div>
          <h1 className="mt-[18px] font-serif text-[clamp(34px,3.4vw,44px)] font-normal leading-[1.1] tracking-[-0.018em] text-on-green-bright">
            Chat with annual reports{" "}
            <span className="italic">and earnings calls.</span>
          </h1>
          <p className="mt-5 max-w-[340px] text-base leading-[1.62] text-on-green-muted">
            Upload a filing and ask questions in plain English — every answer
            cites the exact page it came from.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.04em] text-on-green-mono">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          SOC 2 Type II · Documents never trained on
        </div>
      </section>

      {/* form */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-paper">
              <LogoMark size={17} />
            </span>
            <span className="font-serif text-xl font-semibold tracking-[-0.01em]">
              FilingIQ
            </span>
          </div>

          <h2 className="font-serif text-[28px] tracking-[-0.01em] text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {mode === "signin"
              ? "Sign in to access your filings and ask questions."
              : "Sign up to upload filings and keep a private history."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-3">
            <Field
              type="email"
              placeholder="you@example.com"
              value={email}
              autoComplete="email"
              onChange={setEmail}
            />
            <Field
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              onChange={setPassword}
              minLength={6}
            />

            {error && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-[#c4d8cd] bg-brand-tint px-3 py-2 text-sm text-brand-dark">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-brand-dark disabled:opacity-50"
            >
              {busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-ink-soft">
            {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  type,
  placeholder,
  value,
  autoComplete,
  minLength,
  onChange,
}: {
  type: string;
  placeholder: string;
  value: string;
  autoComplete: string;
  minLength?: number;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      required
      minLength={minLength}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line-3 bg-card-2 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
    />
  );
}
