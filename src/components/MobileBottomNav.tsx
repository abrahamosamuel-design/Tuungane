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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)] backdrop-blur-md md:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-stretch">
          <Tab to="/" icon={<Home className="h-6 w-6" />} label="Home" exact />
          <Tab to="/services" icon={<Wrench className="h-6 w-6" />} label="Services" />
          <CreateTab onClick={() => setSheetOpen(true)} />
          <Tab to="/requests/browse" icon={<ClipboardList className="h-6 w-6" />} label="Service Requests" />
          {user ? (
            <Tab to="/u/$id" params={{ id: user.id }} icon={<UserIcon className="h-6 w-6" />} label="Profile" />
          ) : (
            <Tab to="/login" icon={<UserIcon className="h-6 w-6" />} label="Sign in" />
          )}
        </div>
      </nav>

      <div className="h-16 md:hidden" aria-hidden />
      <CreateChoiceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function CreateTab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Create on Tuungane"
      className="grid h-16 grid-rows-[26px_26px] content-center items-center justify-items-center gap-1 px-1"
    >
      <span className="flex items-center justify-center">
        <span className="-mt-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange text-orange-foreground shadow-lg shadow-orange/30">
          <Plus className="h-6 w-6" />
        </span>
      </span>
      <span className="flex items-end justify-center text-[11px] font-semibold leading-[1.1] text-orange">
        Create
      </span>
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
      className="grid h-16 grid-rows-[26px_26px] content-center items-center justify-items-center gap-1 px-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="flex h-full items-end justify-center text-[11px] font-medium leading-[1.1]">
        <span className="max-w-[3rem] text-center whitespace-normal">{label}</span>
      </span>
    </Link>
  );
}
