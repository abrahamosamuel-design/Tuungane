import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles, hasAdminPrivilege } from "@/hooks/use-auth";
import { toast } from "sonner";

function AuthCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState("Verifying Admin credentials...");

  useEffect(() => {
    let cancelled = false;

    const verifyAdminAndRedirect = async (userId: string, email?: string | null) => {
      const roles = await fetchUserRoles(userId);
      if (cancelled) return;

      if (!hasAdminPrivilege(roles)) {
        await supabase.auth.signOut();
        const msg = email
          ? `Access denied: ${email} does not have Admin privileges.`
          : "Access denied: Only users with Admin privileges can sign in.";
        toast.error(msg);
        const searchParams = new URLSearchParams({ error: "unauthorized" });
        if (email) searchParams.set("email", email);
        window.location.replace(`/login?${searchParams.toString()}`);
        return;
      }

      toast.success("Welcome back, Admin!");
      nav({ to: "/admin", replace: true });
    };

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorParam = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        if (errorParam) {
          console.error("[AuthCallback] OAuth error:", errorParam, errorDesc);
          if (!cancelled) {
            setStatus(`OAuth Error: ${errorDesc || errorParam}. Redirecting...`);
            setTimeout(() => nav({ to: "/login", replace: true }), 2000);
          }
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[AuthCallback] exchangeCodeForSession error:", error);
            if (!cancelled) {
              setStatus(`Sign in error: ${error.message}. Redirecting...`);
              setTimeout(() => nav({ to: "/login", replace: true }), 3000);
            }
            return;
          }
          if (data.session?.user) {
            await verifyAdminAndRedirect(data.session.user.id, data.session.user.email);
            return;
          } else {
            if (!cancelled) {
              setStatus("No session returned from Google sign-in. Redirecting...");
              setTimeout(() => nav({ to: "/login", replace: true }), 3000);
            }
            return;
          }
        }

        if (window.location.hash.includes("access_token")) {
          for (let i = 0; i < 15; i++) {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
              await verifyAdminAndRedirect(data.session.user.id, data.session.user.email);
              return;
            }
            await new Promise((r) => setTimeout(r, 300));
          }
          if (!cancelled) {
            setStatus("Timed out waiting for Google session. Redirecting...");
            setTimeout(() => nav({ to: "/login", replace: true }), 3000);
          }
          return;
        }

        for (let i = 0; i < 5; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            await verifyAdminAndRedirect(data.session.user.id, data.session.user.email);
            return;
          }
          await new Promise((r) => setTimeout(r, 400));
        }

        if (!cancelled) {
          setStatus("Could not establish session. Redirecting to login...");
          setTimeout(() => nav({ to: "/login", replace: true }), 2500);
        }
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        if (!cancelled) {
          setStatus("Something went wrong. Redirecting...");
          setTimeout(() => nav({ to: "/login", replace: true }), 2000);
        }
      }
    };

    void handleCallback();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="text-center space-y-4">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-700">{status}</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});
