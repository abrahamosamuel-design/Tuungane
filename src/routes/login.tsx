import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in or sign up — Tuungane" }] }),
  component: Login,
});

function Login() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [userType, setUserType] = useState<"customer" | "provider">("customer");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validatePhone = (v: string) => {
    const clean = v.replace(/\s/g, "");
    return /^(\+256|256|0?7)\d{7,9}$/.test(clean);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "signup" && phone && !validatePhone(phone)) {
      setError("Tuungane is currently available in Uganda only. We are expanding soon.");
      return;
    }
    setError(null);
    alert("Authentication will be wired up in the next step (Lovable Cloud).");
  };

  return (
    <Layout>
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Link to="/"><Logo className="h-12" /></Link>
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex rounded-full bg-surface p-1">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-navy text-navy-foreground" : "text-muted-foreground"}`}>
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
                      <button type="button" key={u} onClick={() => setUserType(u)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${userType === u ? "border-orange bg-orange/5 text-orange" : "border-border text-muted-foreground"}`}>
                        {u === "customer" ? "Customer" : "Service Provider"}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Full name" placeholder="Jane Nakato" />
              </>
            )}
            <Field label="Email" type="email" placeholder="you@example.com" />
            {tab === "signup" && (
              <Field
                label="Phone number"
                placeholder="+256 7xx xxx xxx"
                value={phone}
                onChange={(v) => setPhone(v)}
                hint="Uganda numbers only (+256, 256, 07…)"
              />
            )}
            <Field label="Password" type="password" placeholder="••••••••" />
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <button type="submit" className="mt-2 w-full rounded-xl bg-orange py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110">
              {tab === "login" ? "Log in" : "Create account"}
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

function Field({ label, type = "text", placeholder, hint, value, onChange }: { label: string; type?: string; placeholder?: string; hint?: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
      />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
