import { Link } from "@tanstack/react-router";
import { ClipboardList, Sparkles, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CTA, listSkillHref } from "@/lib/cta";

export function CreateChoiceSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange">What would you like to do?</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-navy">Create on Tuungane</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Link
            to={CTA.createRequest.href}
            onClick={onClose}
            className="flex items-start gap-3 rounded-2xl border border-orange/30 bg-orange/5 p-4 transition hover:border-orange"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold text-navy">Create a Request</p>
              <p className="text-xs text-foreground/75">For customers who need help.</p>
            </div>
            <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-orange" />
          </Link>

          <Link
            to={listSkillHref(user) as never}
            onClick={onClose}
            className="flex items-start gap-3 rounded-2xl border border-green/30 bg-green/5 p-4 transition hover:border-green"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold text-navy">List Your Skill</p>
              <p className="text-xs text-foreground/75">For skilled people who want to offer their work.</p>
            </div>
            <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-green" />
          </Link>
        </div>
      </div>
    </div>
  );
}
