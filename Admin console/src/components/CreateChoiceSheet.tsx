import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Newspaper, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listSkillHref } from "@/lib/cta";
import { AddTimelinePostDialog } from "@/components/AddTimelinePostDialog";
import { useQueryClient } from "@tanstack/react-query";

export function CreateChoiceSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  if (!open && !postDialogOpen) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange">
                  What would you like to do?
                </p>
                <h2 className="mt-0.5 font-display text-lg font-bold text-navy">
                  Create on Tuungane
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Option 1: List Your Service */}
              <Link
                to={listSkillHref(user) as never}
                onClick={onClose}
                className="flex items-start gap-3 rounded-2xl border border-orange/30 bg-orange/5 p-4 transition hover:border-orange hover:bg-orange/10"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange text-white shadow-sm shadow-orange/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-navy">
                    List Your Service
                  </p>
                  <p className="text-xs text-foreground/75">
                    Offer your services or promote your business on Tuungane.
                  </p>
                </div>
                <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-orange" />
              </Link>

              {/* Option 2: Post on Community Feed */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (!user) {
                    window.location.assign("/login?tab=login&redirect=/feed");
                    return;
                  }
                  setPostDialogOpen(true);
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-navy/20 bg-navy/[0.04] p-4 text-left transition hover:border-navy hover:bg-navy/[0.08] cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white shadow-sm shadow-navy/20">
                  <Newspaper className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-navy">
                    Post on Community Feed
                  </p>
                  <p className="text-xs text-foreground/75">
                    Share updates, advertise, or connect with the Tuungane community.
                  </p>
                </div>
                <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-navy" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Feed Post Creation Dialog */}
      <AddTimelinePostDialog
        open={postDialogOpen}
        onClose={() => setPostDialogOpen(false)}
        onPosted={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
          queryClient.invalidateQueries({ queryKey: ["community-updates"] });
        }}
      />
    </>
  );
}
