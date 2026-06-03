import { Link } from "@tanstack/react-router";
import { Menu, X, User as UserIcon, LogOut, LayoutDashboard, Shield, Rss, Briefcase, Wrench, ClipboardList, Coins, Building2, ChevronDown, Megaphone } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { CreditBalanceChip } from "./CreditBalanceChip";
import { useAuth } from "@/hooks/use-auth";

const primaryNavAuthed = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/businesses", label: "Businesses" },
  { to: "/requests", label: "My Requests" },
];

const primaryNavGuest = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/businesses", label: "Businesses" },
];

const moreNav = [
  { to: "/services/requests", label: "Service Feed" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/feed", label: "Community Feed" },
  { to: "/official", label: "Official" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const { user, loading, isModerator, signOut } = useAuth();
  const activeNav = user ? primaryNavAuthed : primaryNavGuest;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-9 w-auto" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {activeNav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-orange"
              activeProps={{ className: "text-orange" }}
              activeOptions={{ exact: n.to === "/" }}
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
                    <MenuItem to="/requests" icon={<ClipboardList className="h-4 w-4" />} label="My requests" onClick={() => setMenu(false)} />
                    <MenuItem to="/dashboard" icon={<Wrench className="h-4 w-4" />} label="Post a service" onClick={() => setMenu(false)} />
                    <MenuItem to="/me" icon={<UserIcon className="h-4 w-4" />} label="My profile" onClick={() => setMenu(false)} />
                    <MenuItem to="/credits" icon={<Coins className="h-4 w-4" />} label="Tuungane Credits" onClick={() => setMenu(false)} />
                    <div className="border-t border-border" />
                    <MenuItem to="/businesses/create" icon={<Building2 className="h-4 w-4" />} label="Create business page" onClick={() => setMenu(false)} />
                    <MenuItem to="/opportunities/new" icon={<Briefcase className="h-4 w-4" />} label="Post an opportunity" onClick={() => setMenu(false)} />
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
              <Link to="/login" className="text-sm font-medium text-navy hover:text-orange">Log in</Link>
              <Link to="/services" className="inline-flex items-center rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground shadow-sm transition-all hover:brightness-110">
                Request a service
              </Link>
            </>
          )}
        </div>
        <button aria-label="Toggle menu" className="rounded-md p-2 text-navy md:hidden" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-1 px-4 py-3">
            {activeNav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">{n.label}</Link>
            ))}
            <div className="my-2 border-t border-border" />
            <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">More</p>
            {moreNav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">{n.label}</Link>
            ))}
            {user ? (
              <>
                <div className="my-2 border-t border-border" />
                <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">My dashboard</Link>
                <Link to="/me" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">My profile</Link>
                <Link to="/businesses/create" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">Create business page</Link>
                <Link to="/opportunities/new" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">Post an opportunity</Link>
                {isModerator && <Link to="/admin" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">Admin</Link>}
                <button onClick={() => { setOpen(false); signOut(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-muted">Sign out</button>
              </>
            ) : (
              <Link to="/services" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-orange px-4 py-2 text-center text-sm font-semibold text-orange-foreground">
                Request a service
              </Link>
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
