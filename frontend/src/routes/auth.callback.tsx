import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function AuthCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState("Signing you in...");
  const [debug, setDebug] = useState("");

  useEffect(() => {
    let cancelled = false;

    const log = (msg: string) => {
      console.log("[AuthCallback]", msg);
      setDebug((prev) => prev + "\n" + msg);
    };

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = window.location.hash;
        const errorParam = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        log(`URL: ${url.pathname}${url.search}`);
        log(`Hash present: ${hash.length > 1 ? "yes" : "no"}`);
        log(`Code param: ${code ? "yes" : "no"}`);

        // Check for OAuth error returned by Supabase/Google
        if (errorParam) {
          log(`OAuth error: ${errorParam} - ${errorDesc}`);
          setStatus(`Sign in failed: ${errorDesc || errorParam}`);
          setTimeout(() => { if (!cancelled) nav({ to: "/login", replace: true }); }, 3000);
          return;
        }

        // PKCE flow: ?code= parameter
        if (code) {
          log("Attempting PKCE code exchange...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            log(`Code exchange error: ${error.message}`);
          } else if (data.session) {
            log("PKCE session obtained! Redirecting...");
            if (!cancelled) nav({ to: "/dashboard", replace: true });
            return;
          }
        }

        // Hash fragment flow: #access_token=...
        if (hash.includes("access_token")) {
          log("Hash fragment detected, waiting for Supabase...");
          for (let i = 0; i < 15; i++) {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
              log("Hash session obtained! Redirecting...");
              if (!cancelled) nav({ to: "/dashboard", replace: true });
              return;
            }
            await new Promise((r) => setTimeout(r, 300));
          }
        }

        // Final fallback: maybe session was already set by onAuthStateChange
        log("Checking for existing session...");
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            log("Existing session found! Redirecting...");
            if (!cancelled) nav({ to: "/dashboard", replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        log("All attempts failed. No session found.");
        if (!cancelled) {
          setStatus("Unable to sign in. Check the debug info below.");
        }
      } catch (err: any) {
        log(`Exception: ${err.message}`);
        if (!cancelled) {
          setStatus("Something went wrong.");
        }
      }
    };

    handleCallback();
    return () => { cancelled = true; };
  }, [nav]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        <p className="text-lg font-semibold text-navy">{status}</p>
        {debug && (
          <pre className="mt-4 text-left text-xs bg-navy/5 rounded-xl p-4 overflow-auto max-h-60 text-navy/70 whitespace-pre-wrap">
            {debug.trim()}
          </pre>
        )}
        <button
          onClick={() => nav({ to: "/login", replace: true })}
          className="mt-4 text-sm font-semibold text-orange hover:underline"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});
