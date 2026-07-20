import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { PasswordField } from "@/components/pages/auth/LoginPage";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Tuungane" },
      { name: "description", content: "Choose a new password for your Tuungane account and sign back in to continue posting requests and connecting with providers." },
      { property: "og:title", content: "Set a new password — Tuungane" },
      { property: "og:description", content: "Choose a new password for your Tuungane account." },
      { property: "og:url", content: "https://tuungane.com/reset-password" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://tuungane.com/reset-password" }],
  }),
  staticData: {
    hideHeaderOnMobile: true,
    hideFooter: true,
    hideBottomNavOnMobileUnauth: true,
  },
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setDone(true);
      toast.success("Password updated");
      setTimeout(() => nav({ to: "/login" }), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update password. Try the reset link again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Link to="/"><Logo className="h-12" /></Link>
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="font-display text-2xl font-bold text-navy">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a strong password you haven't used before.</p>

          {done ? (
            <div className="mt-6 rounded-xl bg-green/10 px-4 py-3 text-sm text-navy">
              Your password has been updated. You can now log in.
            </div>
          ) : (
            <form className="mt-6 space-y-3" onSubmit={onSubmit}>
              <PasswordField label="New password" value={password} onChange={setPassword} required autoComplete="new-password" />
              <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} required autoComplete="new-password" />
              {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
              <button type="submit" disabled={busy} className="mt-2 w-full rounded-xl bg-orange py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110 disabled:opacity-50">
                {busy ? "Updating..." : "Update password"}
              </button>
              <Link to="/login" className="block text-center text-sm font-semibold text-orange hover:underline">
                Back to login
              </Link>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
