import { Link } from "@tanstack/react-router";
import { Menu, X, User as UserIcon, LogOut, LayoutDashboard, Shield, Rss, Wrench, ClipboardList, Coins, Building2, ChevronDown, Megaphone, Plus, Sparkles, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { CreditBalanceChip } from "./CreditBalanceChip";
import { useCreditWallet } from "@/hooks/use-credits";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/use-auth";
import { listSkillHref } from "@/lib/cta";

const primaryNav = [
  { to: "/", label: "Home", exact: true },
  { to: "/services", label: "Services" },
  { to: "/requests/browse", label: "Requests" },
  { to: "/services/requests", label: "Work Feed" },
  { to: "/businesses", label: "Businesses" },
];

const moreNav = [
  { to: "/feed", label: "Community Feed" },
  { to: "/official", label: "Official" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const { user, loading, isModerator, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-9 w-auto" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {primaryNav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-orange"
              activeProps={{ className: "text-orange" }}
              activeOptions={{ exact: n.exact }}
            >
              {n.label}
            </Link>
          ))}
          <div className="relative">
            <button onClick={() => setMore((m) => !m)} className="inline-flex items-center gap-1 text-sm font-medium text-foreground/70 transition-colors hover:text-orange">
              More <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {more && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMore(false)} />
                <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {moreNav.map((n) => (
                    <Link key={n.to} to={n.to} onClick={() => setMore(false)} className="block px-3 py-2.5 text-sm text-navy hover:bg-muted">{n.label}</Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <>
            <CreditBalanceChip />
            <MessagesIconLink />
            <NotificationsBell />
            <Link to={listSkillHref(user) as never} className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-green/40 bg-green/5 px-3 py-2 text-sm font-semibold text-green transition hover:bg-green/10">
              <Sparkles className="h-4 w-4" /> List Your Skill
            </Link>
            <Link to="/requests/new" className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground shadow-sm transition-all hover:brightness-110">
              <Plus className="h-4 w-4" /> Create a Request
            </Link>
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
                    <MenuItem to="/requests" icon={<ClipboardList className="h-4 w-4" />} label="My Requests" onClick={() => setMenu(false)} />
                    <MenuItem to="/requests/new" icon={<Plus className="h-4 w-4" />} label="Create a Request" onClick={() => setMenu(false)} />
                    <MenuItem to={listSkillHref(user) as never} icon={<Sparkles className="h-4 w-4 text-green" />} label="List Your Skill" onClick={() => setMenu(false)} />
                    <MenuItem to="/me" icon={<UserIcon className="h-4 w-4" />} label="My profile" onClick={() => setMenu(false)} />
                    <MenuItem to="/credits" icon={<Coins className="h-4 w-4" />} label="Tuungane Credits" onClick={() => setMenu(false)} />
                    <div className="border-t border-border" />
                    <MenuItem to="/businesses/create" icon={<Building2 className="h-4 w-4" />} label="Create business page" onClick={() => setMenu(false)} />
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
            <>
              <Link to="/login" className="text-sm font-medium text-navy hover:text-orange">Sign in</Link>
              <Link to={listSkillHref(null) as never} className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-green/40 bg-green/5 px-3 py-2 text-sm font-semibold text-green transition hover:bg-green/10">
                <Sparkles className="h-4 w-4" /> List Your Skill
              </Link>
              <Link to="/requests/new" className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground shadow-sm transition-all hover:brightness-110">
                <Plus className="h-4 w-4" /> Create a Request
              </Link>
            </>
          )}
        </div>
        <button aria-label="Toggle menu" className="rounded-md p-2 text-navy md:hidden" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
          <div className="space-y-1 px-4 py-3 pb-24">
            <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Main</p>
            {primaryNav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">{n.label}</Link>
            ))}
            <div className="my-2 border-t border-border" />
            <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">More</p>
            {moreNav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">{n.label}</Link>
            ))}
            {user ? (
              <>
                <div className="my-2 border-t border-border" />
                <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My Account</p>
                <CountedLink to="/messages" label="Messages" count={<MsgCount />} onClick={() => setOpen(false)} />
                <CountedLink to="/notifications" label="Notifications" count={<NotifCount />} onClick={() => setOpen(false)} />
                <CountedLink to="/requests" label="My Requests" count={<ActiveRequestsCount />} onClick={() => setOpen(false)} />
                <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">My Dashboard</Link>
                <Link to="/me" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">My Profile</Link>
                <MyCreditsLink onClick={() => setOpen(false)} />
                <Link to="/settings" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">Settings</Link>
                <Link to="/businesses/create" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">Create Business Page</Link>
                {isModerator && (
                  <>
                    <div className="my-2 border-t border-border" />
                    <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
                    <Link to="/admin" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">Admin</Link>
                  </>
                )}
                <div className="my-2 border-t border-border" />
                <Link to="/requests/new" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-orange px-4 py-2 text-center text-sm font-semibold text-orange-foreground">
                  Create a Request
                </Link>
                <Link to={listSkillHref(user) as never} onClick={() => setOpen(false)} className="mt-2 block rounded-full border border-green/40 bg-green/5 px-4 py-2 text-center text-sm font-semibold text-green">
                  List Your Skill
                </Link>
                <button onClick={() => { setOpen(false); signOut(); }} className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-muted">Sign out</button>
              </>
            ) : (
              <>
                <div className="my-2 border-t border-border" />
                <Link to="/requests/new" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-orange px-4 py-2 text-center text-sm font-semibold text-orange-foreground">
                  Create a Request
                </Link>
                <Link to={listSkillHref(null) as never} onClick={() => setOpen(false)} className="mt-2 block rounded-full border border-green/40 bg-green/5 px-4 py-2 text-center text-sm font-semibold text-green">
                  List Your Skill
                </Link>
              </>
            )}
          </div>
        </div>
      )}

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

function NotifCount() {
  const { user } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user) { setN(0); return; }
    let active = true;
    const load = async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      if (active) setN(count ?? 0);
    };
    load();
    const ch = supabase.channel(`hdr-notif-${user.id}-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user?.id]);
  return <>{n}</>;
}

function ActiveRequestsCount() {
  const { user } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user) { setN(0); return; }
    let active = true;
    const load = async () => {
      const { count } = await supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", user.id)
        .not("status", "in", "(completed,cancelled)");
      if (active) setN(count ?? 0);
    };
    load();
  }, [user?.id]);
  return <>{n}</>;
}

function useUnreadMessages() {
  const { user } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user) { setN(0); return; }
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_unread_message_count");
      if (active) setN((data as number) ?? 0);
    };
    load();
    const ch = supabase.channel(`hdr-msgs-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user?.id]);
  return n;
}

function MessagesIconLink() {
  const n = useUnreadMessages();
  return (
    <Link to="/messages" aria-label="Messages" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-muted">
      <MessageSquare className="h-5 w-5" />
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-orange-foreground">
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




