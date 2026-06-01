import { Link } from "@tanstack/react-router";
import { Home, Rss, Wrench, Plus, User as UserIcon, X, Briefcase, Camera, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export function MobileBottomNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1">
          <Tab to="/" icon={<Home className="h-5 w-5" />} label="Home" exact />
          <Tab to="/services" icon={<Wrench className="h-5 w-5" />} label="Services" />
          <button
            aria-label="Create"
            onClick={() => setOpen(true)}
            className="-mt-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange text-orange-foreground shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </button>
          {user ? (
            <Tab to="/requests" icon={<ClipboardList className="h-5 w-5" />} label="Requests" />
          ) : (
            <Tab to="/feed" icon={<Rss className="h-5 w-5" />} label="Feed" />
          )}

          {user ? (
            <Tab to="/u/$id" params={{ id: user.id }} icon={<UserIcon className="h-5 w-5" />} label="Me" />
          ) : (
            <Tab to="/login" icon={<UserIcon className="h-5 w-5" />} label="Sign in" />
          )}
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full rounded-t-3xl bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-navy">Create</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-2">
              <SheetLink to="/dashboard" icon={<Camera className="h-5 w-5 text-orange" />} title="Post a work update" desc="Share completed jobs, photos, or progress" onClose={() => setOpen(false)} />
              <SheetLink to="/dashboard" icon={<Wrench className="h-5 w-5 text-navy" />} title="Post a service" desc="Add or update your service profile" onClose={() => setOpen(false)} />
              <SheetLink to="/opportunities/new" icon={<Briefcase className="h-5 w-5 text-green" />} title="Post an opportunity" desc="Gig, job, internship, or volunteer role" onClose={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="h-16 md:hidden" aria-hidden />
    </>
  );
}

function Tab({ to, icon, label, exact, params }: { to: string; icon: React.ReactNode; label: string; exact?: boolean; params?: Record<string, string> }) {
  return (
    <Link
      to={to}
      params={params as never}
      activeOptions={{ exact }}
      activeProps={{ className: "text-orange" }}
      className="flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium text-muted-foreground"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SheetLink({ to, icon, title, desc, onClose }: { to: string; icon: React.ReactNode; title: string; desc: string; onClose: () => void }) {
  return (
    <Link to={to} onClick={onClose} className="flex items-start gap-3 rounded-xl border border-border p-3 hover:border-orange">
      <div className="rounded-lg bg-muted p-2">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
