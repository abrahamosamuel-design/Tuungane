import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function AuthenticatedLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        return { user: session.user };
      }
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
