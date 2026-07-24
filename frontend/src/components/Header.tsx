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
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const { user, loading, isModerator, signOut } = useAuth();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  return (
    <header className="fixed inset-x-0 top-0 z-50">

      {/* Main Header Pill */}
      <div className="border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 md:h-[4.5rem] lg:h-[5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Mobile Header Layout */}
          <div className="flex w-full items-center justify-between md:hidden relative">
            <button aria-label="Toggle menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-navy transition-colors hover:bg-orange/20 hover:text-orange" onClick={() => setOpen((o) => !o)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center" aria-label="Tuungane home">
              <Logo className="h-7 w-auto" />
            </Link>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <MessagesIconLink />
                  <NotificationsBell />
                </>
              ) : (
                <Link to="/services" className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-navy transition-colors hover:bg-orange/20 hover:text-orange">
                  <Search className="h-5 w-5" />
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
      {open && (
        <div className="border-t border-border bg-background md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
          <div className="space-y-1 px-4 py-3 pb-24">
            <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Main</p>
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
                  onClick={() => setOpen(false)} 
                  className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted"
                >
                  {n.label}
                </Link>
              ));
            })()}
            {user ? (
              <>
                <div className="my-2 border-t border-border" />
                <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My Account</p>
                <CountedLink to="/messages" label="Messages" count={<MsgCount />} onClick={() => setOpen(false)} />
                <CountedLink to="/notifications" label="Notifications" count={<NotifCount />} onClick={() => setOpen(false)} />
                <CountedLink to="/requests" label="My Service Requests" count={<ActiveRequestsCount />} onClick={() => setOpen(false)} />
                <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">My Dashboard</Link>
                <Link to="/me" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">My Profile</Link>
                <MyCreditsLink onClick={() => setOpen(false)} />
                <Link to="/settings" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">Settings</Link>
                
                {isModerator && (
                  <>
                    <div className="my-2 border-t border-border" />
                    <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
                    <Link to="/admin" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">Admin</Link>
                  </>
                )}
                <div className="my-2 border-t border-border" />
                <Link to="/requests/new" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-orange px-4 py-2 text-center text-sm font-semibold text-orange-foreground">
                  Post a Service Request
                </Link>
                <Link to={listSkillHref(user) as never} onClick={() => setOpen(false)} className="mt-2 block rounded-full border border-green/40 bg-green/5 px-4 py-2 text-center text-sm font-semibold text-green">
                  List Your Service
                </Link>
                <button onClick={() => { setOpen(false); signOut(); }} className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-muted">Sign out</button>
              </>
            ) : (
              <>
                <div className="my-2 border-t border-border" />
                <Link to="/login" search={{ tab: "signup" } as never} onClick={() => setOpen(false)} className="mt-4 block rounded-full bg-orange px-4 py-2.5 text-center text-sm font-semibold text-orange-foreground shadow-sm transition-all hover:brightness-110">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

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

function useMyCounts() {
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
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-orange-foreground shadow-sm">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}

function MsgCount() {
  const n = useUnreadMessages();
  return <>{n}</>;
}




