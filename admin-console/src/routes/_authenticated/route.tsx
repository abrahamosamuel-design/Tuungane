import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api";
import { autoEnablePushIfNeeded } from "@/lib/push";

const ONBOARDED_KEY = "tuungane_onboarded";
const LEGACY_CHECKED_KEY = "tuungane_legacy_checked";

function AuthenticatedLayout() {
  const nav = useNavigate();
  useEffect(() => {
    autoEnablePushIfNeeded().catch(() => {});
  }, []);

  useEffect(() => {
    // First-run onboarding redirect: only when the user has never set an
    // identity AND we haven't already routed them through onboarding.
    // Cheap: single-column select on the primary key.
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/onboarding")) return;
    if (localStorage.getItem(ONBOARDED_KEY) === "1") return;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      if (cancelled || !sess.user) return;
      try {
        // First check for legacy duplicate
        if (localStorage.getItem(LEGACY_CHECKED_KEY) !== "1" && !window.location.pathname.startsWith("/recovery")) {
          const { data: legacyRes } = await apiClient<{ data: { isDuplicate: boolean } }>("/recovery/check");
          if (cancelled) return;
          if (legacyRes?.isDuplicate) {
            nav({ to: "/recovery" });
            return;
          } else {
            localStorage.setItem(LEGACY_CHECKED_KEY, "1");
          }
        }

        const { data: profile } = await apiClient<{ data: { has_completed_onboarding: boolean } }>("/profiles/me");
        if (cancelled) return;
        if (!profile || profile.has_completed_onboarding === false) {
          nav({ to: "/onboarding" });
        } else {
          localStorage.setItem(ONBOARDED_KEY, "1");
        }
      } catch (err) {
        console.error("Failed to check onboarding/legacy status", err);
      }
    })();
    return () => { cancelled = true; };
  }, [nav]);

  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // After Google OAuth redirect, the URL contains hash fragments like #access_token=...
    // We need to let Supabase process these before checking auth status
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      // Supabase auto-detects hash fragments on onAuthStateChange, 
      // but getUser() may fire before that. Wait briefly for it to process.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return { user: session.user };
      }
      // If getSession didn't find it yet, wait a moment for the hash to be processed
      await new Promise((r) => setTimeout(r, 500));
      const { data: retry } = await supabase.auth.getSession();
      if (retry.session?.user) {
        return { user: retry.session.user };
      }
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href } as never,
      });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});
