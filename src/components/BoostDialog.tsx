import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Coins, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useBoostPricing, activateBoost, type BoostType } from "@/hooks/use-boosts";
import { useCreditWallet } from "@/hooks/use-credits";

interface Props {
  open: boolean;
  onClose: () => void;
  boostType: BoostType;
  entityType: string;
  entityId: string;
  title?: string;
  description?: string;
  onActivated?: () => void;
}

export function BoostDialog({ open, onClose, boostType, entityType, entityId, title, description, onActivated }: Props) {
  const pricing = useBoostPricing(boostType);
  const { balance, refresh } = useCreditWallet();
  const [busy, setBusy] = useState<string | null>(null);

  if (!open) return null;

  const buy = async (pricingId: string, credits: number, label: string) => {
    if ((balance ?? 0) < credits) {
      toast.error("Not enough credits. Buy more to activate this boost.");
      return;
    }
    setBusy(pricingId);
    try {
      await activateBoost(pricingId, entityType, entityId);
      toast.success(`${label} activated`);
      await refresh();
      onActivated?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to activate boost";
      toast.error(msg.includes("insufficient_credits") ? "Not enough credits" : msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange"><Sparkles className="h-4 w-4" /> Tuungane Boost</div>
            <h2 className="mt-1 font-display text-lg font-bold text-navy">{title ?? "Activate a boost"}</h2>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Your balance</span>
          <span className="inline-flex items-center gap-1 font-semibold text-navy"><Coins className="h-4 w-4 text-orange" />{balance ?? 0} credits</span>
        </div>

        <div className="space-y-2">
          {pricing.length === 0 && <p className="text-sm text-muted-foreground">No boost options available.</p>}
          {pricing.map((p) => {
            const enough = (balance ?? 0) >= p.credits_required;
            return (
              <button
                key={p.id}
                disabled={busy !== null}
                onClick={() => buy(p.id, p.credits_required, p.label)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${enough ? "border-border hover:border-orange" : "border-border opacity-60"}`}
              >
                <div>
                  <p className="text-sm font-semibold text-navy">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(p.duration_hours / 24 * 10) / 10} day{p.duration_hours === 24 ? "" : "s"} · {p.credits_required} credits</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1 text-xs font-semibold text-orange-foreground">
                  {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coins className="h-3 w-3" />}
                  {p.credits_required}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Boosts increase your visibility. Trust score and verification still determine the underlying ranking.
          Need more credits? <Link to="/credits" className="text-orange underline">Visit Credits</Link>.
        </p>
      </div>
    </div>
  );
}
