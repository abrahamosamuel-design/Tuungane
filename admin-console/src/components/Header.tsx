import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, User as UserIcon, LogOut, LayoutDashboard, Shield, Rss, Wrench, ClipboardList, Coins, Building2, ChevronDown, Megaphone, Plus, Sparkles, MessageSquare, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { CreditBalanceChip } from "./CreditBalanceChip";
import { useCreditWallet } from "@/hooks/use-credits";
import { apiClient } from "@/lib/api";
import { PushPrompt } from "./PushPrompt";

import { useAuth } from "@/hooks/use-auth";
import { listSkillHref } from "@/lib/cta";

const primaryNav = [
  { to: "/", label: "Home", exact: true },
  { to: "/services", label: "Services", requiresAuth: true },
  { to: "/about", label: "About Us" },
];

export function Header() {

  const [more, setMore] = useState(false);
  const { user, loading, isModerator, signOut } = useAuth();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-in-out ${isVisible ? "translate-y-0" : "-translate-y-full lg:translate-y-0"}`}>
      <PushPrompt />
      {/* Main Header Pill */}
      <div className="bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 md:h-[4.5rem] lg:h-[5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Mobile Header Layout */}
          <div className="flex w-full items-center justify-between md:hidden relative">
            <Link to="/" className="flex items-center" aria-label="Tuungane home">
              <Logo className="h-9 w-auto" />
            </Link>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <CreditBalanceChip />
                  <MessagesIconLink />
                  <NotificationsBell />
                </>
              ) : (
                <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-muted px-4 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-orange/20 hover:text-orange">
                  Log In
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Header Layout */}
          {user ? (
            <>
              {/* Authenticated Desktop Header Layout */}
              <div className="hidden md:flex items-center gap-6 flex-1 max-w-xl mr-8 lg:mr-12">
                <Link to="/" className="flex items-center -ml-1 shrink-0" aria-label="Tuungane home">
                  <Logo className="h-10 lg:h-12 w-auto" />
                </Link>

                {/* Search Bar with Pill Design */}
                <div className="relative w-full hidden lg:block">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <Search className="h-4 w-4" />
                  </span>
                  <input className="w-full pl-10 pr-4 py-2 text-sm bg-surface-alt border border-border-hairline rounded-full focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all placeholder:text-outline" placeholder="Search tenders, vetted craftspeople, local services..." type="text"/>
                </div>
              </div>
              
              <nav className="hidden md:flex items-center justify-end gap-6 lg:gap-8 ml-auto pl-8 lg:pl-16 mr-6">
                {[
                  { to: "/dashboard", label: "Home", exact: true },
                  { to: "/services", label: "Services", exact: false },
                  { to: "/opportunities", label: "Opportunities", exact: false },
                  { to: `/u/${user.id}`, label: "My Account", exact: false },
                ].map((n) => (
                  <Link
                    key={n.to}
                    to={n.to as never}
                    preload="intent"
                    className="text-sm font-medium text-navy/70 hover:text-navy transition-colors duration-150"
                    activeProps={{ className: "text-orange font-bold border-b-2 border-orange pb-1" }}
                    activeOptions={{ exact: n.exact }}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </>
          ) : (
            <>
              {/* Unauthenticated Desktop Header Layout (Original) */}
              <Link to="/" className="hidden md:flex -ml-1 items-center" aria-label="Tuungane home">
                <Logo className="h-14 w-auto" />
              </Link>
              
              <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
                {[
                  { to: "/", label: "Home", exact: true },
                  { to: "/services", label: "Services", exact: false },
                  { to: "/about", label: "About Us", exact: false },
                ].map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    preload="intent"
                    className="text-sm font-medium text-navy/80 transition-colors hover:text-orange"
                    activeProps={{ className: "text-orange font-bold" }}
                    activeOptions={{ exact: n.exact }}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </>
          )}

          <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <>
            <Link to={listSkillHref(user) as never} className="hidden lg:flex items-center gap-1.5 rounded-full bg-orange px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 mr-2">
              <Plus className="h-4 w-4" /> Create
            </Link>
            <CreditBalanceChip />
            <MessagesIconLink />
            <NotificationsBell />

            </>
          ) : (
            <Link to="/login" search={{ tab: "signup" } as never} className="inline-flex items-center justify-center rounded-full bg-orange px-6 py-2 text-sm font-semibold text-orange-foreground shadow-sm transition-all hover:brightness-110">
              Get Started
            </Link>
          )}
        </div>
        <div className="hidden items-center gap-1 md:hidden">
          {/* Replaced by the new mobile layout block at the top */}
        </div>
      </div>
      </div>
    </header>
  );
}

function MenuItem({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2 px-3 py-2.5 text-sm text-navy hover:bg-muted">{icon} {label}</Link>
  );
}

function MyCreditsLink({ onClick }: { onClick: () => void }) {
  const { balance } = useCreditWallet();
  const label = balance === null || balance === undefined ? "0 credits" : `${balance.toLocaleString()} credits`;
  return (
    <Link to="/credits" onClick={onClick} className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">
      <span>My Credits</span>
      <span className="text-xs font-semibold text-orange">{label}</span>
    </Link>
  );
}

function CountedLink({ to, label, count, onClick }: { to: string; label: string; count: React.ReactNode; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">
      <span>{label}</span>
      <span className="text-xs font-semibold text-orange">{count}</span>
    </Link>
  );
}

export function useMyCounts() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my_counts", user?.id],
    queryFn: async () => {
      if (!user) return { notifications: 0, activeRequests: 0, unreadMessages: 0 };
      try {
        const res = await apiClient.get("/profiles/me/counts");
        return res.data || { notifications: 0, activeRequests: 0, unreadMessages: 0 };
      } catch (err) {
        return { notifications: 0, activeRequests: 0, unreadMessages: 0 };
      }
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
  return data || { notifications: 0, activeRequests: 0, unreadMessages: 0 };
}

function NotifCount() {
  const counts = useMyCounts();
  return <>{counts.notifications}</>;
}

function ActiveRequestsCount() {
  const counts = useMyCounts();
  return <>{counts.activeRequests}</>;
}

function useUnreadMessages() {
  const counts = useMyCounts();
  return counts.unreadMessages;
}

function MessagesIconLink() {
  const n = useUnreadMessages();
  return (
    <Link to="/messages" aria-label="Messages" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-navy hover:bg-orange/20 hover:text-orange transition-colors">
      <MessageSquare className="h-5 w-5" />
      {n > 0 && (
        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background"></span>
      )}
    </Link>
  );
}

function MsgCount() {
  const n = useUnreadMessages();
  return <>{n}</>;
}




