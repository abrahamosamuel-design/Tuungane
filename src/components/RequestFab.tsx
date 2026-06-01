import { Link, useRouterState } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const SHOW_ON = new Set<string>(["/", "/services", "/services/requests", "/feed"]);

export function RequestFab() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!user) return null;
  if (!SHOW_ON.has(pathname)) return null;

  return (
    <Link
      to="/services"
      aria-label="Request a service"
      className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-orange-foreground shadow-2xl shadow-orange/30 transition hover:brightness-110 sm:bottom-8 sm:right-8"
    >
      <Plus className="h-5 w-5" /> Request a service
    </Link>
  );
}
