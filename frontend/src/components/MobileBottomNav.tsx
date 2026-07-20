import { Link } from "@tanstack/react-router";
import { Home, Wrench, User as UserIcon, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function MobileBottomNav() {
  const { user } = useAuth();

  return (
    <>
      <nav className="fixed bottom-6 left-4 right-4 z-40 rounded-[2rem] border border-border/50 bg-background/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid h-16 w-full max-w-md grid-cols-4 items-center justify-items-center px-2">
          <Tab to="/" icon={<Home className="h-6 w-6" />} exact />
          <Tab to="/services" icon={<Wrench className="h-6 w-6" />} />
          <Tab to="/requests/browse" icon={<ClipboardList className="h-6 w-6" />} />
          {user ? (
            <Tab to="/u/$id" params={{ id: user.id }} icon={<UserIcon className="h-6 w-6" />} />
          ) : (
            <Tab to="/login" icon={<UserIcon className="h-6 w-6" />} />
          )}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind the floating nav */}
      <div className="h-24 md:hidden" aria-hidden />
    </>
  );
}

function Tab({ to, icon, exact, params }: { to: string; icon: React.ReactNode; exact?: boolean; params?: Record<string, string> }) {
  return (
    <Link
      to={to}
      params={params as never}
      activeOptions={{ exact }}
      activeProps={{ className: "bg-orange text-orange-foreground shadow-md" }}
      inactiveProps={{ className: "text-muted-foreground hover:text-foreground hover:bg-muted/50" }}
      className="flex h-12 w-full max-w-[5rem] items-center justify-center rounded-full transition-all duration-200"
    >
      {icon}
    </Link>
  );
}
