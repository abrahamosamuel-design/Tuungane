import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles, hasAdminPrivilege } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const handleRootEntry = async () => {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hasAccessToken = window.location.hash.includes("access_token");

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session?.user) {
          if (!cancelled) nav({ to: "/login", replace: true });
          return;
        }
        const roles = await fetchUserRoles(data.session.user.id, data.session.access_token);
        if (cancelled) return;
        if (!hasAdminPrivilege(roles)) {
          await supabase.auth.signOut();
          const email = data.session.user.email;
          const searchParams = new URLSearchParams({ error: "unauthorized" });
          if (email) searchParams.set("email", email);
          window.location.replace(`/login?${searchParams.toString()}`);
          return;
        }
        toast.success("Welcome back, Admin!");
        nav({ to: "/admin", replace: true });
        return;
      }

      if (hasAccessToken) {
        for (let i = 0; i < 15; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const roles = await fetchUserRoles(data.session.user.id, data.session.access_token);
            if (cancelled) return;
            if (!hasAdminPrivilege(roles)) {
              await supabase.auth.signOut();
              const email = data.session.user.email;
              const searchParams = new URLSearchParams({ error: "unauthorized" });
              if (email) searchParams.set("email", email);
              window.location.replace(`/login?${searchParams.toString()}`);
              return;
            }
            toast.success("Welcome back, Admin!");
            nav({ to: "/admin", replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      if (!cancelled) {
        nav({ to: "/admin", replace: true });
      }
    };

    void handleRootEntry();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="text-center space-y-3">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-600">Loading Admin Console...</p>
      </div>
    </div>
  );
}
