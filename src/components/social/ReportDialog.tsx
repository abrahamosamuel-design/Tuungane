import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const REASONS = ["Fake profile", "Fraud or scam", "Abusive content", "Wrong category", "Misleading information", "Other"];

export function ReportDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: "post" | "comment" | "provider" | "recommendation" | "review" | "service_request" | "service_feedback"; targetId: string }) {
  const { user } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_type: targetType, target_id: targetId, reason, details: details.trim() || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Reported. Our team will review."); onClose(); setDetails(""); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <h3 className="font-display text-xl font-bold text-navy">Report {targetType}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-navy">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-navy">Details (optional)</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 min-h-11 text-sm font-medium text-muted-foreground">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-xl bg-destructive px-4 py-2.5 min-h-11 text-sm font-semibold text-white disabled:opacity-50">Submit report</button>
        </div>
      </div>
    </div>
  );
}
