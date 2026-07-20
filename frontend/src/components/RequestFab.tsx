import { useRouterState } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CreateChoiceSheet } from "./CreateChoiceSheet";

const SHOW_ON = new Set<string>([
  "/",
  "/services",

  "/feed",
  "/official",
  "/requests",
  "/requests/browse",
]);

export function RequestFab() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  if (!user) return null;
  if (!SHOW_ON.has(pathname)) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Create on Tuungane"
        className="fixed bottom-[104px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange text-orange-foreground shadow-2xl shadow-orange/30 transition hover:brightness-110 md:bottom-8 md:right-8 md:h-auto md:w-auto md:px-5 md:py-3 md:gap-2"
      >
        <Plus className="h-6 w-6 md:h-5 md:w-5" />
        <span className="hidden font-semibold md:inline text-sm">Create</span>
      </button>
      <CreateChoiceSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
