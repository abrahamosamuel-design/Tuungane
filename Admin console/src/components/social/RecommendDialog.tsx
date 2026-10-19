import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

export function RecommendDialog({ open, onClose, providerUserId }: { open: boolean; onClose: () => void; providerUserId: string }) {
  const { user } = useAuth();
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!user) return;
    if (user.id === providerUserId) { toast.error("You can't recommend yourself"); return; }
    if (!service.trim() || !message.trim()) { toast.error("Please complete all fields"); return; }
    setBusy(true);
    try {
      await apiClient.post("/social/recommendations", {
        provider_user_id: providerUserId, 
        service: service.trim(), 
        message: message.trim(), 
        rating
      });
      toast.success("Recommendation posted. Thank you!"); 
      onClose(); 
      setService(""); 
      setMessage("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to post recommendation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <h3 className="font-display text-xl font-bold text-navy">Recommend this provider</h3>
        <p className="mt-1 text-sm text-muted-foreground">Share your experience so others can find trusted help.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-navy">What service did they provide?</label>
            <input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Bathroom plumbing repair" className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
          </div>
          <div>
            <label className="text-xs font-medium text-navy">Your recommendation</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="I recommend… because…" className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
          </div>
          <div>
            <label className="text-xs font-medium text-navy">Rating (optional)</label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className={`h-9 w-9 rounded-full text-lg ${n <= rating ? "text-orange" : "text-muted-foreground"}`}>★</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-xl bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">Post recommendation</button>
        </div>
      </div>
    </div>
  );
}
