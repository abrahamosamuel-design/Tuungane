import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function ReviewDialog({ open, onClose, providerUserId, onPosted }: { open: boolean; onClose: () => void; providerUserId: string; onPosted?: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!user) return;
    if (user.id === providerUserId) { toast.error("You can't review yourself"); return; }
    setBusy(true);
    const { error } = await supabase.from("reviews").upsert({
      provider_user_id: providerUserId, user_id: user.id, rating, text: text.trim(),
    }, { onConflict: "provider_user_id,user_id" });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Review posted"); onClose(); onPosted?.(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <h3 className="font-display text-xl font-bold text-navy">Leave a review</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-navy">Rating</label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className={`h-10 w-10 rounded-full text-2xl ${n <= rating ? "text-orange" : "text-muted-foreground"}`}>★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-navy">Review (optional)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-xl bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">Post review</button>
        </div>
      </div>
    </div>
  );
}
