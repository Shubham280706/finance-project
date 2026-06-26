"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

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
        // If email confirmation is enabled, there's no session yet.
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
        // onAuthStateChange in the page will swap to the workspace.
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
    <div className="mx-auto mt-16 w-full max-w-sm sm:mt-24">
      <h1 className="font-serif text-3xl tracking-tight text-ink">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {mode === "signin"
          ? "Sign in to access your documents and ask questions."
          : "Sign up to upload filings and keep a private history."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line-strong bg-paper-raised px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line-strong bg-paper-raised px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
        />

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent-ink">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-ink disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
