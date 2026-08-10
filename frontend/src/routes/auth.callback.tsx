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
        // PKCE flow: Supabase redirects with ?code= query parameter
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Code exchange failed:", error);
          } else if (data.session) {
            if (!cancelled) nav({ to: "/dashboard", replace: true });
            return;
          }
        }

        // Hash fragment flow: #access_token=...
        if (window.location.hash.includes("access_token")) {
          // Supabase auto-detects hash fragments via onAuthStateChange
          // Wait for it to process
          for (let i = 0; i < 20; i++) {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
              if (!cancelled) nav({ to: "/dashboard", replace: true });
              return;
            }
            await new Promise((r) => setTimeout(r, 250));
          }
        }

        // Fallback: check if session already exists (e.g. from onAuthStateChange)
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            if (!cancelled) nav({ to: "/dashboard", replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 300));
        }

        // All attempts failed
        if (!cancelled) {
          setStatus("Unable to sign in. Redirecting...");
          setTimeout(() => nav({ to: "/login", replace: true }), 1500);
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        if (!cancelled) {
          setStatus("Something went wrong. Redirecting...");
          setTimeout(() => nav({ to: "/login", replace: true }), 1500);
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
