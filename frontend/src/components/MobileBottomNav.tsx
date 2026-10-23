import { Link, useLocation } from "@tanstack/react-router";
import { Home, Newspaper, User as UserIcon, LayoutGrid, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMyCounts } from "@/components/Header";
import { CreateChoiceSheet } from "@/components/CreateChoiceSheet";

export function MobileBottomNav() {
  const { user } = useAuth();
  const counts = useMyCounts();
  const location = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  const isHomeOrServices =
    location.pathname === "/" ||
    location.pathname.startsWith("/services") ||
    location.pathname.startsWith("/service/");
  const isFeed =
    location.pathname.startsWith("/feed") ||
    location.pathname.startsWith("/dashboard");
  const isCategories = location.pathname.startsWith("/categories");

  const searchCategory =
    (location.search as any)?.category ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("category")
      : null);
  const isServicesCategoryRoute =
    location.pathname.startsWith("/services/") &&
    location.pathname !== "/services" &&
    location.pathname !== "/services/";
  const isCategoryOpen = !!searchCategory || isServicesCategoryRoute;

  if (isCategoryOpen) {
    return null;
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid h-16 w-full max-w-md grid-cols-5 items-center justify-items-center px-2">
          {/* 1. Home (Services) */}
          <Tab
            to="/"
            icon={<Home className="h-5 w-5" />}
            label="Home"
            forceActive={isHomeOrServices}
            exact
          />

          {/* 2. Feed (Second on the nav bar) */}
          <Tab
            to="/feed"
            icon={<Newspaper className="h-5 w-5" />}
            label="Feed"
            forceActive={isFeed}
          />

          {/* 3. Center FAB — Plus button (opens CreateChoiceSheet) */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => (user ? setCreateOpen(true) : window.location.assign("/login"))}
              aria-label="Create"
              className="flex h-14 w-14 -mt-7 items-center justify-center rounded-full bg-orange text-white shadow-lg shadow-orange/30 ring-4 ring-background transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>

          {/* 4. Categories (Replaces Opportunities) */}
          <Tab
            to="/categories"
            label="Categories"
            icon={<LayoutGrid className="h-5 w-5" />}
            forceActive={isCategories}
          />

          {/* 5. Profile */}
          {user ? (
            <Tab
              to="/u/$id"
              params={{ id: user.id }}
              icon={<UserIcon className="h-5 w-5" />}
              label="Profile"
            />
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

function Tab({
  to,
  icon,
  label,
  exact,
  params,
  forceActive,
}: {
  to: string;
  icon: React.ReactNode;
  label?: string;
  exact?: boolean;
  params?: Record<string, string>;
  forceActive?: boolean;
}) {
  const activeClass = "text-orange font-semibold";
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
