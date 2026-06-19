import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Intent = "customer" | "provider" | "both";
type Search = { tab?: "login" | "signup"; redirect?: string; intent?: Intent };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in or sign up — Tuungane" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === "signup" ? "signup" : "login",
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    intent: s.intent === "provider" || s.intent === "both" || s.intent === "customer" ? s.intent : undefined,
  }),
  component: Login,
});

function Login() {
  const search = useSearch({ from: "/login" });
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(search.tab ?? (search.intent ? "signup" : "login"));
  const [intent, setIntent] = useState<Intent>(search.intent ?? "customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      void nav({ to: (search.redirect as never) ?? "/services" });
    }
  }, [loading, user, search.redirect, nav]);

  if (!loading && user) return null;

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
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const isProvider = intent === "provider" || intent === "both";
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, is_provider: isProvider, phone },
          },
        });
        if (error) throw error;
        if (data.user && isProvider) {
          await supabase.from("profiles").update({ is_provider: true, full_name: fullName }).eq("id", data.user.id);
        }
        toast.success("Account created!");
        try { localStorage.removeItem("tuungane_welcome_seen"); } catch { /* ignore */ }
        nav({ to: (search.redirect as never) ?? "/welcome" });
      } else {
        if (rememberMe) {
          localStorage.setItem("tuungane_remember_me", "true");
          sessionStorage.setItem("tuungane_session_active", "true");
        } else {
          localStorage.setItem("tuungane_remember_me", "false");
          sessionStorage.setItem("tuungane_session_active", "true");
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        nav({ to: (search.redirect as never) ?? "/services" });
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
                  <label className="text-xs font-medium text-navy">I want to…</label>
                  <div className="mt-1 grid gap-2">
                    {([
                      { id: "customer" as const, title: "I need help", desc: "Create requests and find skilled people.", accent: "orange" },
                      { id: "provider" as const, title: "I offer a skill", desc: "List your skill, show your work, and get discovered.", accent: "green" },
                      { id: "both" as const, title: "Both", desc: "Create requests and also offer your skills.", accent: "navy" },
                    ]).map((o) => {
                      const active = intent === o.id;
                      const ring = o.accent === "green" ? "border-green bg-green/5 text-green" : o.accent === "navy" ? "border-navy bg-navy/5 text-navy" : "border-orange bg-orange/5 text-orange";
                      return (
                        <button
                          type="button"
                          key={o.id}
                          onClick={() => setIntent(o.id)}
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${active ? ring : "border-border text-muted-foreground hover:border-navy/40"}`}
                        >
                          <p className="text-sm font-semibold">{o.title}</p>
                          <p className="mt-0.5 text-xs opacity-80">{o.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <TextField label="Full name" value={fullName} onChange={setFullName} required />
              </>
            )}
            <TextField label="Email" type="email" value={email} onChange={setEmail} required />
            {tab === "signup" && (
              <TextField label="Phone number" value={phone} onChange={setPhone} placeholder="+256 7xx xxx xxx" hint="Uganda numbers only (+256, 256, 07…)" />
            )}
            <PasswordField label="Password" value={password} onChange={setPassword} required autoComplete={tab === "login" ? "current-password" : "new-password"} />
            {tab === "login" && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs font-semibold text-orange hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
            {tab === "signup" && (
              <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} required autoComplete="new-password" />
            )}
            {tab === "login" && (
              <label className="flex items-center gap-2 text-xs text-navy cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-orange cursor-pointer"
                />
                Remember me / Stay signed in
              </label>
            )}
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

function TextField({ label, type = "text", placeholder, hint, value, onChange, required }: { label: string; type?: string; placeholder?: string; hint?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
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

export function PasswordField({ label, value, onChange, required, autoComplete }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <div className="relative mt-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-navy"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
