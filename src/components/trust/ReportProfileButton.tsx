import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { ProfileKind } from "@/hooks/use-trust-badges";

const REASONS = [
  "Scam or fraud",
  "Fake profile or impersonation",
  "Inappropriate content",
  "Harassment or abuse",
  "Misleading information",
  "Other",
];

export function ReportProfileButton({
  kind,
  id,
  className = "",
}: {
  kind: ProfileKind;
  id: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to report a profile");
      return;
    }
    if (!reason) {
      toast.error("Please choose a reason");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("profile_reports").insert({
      profile_kind: kind,
      profile_id: id,
      reporter_id: user.id,
      reason,
      description: description.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Report submitted. Our team will review it.");
    setOpen(false);
    setReason(REASONS[0]);
    setDescription("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-destructive/40 hover:text-destructive ${className}`}
      >
        <Flag className="h-3.5 w-3.5" /> Report profile
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold text-navy">Report this profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell our trust team what's wrong. Reports are private and reviewed by moderators.
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-navy/70">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-navy/70">
              Details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Add anything that will help our team review this report."
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
