import { useRouterState } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CreateChoiceSheet } from "./CreateChoiceSheet";

const SHOW_ON = new Set<string>([
  "/",
  "/services",
  
  "/feed",
  "/businesses",
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
        className="fixed bottom-8 right-8 z-40 hidden items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-orange-foreground shadow-2xl shadow-orange/30 transition hover:brightness-110 md:inline-flex"
      >
        <Plus className="h-5 w-5" /> Create
      </button>
      <CreateChoiceSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
