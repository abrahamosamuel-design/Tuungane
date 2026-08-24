import { Link, useLocation } from "@tanstack/react-router";
import { Home, Wrench, User as UserIcon, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMyCounts } from "@/components/Header";
import { CreateChoiceSheet } from "@/components/CreateChoiceSheet";

export function MobileBottomNav() {
  const { user } = useAuth();
  const counts = useMyCounts();
  const unreadMessages = counts.unreadMessages;
  const location = useLocation();
  const isServicesOrRequests = location.pathname.startsWith("/services") || location.pathname.startsWith("/requests");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid h-16 w-full max-w-md grid-cols-5 items-center justify-items-center px-2">
          {/* Home */}
          <Tab to={user ? "/dashboard" : "/"} icon={<Home className="h-5 w-5" />} label="Home" exact />

          {/* Services */}
          <Tab to="/services" icon={<Wrench className="h-5 w-5" />} label="Services" forceActive={isServicesOrRequests} />

          {/* Center FAB — Plus button (opens CreateChoiceSheet) */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => user ? setCreateOpen(true) : window.location.assign("/login")}
              aria-label="Create"
              className="flex h-14 w-14 -mt-7 items-center justify-center rounded-full bg-orange text-white shadow-lg shadow-orange/30 ring-4 ring-background transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>

          {/* Messages */}
          <Tab
            to="/messages"
            label="Messages"
            icon={
              <div className="relative flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background"></span>
                )}
              </div>
            }
          />

          {/* Profile */}
          {user ? (
            <Tab to="/u/$id" params={{ id: user.id }} icon={<UserIcon className="h-5 w-5" />} label="Profile" />
          ) : (
            <Tab to="/login" icon={<UserIcon className="h-5 w-5" />} label="Login" />
          )}
        </div>
      </nav>

      {/* Create choice sheet (List Service / Post Request) */}
      <CreateChoiceSheet open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Spacer so content isn't hidden behind the nav */}
      <div className="h-20 md:hidden" aria-hidden />
    </>
  );
}

function Tab({ to, icon, label, exact, params, forceActive }: { to: string; icon: React.ReactNode; label?: string; exact?: boolean; params?: Record<string, string>; forceActive?: boolean }) {
  const activeClass = "text-orange";
  const inactiveClass = "text-muted-foreground hover:text-foreground";

  return (
    <Link
      to={to}
      params={params as never}
      preload="intent"
      activeOptions={{ exact }}
      activeProps={{ className: activeClass }}
      inactiveProps={{ className: forceActive ? activeClass : inactiveClass }}
      className="flex flex-col items-center justify-center gap-0.5 py-1 transition-colors duration-200"
    >
      {icon}
      {label && <span className="text-[10px] font-medium">{label}</span>}
    </Link>
  );
}
