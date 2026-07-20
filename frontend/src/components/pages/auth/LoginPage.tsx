import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { UserErrorKind } from "@/lib/user-errors";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage({ 
  initialTab, 
  redirectUrl, 
  intent 
}: { 
  initialTab?: "login" | "signup";
  redirectUrl?: string;
  intent?: "customer" | "provider" | "both";
}) {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(initialTab ?? (intent ? "signup" : "login"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<{ title: string; description?: string; kind?: UserErrorKind } | null>(null);

  useEffect(() => {
    if (!loading && user) {
      void nav({ to: (redirectUrl as never) ?? "/dashboard" });
    }
  }, [loading, user, redirectUrl, nav]);

  const emailValid = emailRegex.test(email.trim());
  const passwordValid = password.length >= 6;
  const showEmailError = emailTouched && email.length > 0 && !emailValid;
  const showPasswordError = passwordTouched && password.length > 0 && !passwordValid;

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const canSubmitEmail = emailValid && passwordValid && !busy;

  if (!loading && user) return null;

  const showErr = async (err: unknown, fallback: string) => {
    const { toUserMessage } = await import("@/lib/user-errors");
    setError(toUserMessage(err, fallback));
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
      // Note: The browser will redirect, so code below won't run immediately.
    } catch (err) {
      await showErr(err, "Couldn't sign in with Google");
      setGoogleBusy(false);
    }
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
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
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        try { localStorage.removeItem("tuungane_welcome_seen"); } catch { /* ignore */ }
        nav({ to: (redirectUrl as never) ?? "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        nav({ to: (redirectUrl as never) ?? "/dashboard" });
      }
    } catch (err) {
      await showErr(err, tab === "signup" ? "Couldn't create your account" : "Couldn't sign you in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-8 sm:py-16">
        <Link to="/" className="active:scale-[0.98] transition-transform"><Logo className="h-10 sm:h-12" /></Link>
        <div className="mt-6 sm:mt-8 w-full rounded-3xl sm:rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow sm:p-8">
          <div className="flex rounded-full bg-surface p-1">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setTab(t); setError(null); }} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${tab === t ? "bg-navy text-navy-foreground shadow-sm" : "text-muted-foreground hover:text-navy hover:bg-navy/5"}`}>
                {t === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-navy text-center sm:text-left">
            {tab === "login" ? "Welcome back" : "Join Tuungane"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center sm:text-left">
            {tab === "login" ? "Log in to manage your profile or saved providers." : "Create your free account in seconds — no forms to fill."}
          </p>

          <button
            type="button"
            onClick={onGoogle}
            disabled={googleBusy || busy}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-bold text-navy transition hover:bg-surface active:scale-[0.98] disabled:opacity-50"
          >
            {googleBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
            {googleBusy ? "Opening Google…" : tab === "login" ? "Continue with Google" : "Sign up with Google"}
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={onEmailSubmit} noValidate>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
              <div className="relative mt-1.5">
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
                  className={`w-full min-h-[48px] rounded-xl border bg-background px-4 py-3 pr-10 text-base outline-none focus:ring-2 transition-all ${
                    showEmailError ? "border-destructive focus:ring-destructive/20" : emailValid ? "border-green focus:ring-green/20" : "border-border focus:border-orange focus:ring-orange/20"
                  }`}
                />
                {email.length > 0 && (
                  <span className="absolute inset-y-0 right-0 flex items-center px-4">
                    {emailValid ? <Check className="h-5 w-5 text-green" /> : emailTouched ? <AlertCircle className="h-5 w-5 text-destructive" /> : null}
                  </span>
                )}
              </div>
              {showEmailError && <p className="mt-1.5 text-xs text-destructive font-medium">Enter a valid email like name@example.com</p>}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                onBlur={() => setPasswordTouched(true)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                invalid={showPasswordError}
                valid={passwordValid}
              />
              {tab === "signup" && password.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < passwordStrength ? (passwordStrength <= 1 ? "bg-destructive" : passwordStrength <= 2 ? "bg-orange" : "bg-green") : "bg-border"}`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                    {passwordStrength <= 1 ? "Weak — try 10+ characters" : passwordStrength <= 2 ? "Okay" : passwordStrength === 3 ? "Good" : "Strong"}
                  </p>
                </div>
              )}
              {showPasswordError && <p className="mt-1.5 text-xs text-destructive font-medium">Password must be at least 6 characters</p>}
            </div>

            {/* tab === "login" && (
              <div className="flex justify-end pt-1">
                <Link to="/forgot-password" className="text-sm font-bold text-orange hover:underline p-2 -m-2 active:scale-[0.98] transition-transform">
                  Forgot password?
                </Link>
              </div>
            ) */}

            <div className="min-h-[4.5rem]">
              {error && (
                <ErrorBlock
                  error={error}
                  onResetPassword={() => nav({ to: "/forgot-password", search: emailValid ? { email } : undefined })}
                  onSwitchToLogin={() => setTab("login")}
                  onSwitchToSignup={() => setTab("signup")}
                  onResendConfirmation={async () => {
                    try {
                      const { error: resendErr } = await supabase.auth.resend({ type: "signup", email });
                      if (resendErr) throw resendErr;
                      toast.success("Confirmation email sent", { description: "Check your inbox." });
                      setError(null);
                    } catch (err) {
                      await showErr(err, "Couldn't resend confirmation");
                    }
                  }}
                  onRetry={() => { setError(null); void onEmailSubmit(new Event("submit") as unknown as React.FormEvent); }}
                />
              )}
            </div>

            <button type="submit" disabled={!canSubmitEmail} className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange py-3 text-base font-bold text-orange-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
              {busy && <Loader2 className="h-5 w-5 animate-spin" />}
              {busy ? "Please wait…" : tab === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            By continuing you agree to our <Link to="/terms" className="text-orange font-bold hover:underline p-1 -m-1">Terms & Safety</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

function ErrorBlock({
  error,
  onResetPassword,
  onSwitchToLogin,
  onSwitchToSignup,
  onResendConfirmation,
  onRetry,
}: {
  error: { title: string; description?: string; kind?: UserErrorKind };
  onResetPassword: () => void;
  onSwitchToLogin: () => void;
  onSwitchToSignup: () => void;
  onResendConfirmation: () => void | Promise<void>;
  onRetry: () => void;
}) {
  return (
    <div role="alert" aria-live="polite" className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <p className="font-bold">{error.title}</p>
      {error.description && <p className="mt-1 opacity-90">{error.description}</p>}
      {error.kind === "invalid_credentials" && (
        <div className="mt-2.5 flex flex-col sm:flex-row gap-3">
          {/* <button type="button" onClick={onResetPassword} className="font-bold underline text-left active:scale-[0.98] transition-transform">Reset your password &rarr;</button> */}
          <button type="button" onClick={onSwitchToSignup} className="font-bold underline text-left active:scale-[0.98] transition-transform">Create an account &rarr;</button>
        </div>
      )}
      {error.kind === "already_registered" && (
        <button type="button" onClick={onSwitchToLogin} className="mt-2.5 block font-bold underline active:scale-[0.98] transition-transform">Log in instead &rarr;</button>
      )}
      {error.kind === "email_not_confirmed" && (
        <button type="button" onClick={() => void onResendConfirmation()} className="mt-2.5 block font-bold underline active:scale-[0.98] transition-transform">Resend confirmation email &rarr;</button>
      )}
      {(error.kind === "offline" || error.kind === "server") && (
        <button type="button" onClick={onRetry} className="mt-2.5 block font-bold underline active:scale-[0.98] transition-transform">Try again &rarr;</button>
      )}
    </div>
  );
}


function PasswordInput({ value, onChange, onBlur, autoComplete, invalid, valid }: { value: string; onChange: (v: string) => void; onBlur?: () => void; autoComplete?: string; invalid?: boolean; valid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mt-1.5">
      <input
        type={show ? "text" : "password"}
        value={value}
        required
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
        className={`w-full min-h-[48px] rounded-xl border bg-background px-4 py-3 pr-12 text-base outline-none focus:ring-2 transition-all ${
          invalid ? "border-destructive focus:ring-destructive/20" : valid ? "border-green focus:ring-green/20" : "border-border focus:border-orange focus:ring-orange/20"
        }`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground hover:text-navy active:scale-95 transition-transform"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

export function PasswordField({ label, value, onChange, required, autoComplete }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative mt-1.5">
        <input
          type={show ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[48px] rounded-xl border border-border bg-background px-4 py-3 pr-12 text-base outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground hover:text-navy active:scale-95 transition-transform"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.9 35.5 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
