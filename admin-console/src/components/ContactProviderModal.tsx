import { Lock, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  providerName?: string;
  onRequestService: () => void;
}

/**
 * Request-first modal. Never reveals contact info.
 * Shown when a customer taps "Contact provider" before a tracked request exists.
 */
export function ContactProviderModal({ open, onClose, providerName, onRequestService }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-orange">
          <Lock className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-navy">Contact options locked</h2>
        </div>
        <p className="mt-3 text-sm text-foreground/80">
          To help Tuungane track service quality and protect users, please request the service first.
          After submitting your request{providerName ? ` to ${providerName}` : ""}, you can <strong>Message on Tuungane</strong>, and the provider's phone number may be shown depending on their contact preference.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
          <p>Tracked requests unlock verified reviews, build provider trust scores, and protect both sides if there's a dispute.</p>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-navy hover:border-orange">
            Cancel
          </button>
          <button onClick={() => { onClose(); onRequestService(); }} className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-navy-foreground hover:brightness-110">
            Request service
          </button>
        </div>
      </div>
    </div>
  );
}
