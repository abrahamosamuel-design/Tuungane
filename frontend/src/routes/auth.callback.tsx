import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function AuthCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorParam = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        // Check for OAuth error returned by Supabase/Google
        if (errorParam) {
          console.error("[AuthCallback] OAuth error:", errorParam, errorDesc);
          if (!cancelled) {
            setStatus(`OAuth Error: ${errorDesc || errorParam}. Redirecting...`);
            setTimeout(() => nav({ to: "/login", replace: true }), 2000);
          }
          return;
        }

        // PKCE flow: ?code= parameter
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[AuthCallback] exchangeCodeForSession error:", error);
            if (!cancelled) {
              setStatus(`Sign in error: ${error.message}. Redirecting...`);
              setTimeout(() => nav({ to: "/login", replace: true }), 4000);
            }
            return;
          }
          if (data.session) {
            if (!cancelled) nav({ to: "/dashboard", replace: true });
            return;
          } else {
            if (!cancelled) {
              setStatus("No session returned from code exchange. Redirecting...");
              setTimeout(() => nav({ to: "/login", replace: true }), 4000);
            }
            return;
          }
        }

        // Hash fragment flow: #access_token=...
        if (window.location.hash.includes("access_token")) {
          for (let i = 0; i < 15; i++) {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
              if (!cancelled) nav({ to: "/dashboard", replace: true });
              return;
            }
            await new Promise((r) => setTimeout(r, 300));
          }
          if (!cancelled) {
            setStatus("Timeout waiting for hash session. Redirecting...");
            setTimeout(() => nav({ to: "/login", replace: true }), 4000);
          }
          return;
        }

        // Fallback: check existing session
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            if (!cancelled) nav({ to: "/dashboard", replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        if (!cancelled) {
          setStatus("Timeout waiting for fallback session (no code or hash provided). Redirecting...");
          setTimeout(() => nav({ to: "/login", replace: true }), 4000);
        }
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        if (!cancelled) {
          setStatus("Something went wrong. Redirecting...");
          setTimeout(() => nav({ to: "/login", replace: true }), 2000);
        }
      }
    };

    handleCallback();
    return () => { cancelled = true; };
  }, [nav]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        <p className="text-lg font-semibold text-navy">{status}</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});
