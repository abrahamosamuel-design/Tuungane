import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

type AppealKind = "suspension" | "under_review" | "rejected_verification";

interface Props {
  open: boolean;
  onClose: () => void;
  profileKind: "service_profile" | "business_page";
  profileId: string;
  appealKind: AppealKind;
  relatedRequestId?: string | null;
  onSubmitted?: () => void;
}

const HEADINGS: Record<AppealKind, { title: string; help: string }> = {
  suspension: {
    title: "Appeal suspension",
    help: "Explain why your profile shouldn't be suspended. Include any context our team should consider.",
  },
  under_review: {
    title: "Respond to review",
    help: "Tell us your side. We'll review your message along with any reports on your profile.",
  },
  rejected_verification: {
    title: "Appeal rejected verification",
    help: "Tell us why this verification should be reconsidered. Add any new information or documents you can share.",
  },
};

export function AppealDialog({ open, onClose, profileKind, profileId, appealKind, relatedRequestId, onSubmitted }: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const h = HEADINGS[appealKind];

  const submit = async () => {
    if (message.trim().length < 10) {
      toast.error("Please write at least 10 characters explaining your appeal.");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post("/trust/appeal", {
        kind: profileKind,
        id: profileId,
        appeal_kind: appealKind,
        message: message.trim(),
        related_request_id: relatedRequestId ?? null,
      });
      toast.success("Appeal submitted. Our team will review it.");
      setMessage("");
      onSubmitted?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit appeal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <h2 className="font-display text-lg font-bold text-navy">{h.title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground">{h.help}</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Your appeal…"
          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} Submit appeal
          </button>
        </div>
      </div>
    </div>
  );
}
