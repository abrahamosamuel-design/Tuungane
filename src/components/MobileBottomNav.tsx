import { Link } from "@tanstack/react-router";
import { Home, Wrench, User as UserIcon, ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CreateChoiceSheet } from "./CreateChoiceSheet";

export function MobileBottomNav() {
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          <Tab to="/" icon={<Home className="h-5 w-5" />} label="Home" exact />
          <Tab to="/services" icon={<Wrench className="h-5 w-5" />} label="Services" />
          <CreateTab onClick={() => setSheetOpen(true)} />
          <Tab to="/requests/browse" icon={<ClipboardList className="h-5 w-5" />} label="Service Requests" />
          {user ? (
            <Tab to="/u/$id" params={{ id: user.id }} icon={<UserIcon className="h-5 w-5" />} label="Profile" />
          ) : (
            <Tab to="/login" icon={<UserIcon className="h-5 w-5" />} label="Sign in" />
          )}
        </div>
      </nav>

      <div className="h-20 md:hidden" aria-hidden />
      <CreateChoiceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function CreateTab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Create on Tuungane"
      className="relative flex flex-1 flex-col items-center justify-end gap-0.5 px-2 pb-2 pt-1 text-[10px] font-semibold text-orange-foreground"
    >
      <span className="-mt-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange text-orange-foreground shadow-lg shadow-orange/30">
        <Plus className="h-5 w-5" />
      </span>
      <span className="text-orange">Create</span>
    </button>
  );
}

function Tab({ to, icon, label, exact, params }: { to: string; icon: React.ReactNode; label: string; exact?: boolean; params?: Record<string, string> }) {
  return (
    <Link
      to={to}
      params={params as never}
      activeOptions={{ exact }}
      activeProps={{ className: "text-orange" }}
      className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium text-muted-foreground"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
