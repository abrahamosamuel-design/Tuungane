import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

type Search = { email?: string };

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password — Tuungane" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const search = useSearch({ from: "/forgot-password" });
  const [email, setEmail] = useState(search.email ?? "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSent(true);
    } catch {
      // Don't reveal whether the email exists — show generic success message.
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Link to="/"><Logo className="h-12" /></Link>
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="font-display text-2xl font-bold text-navy">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we'll send you a password reset link.
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-green/10 px-4 py-3 text-sm text-navy">
                If an account exists with this email, a password reset link has been sent.
              </div>
              <Link to="/login" className="block text-center text-sm font-semibold text-orange hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-3" onSubmit={onSubmit}>
              <div>
                <label className="text-xs font-medium text-navy">Email</label>
                <input
                  type="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
                />
              </div>
              {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
              <button type="submit" disabled={busy} className="mt-2 w-full rounded-xl bg-orange py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110 disabled:opacity-50">
                {busy ? "Sending..." : "Send reset link"}
              </button>
              <Link to="/login" className="block text-center text-sm font-semibold text-orange hover:underline">
                Back to login
              </Link>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
}
