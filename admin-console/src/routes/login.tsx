import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, fetchUserRoles, hasAdminPrivilege } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const { user, session, loading, isModerator } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      const deniedEmail = params.get("email");
      if (err === "unauthorized") {
        setAuthError(
          deniedEmail
            ? `Access denied: ${deniedEmail} does not have Admin privileges.`
            : "Access denied: Only users with Admin privileges can sign in to the Admin Console."
        );
      } else if (err) {
        setAuthError(err);
      }
    }
  }, []);

  useEffect(() => {
    if (loading || busy || googleBusy || !user) return;

    if (isModerator) {
      nav({ to: "/admin", replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const verifiedRoles = await fetchUserRoles(user.id, session?.access_token);
      if (cancelled) return;
      if (hasAdminPrivilege(verifiedRoles)) {
        nav({ to: "/admin", replace: true });
      } else {
        const deniedEmail = user.email;
        await supabase.auth.signOut();
        if (cancelled) return;
        const msg = deniedEmail
          ? `Access denied: ${deniedEmail} does not have Admin privileges.`
          : "Access denied: Only users with Admin privileges can sign in to the Admin Console.";
        setAuthError(msg);
        toast.error(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, busy, googleBusy, user, session, isModerator, nav]);

  const onGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      const msg = err.message || "Failed to sign in with Google";
      setAuthError(msg);
      toast.error(msg);
      setGoogleBusy(false);
    }
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const signedInUser = data.user;
      if (!signedInUser) {
        throw new Error("Could not verify user account.");
      }

      const userRoles = await fetchUserRoles(signedInUser.id, data.session?.access_token);
      if (!hasAdminPrivilege(userRoles)) {
        await supabase.auth.signOut();
        const msg = `Access denied: ${signedInUser.email || email} does not have Admin privileges.`;
        setAuthError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Welcome back, Admin!");
      nav({ to: "/admin", replace: true });
    } catch (err: any) {
      const msg = err.message || "Failed to log in";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !busy && !googleBusy) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <img
            src="/icon.png"
            alt="Tuungane"
            className="h-16 w-16 rounded-2xl object-contain shadow-sm"
          />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            Tuungane Admin
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in with an authorized Admin account
          </p>
        </div>

        {authError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{authError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={googleBusy || busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-60"
        >
          {googleBusy ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>{googleBusy ? "Connecting to Google..." : "Continue with Google"}</span>
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            or sign in with email
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={onEmailSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
              placeholder="admin@tuungane.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={busy || googleBusy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md active:scale-95 disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
