import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function AuthCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      // Supabase detects hash fragments (#access_token=...) automatically
      // when onAuthStateChange fires. We just need to wait for it.
      const maxAttempts = 20;
      for (let i = 0; i < maxAttempts; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          if (!cancelled) {
            nav({ to: "/dashboard", replace: true });
          }
          return;
        }
        // Wait 250ms before retrying
        await new Promise((r) => setTimeout(r, 250));
      }

      // If we still don't have a session after retries, go to login
      if (!cancelled) {
        setStatus("Unable to sign in. Redirecting...");
        setTimeout(() => {
          nav({ to: "/login", replace: true });
        }, 1500);
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
