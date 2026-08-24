import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, User as UserIcon, LogOut, LayoutDashboard, Shield, Rss, Wrench, ClipboardList, Coins, Building2, ChevronDown, Megaphone, Plus, Sparkles, MessageSquare, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { CreditBalanceChip } from "./CreditBalanceChip";
import { useCreditWallet } from "@/hooks/use-credits";
import { apiClient } from "@/lib/api";

import { useAuth } from "@/hooks/use-auth";
import { listSkillHref } from "@/lib/cta";

const primaryNav = [
  { to: "/", label: "Home", exact: true },
  { to: "/services", label: "Services", requiresAuth: true },
  { to: "/about", label: "About Us" },
];

export function Header() {
  const [menu, setMenu] = useState(false);
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
    <header className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-in-out ${isVisible ? "translate-y-0" : "-translate-y-full"}`}>

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
          <Link to="/" className="hidden md:flex -ml-1 items-center" aria-label="Tuungane home">
            <Logo className="h-14 w-auto" />
          </Link>
          
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
            {(() => {
              const navItems = user ? [
                { to: "/dashboard", label: "Home", exact: true },
                { to: "/services", label: "Services", exact: false },
                { to: "/messages", label: "Messages", exact: false },
                { to: "/u/$id", params: { id: user.id }, label: "Profile", exact: false },
              ] : [
                { to: "/", label: "Home", exact: true },
                { to: "/services", label: "Services", exact: false },
                { to: "/about", label: "About Us", exact: false },
              ];

              return navItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  params={n.params as never}
                  preload="intent"
                  className="text-sm font-medium text-navy/80 transition-colors hover:text-orange"
                  activeProps={{ className: "text-orange font-bold" }}
                  activeOptions={{ exact: n.exact }}
                >
                  {n.label}
                </Link>
              ));
            })()}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <>
            <CreditBalanceChip />
            <MessagesIconLink />
            <NotificationsBell />
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-navy hover:border-orange/60">
                <UserIcon className="h-4 w-4" /> {user.email?.split("@")[0]}
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                    <MenuItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="My dashboard" onClick={() => setMenu(false)} />
                    <MenuItem to="/messages" icon={<MessageSquare className="h-4 w-4" />} label="Messages" onClick={() => setMenu(false)} />
                    <MenuItem to="/requests" icon={<ClipboardList className="h-4 w-4" />} label="My Service Requests" onClick={() => setMenu(false)} />
                    <MenuItem to="/requests/new" icon={<Plus className="h-4 w-4" />} label="Post a Service Request" onClick={() => setMenu(false)} />
                    <MenuItem to={listSkillHref(user) as never} icon={<Sparkles className="h-4 w-4 text-green" />} label="List Your Service" onClick={() => setMenu(false)} />
                    <MenuItem to="/me" icon={<UserIcon className="h-4 w-4" />} label="My profile" onClick={() => setMenu(false)} />
                    <MenuItem to="/credits" icon={<Coins className="h-4 w-4" />} label="Tuungane Credits" onClick={() => setMenu(false)} />
                    <div className="border-t border-border" />
                    <MenuItem to="/feed" icon={<Rss className="h-4 w-4" />} label="Activity feed" onClick={() => setMenu(false)} />
                    <MenuItem to="/official" icon={<Megaphone className="h-4 w-4" />} label="Official updates" onClick={() => setMenu(false)} />
                    {isModerator && <MenuItem to="/admin" icon={<Shield className="h-4 w-4" />} label="Admin & moderation" onClick={() => setMenu(false)} />}
                    <button onClick={() => { setMenu(false); signOut(); }} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
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




