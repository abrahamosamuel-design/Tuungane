import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { autoEnablePushIfNeeded } from "@/lib/push";

function AuthenticatedLayout() {
  useEffect(() => {
    // Push is enabled by default for all signed-in users. This requests
    // permission the first time and re-subscribes silently afterward.
    // Users who explicitly disable on the preferences page won't be re-prompted.
    autoEnablePushIfNeeded().catch(() => {});
  }, []);
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
