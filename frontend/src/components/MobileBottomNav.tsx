import { Link, useLocation } from "@tanstack/react-router";
import { Home, Wrench, User as UserIcon, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMyCounts } from "@/components/Header";

export function MobileBottomNav() {
  const { user } = useAuth();
  const counts = useMyCounts();
  const unreadMessages = counts.unreadMessages;
  const location = useLocation();
  const isServicesOrRequests = location.pathname.startsWith("/services") || location.pathname.startsWith("/requests");

  return (
    <>
      <nav className="fixed bottom-6 left-4 right-4 z-40 rounded-[2rem] border border-border/50 bg-background/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid h-16 w-full max-w-md grid-cols-4 items-center justify-items-center px-2">
          <Tab to={user ? "/dashboard" : "/"} icon={<Home className="h-6 w-6" />} exact />
          <Tab to="/services" icon={<Wrench className="h-6 w-6" />} forceActive={isServicesOrRequests} />
          <Tab 
            to="/messages" 
            icon={
              <div className="relative flex items-center justify-center">
                <MessageSquare className="h-6 w-6" />
                {unreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full border-2 border-background bg-orange px-1 text-[10px] font-bold text-white shadow-sm">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </div>
            } 
          />
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

function Tab({ to, icon, exact, params, forceActive }: { to: string; icon: React.ReactNode; exact?: boolean; params?: Record<string, string>; forceActive?: boolean }) {
  const activeClass = "bg-orange text-orange-foreground shadow-md";
  const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-muted/50";

  return (
    <Link
      to={to}
      params={params as never}
      preload="intent"
      activeOptions={{ exact }}
      activeProps={{ className: activeClass }}
      inactiveProps={{ className: forceActive ? activeClass : inactiveClass }}
      className="flex h-12 w-full max-w-[5rem] items-center justify-center rounded-full transition-all duration-200"
    >
      {icon}
    </Link>
  );
}
