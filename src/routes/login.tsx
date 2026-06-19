import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Search = { tab?: "login" | "signup"; redirect?: string; intent?: "customer" | "provider" | "both" };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in or sign up — Tuungane" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === "signup" ? "signup" : "login",
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    intent: s.intent === "provider" || s.intent === "both" || s.intent === "customer" ? s.intent : undefined,
  }),
  component: Login,
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const search = useSearch({ from: "/login" });
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(search.tab ?? (search.intent ? "signup" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      void nav({ to: (search.redirect as never) ?? "/welcome" });
    }
  }, [loading, user, search.redirect, nav]);

  if (!loading && user) return null;

  const emailValid = emailRegex.test(email.trim());
  const passwordValid = password.length >= 6;
  const showEmailError = emailTouched && email.length > 0 && !emailValid;
  const showPasswordError = passwordTouched && password.length > 0 && !passwordValid;
  const canSubmit = emailValid && passwordValid && !busy;

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const onGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw new Error(typeof result.error === "string" ? result.error : "Google sign-in failed");
      if (result.redirected) return;
      try { localStorage.removeItem("tuungane_welcome_seen"); } catch { /* ignore */ }
      nav({ to: (search.redirect as never) ?? "/welcome" });
    } catch (err) {
      const { toUserMessage } = await import("@/lib/user-errors");
      const { title, description } = toUserMessage(err, "Couldn't sign in with Google");
      setError(description ? `${title} — ${description}` : title);
      setGoogleBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!emailValid || !passwordValid) return;
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        try { localStorage.removeItem("tuungane_welcome_seen"); } catch { /* ignore */ }
        nav({ to: (search.redirect as never) ?? "/welcome" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        nav({ to: (search.redirect as never) ?? "/services" });
      }
    } catch (err: unknown) {
      const { toUserMessage } = await import("@/lib/user-errors");
      const { title, description } = toUserMessage(err, tab === "signup" ? "Couldn't create your account" : "Couldn't sign you in");
      setError(description ? `${title} — ${description}` : title);
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
            {tab === "login" ? "Log in to manage your profile or saved providers." : "Create your free account in seconds — no forms to fill."}
          </p>

          <button
            type="button"
            onClick={onGoogle}
            disabled={googleBusy || busy}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-semibold text-navy transition hover:bg-surface disabled:opacity-50"
          >
            <GoogleIcon />
            {googleBusy ? "Opening Google…" : tab === "login" ? "Continue with Google" : "Sign up with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">or use email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-3" onSubmit={onSubmit} noValidate>
            <div>
              <label className="text-xs font-medium text-navy">Email</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  aria-invalid={showEmailError}
                  className={`w-full rounded-xl border bg-background px-3 py-2.5 pr-9 text-sm outline-none focus:ring-2 ${
                    showEmailError ? "border-destructive focus:ring-destructive/20" : emailValid ? "border-green focus:ring-green/20" : "border-border focus:border-orange focus:ring-orange/20"
                  }`}
                />
                {email.length > 0 && (
                  <span className="absolute inset-y-0 right-0 flex items-center px-3">
                    {emailValid ? <Check className="h-4 w-4 text-green" /> : emailTouched ? <AlertCircle className="h-4 w-4 text-destructive" /> : null}
                  </span>
                )}
              </div>
              {showEmailError && <p className="mt-1 text-[11px] text-destructive">Enter a valid email like name@example.com</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-navy">Password</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                onBlur={() => setPasswordTouched(true)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                invalid={showPasswordError}
                valid={passwordValid}
              />
              {tab === "signup" && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < passwordStrength ? (passwordStrength <= 1 ? "bg-destructive" : passwordStrength <= 2 ? "bg-orange" : "bg-green") : "bg-border"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {passwordStrength <= 1 ? "Weak — try 10+ characters" : passwordStrength <= 2 ? "Okay" : passwordStrength === 3 ? "Good" : "Strong"}
                  </p>
                </div>
              )}
              {showPasswordError && <p className="mt-1 text-[11px] text-destructive">Password must be at least 6 characters</p>}
            </div>

            {tab === "login" && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs font-semibold text-orange hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

            <button type="submit" disabled={!canSubmit} className="mt-2 w-full rounded-xl bg-orange py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110 disabled:opacity-50">
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

function PasswordInput({ value, onChange, onBlur, autoComplete, invalid, valid }: { value: string; onChange: (v: string) => void; onBlur?: () => void; autoComplete?: string; invalid?: boolean; valid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mt-1">
      <input
        type={show ? "text" : "password"}
        value={value}
        required
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
        className={`w-full rounded-xl border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 ${
          invalid ? "border-destructive focus:ring-destructive/20" : valid ? "border-green focus:ring-green/20" : "border-border focus:border-orange focus:ring-orange/20"
        }`}
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
  );
}

// Re-export for any callers still importing PasswordField from this module
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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.9 35.5 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
