import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface AcceptJobDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  requestId: string;
  initialPrice: number;
  onAccepted: () => void;
}

export function AcceptJobDialog({ open, onOpenChange, requestId, initialPrice, onAccepted }: AcceptJobDialogProps) {
  const [price, setPrice] = useState<number>(initialPrice || 0);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient(`/service-requests/${requestId}/accept`, {
        method: "POST",
        body: JSON.stringify({ price_total: price }),
      });
      toast.success("Job accepted successfully!");
      onAccepted();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept job");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full top-auto bottom-0 translate-y-0 left-0 translate-x-0 rounded-b-none rounded-t-2xl sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:left-[50%] sm:translate-x-[-50%] sm:rounded-xl p-6 slide-in-from-bottom-1/2 sm:slide-in-from-bottom-0">
        <DialogHeader>
          <DialogTitle>Accept Job & Confirm Price</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5 py-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Final Agreed Price (UGX)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all"
              required
            />
            <p className="text-xs text-muted-foreground mt-2">
              Confirm or adjust the final price after discussing with the customer.
            </p>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange py-3.5 text-center text-sm font-bold text-white shadow-md hover:bg-orange/90 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Accept Job
            </button>
            <button type="button" onClick={() => onOpenChange(false)} className="w-full rounded-xl bg-gray-100 py-3.5 text-center text-sm font-bold text-gray-700 hover:bg-gray-200 active:scale-[0.98] transition-transform">
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
