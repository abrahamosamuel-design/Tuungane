import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { autoEnablePushIfNeeded } from "@/lib/push";

const ONBOARDED_KEY = "tuungane_onboarded";

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
      const { data } = await supabase
        .from("profiles")
        .select("has_completed_onboarding")
        .eq("id", sess.user.id)
        .maybeSingle();
      if (cancelled) return;
      // Redirect brand-new users who haven't completed the welcome flow.
      // The flag is set to true on existing users via backfill, and set
      // to true when the user finishes or skips onboarding.
      if (!data || data.has_completed_onboarding === false) {
        nav({ to: "/onboarding" });
      } else {
        localStorage.setItem(ONBOARDED_KEY, "1");
      }
    })();
    return () => { cancelled = true; };
  }, [nav]);

  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
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
