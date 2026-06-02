import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Search = { tab?: "login" | "signup"; redirect?: string };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in or sign up — Tuungane" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === "signup" ? "signup" : "login",
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: Login,
});

function Login() {
  const search = useSearch({ from: "/login" });
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(search.tab ?? "login");
  const [userType, setUserType] = useState<"customer" | "provider">("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) {
    void nav({ to: (search.redirect as never) ?? "/dashboard" });
    return null;
  }

  const validatePhone = (v: string) => /^(\+256|256|0?7)\d{7,9}$/.test(v.replace(/\s/g, ""));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === "signup") {
        if (phone && !validatePhone(phone)) {
          throw new Error("Tuungane is currently available in Uganda only.");
        }
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, is_provider: userType === "provider", phone },
          },
        });
        if (error) throw error;
        if (data.user && userType === "provider") {
          // mark profile as provider (trigger handles default, but ensure)
          await supabase.from("profiles").update({ is_provider: true, full_name: fullName }).eq("id", data.user.id);
        }
        toast.success("Account created!");
        nav({ to: userType === "provider" ? "/dashboard" : (search.redirect as never) ?? "/feed" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        nav({ to: (search.redirect as never) ?? "/feed" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Link to="/"><Logo className="h-12" /></Link>
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex rounded-full bg-surface p-1">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-navy text-navy-foreground" : "text-muted-foreground"}`}>
                {t === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-navy">
            {tab === "login" ? "Welcome back" : "Join Tuungane"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "login" ? "Log in to manage your profile or saved providers." : "Create your free account in seconds."}
          </p>

          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            {tab === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-navy">I am a</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(["customer", "provider"] as const).map((u) => (
                      <button type="button" key={u} onClick={() => setUserType(u)} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${userType === u ? "border-orange bg-orange/5 text-orange" : "border-border text-muted-foreground"}`}>
                        {u === "customer" ? "Customer" : "Service Provider"}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Full name" value={fullName} onChange={setFullName} required />
              </>
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            {tab === "signup" && (
              <Field label="Phone number" value={phone} onChange={setPhone} placeholder="+256 7xx xxx xxx" hint="Uganda numbers only (+256, 256, 07…)" />
            )}
            <Field label="Password" type="password" value={password} onChange={setPassword} required />
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={busy} className="mt-2 w-full rounded-xl bg-orange py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110 disabled:opacity-50">
              {busy ? "Please wait..." : tab === "login" ? "Log in" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to our <Link to="/terms" className="text-orange">Terms & Safety</Link>.
          </p>
        </div>
      </section>
    </Layout>
  );
}

function Field({ label, type = "text", placeholder, hint, value, onChange, required }: { label: string; type?: string; placeholder?: string; hint?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
      />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
