import { useEffect, useState } from "react";
import { X, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { toastError } from "@/lib/user-errors";
import { contactMethods, type ContactMethodValue, type ProviderResponseRow } from "@/data/serviceRequestTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  requestId: string;
  existing?: ProviderResponseRow | null;
  onSaved?: () => void;
}

export function ProviderResponseDialog({ open, onClose, requestId, existing, onSaved }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    message: "",
    quote_amount: "" as string,
    availability_note: "",
    estimated_time: "",
    contact_preference: "in_app" as ContactMethodValue,
  });

  useEffect(() => {
    if (open && existing) {
      setForm({
        message: existing.message ?? "",
        quote_amount: existing.quote_amount?.toString() ?? "",
        availability_note: existing.availability_note ?? "",
        estimated_time: existing.estimated_time ?? "",
        contact_preference: (existing.contact_preference ?? "in_app") as ContactMethodValue,
      });
    } else if (open) {
      setForm({ message: "", quote_amount: "", availability_note: "", estimated_time: "", contact_preference: "in_app" });
    }
  }, [open, existing]);

  if (!open) return null;

  const submit = async () => {
    if (!user) return toast.error("Please sign in");
    if (!form.message.trim()) return toast.error("Add a short message to the requester");
    setBusy(true);
    const payload = {
      request_id: requestId,
      provider_id: user.id,
      message: form.message.trim().slice(0, 2000),
      quote_amount: form.quote_amount ? Number(form.quote_amount) : null,
      availability_note: form.availability_note.trim().slice(0, 200) || null,
      estimated_time: form.estimated_time.trim().slice(0, 100) || null,
      contact_preference: form.contact_preference,
    };
    const { error } = existing
      ? await supabase.from("provider_responses").update(payload).eq("id", existing.id)
      : await supabase.from("provider_responses").insert(payload);
    setBusy(false);
    if (error) return toastError(error, "Couldn't send your response");
    toast.success(existing ? "Response updated" : "Response sent", {
      description: "The requester will see it in their request.",
    });
    onSaved?.();
    onClose();
  };

  const withdraw = async () => {
    if (!existing) return;
    setBusy(true);
    const { error } = await supabase.from("provider_responses").update({ status: "withdrawn" }).eq("id", existing.id);
    setBusy(false);
    if (error) return toastError(error, "Couldn't withdraw response");
    toast.success("Response withdrawn");
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-navy">{existing ? "Update your response" : "Respond to this request"}</h2>
            <p className="text-xs text-muted-foreground">Send a quote and message. The requester can compare responses and choose a provider.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
          <p>Be honest and clear. Tuungane verifies completed jobs and reviews — quality builds your trust score.</p>
        </div>

        <div className="space-y-3">
          <Field label="Message to requester *">
            <textarea rows={4} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={input} placeholder="Hi, I can help with this. Here's what I'd do…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quote (UGX) — optional">
              <input type="number" min="0" value={form.quote_amount} onChange={(e) => setForm({ ...form, quote_amount: e.target.value })} className={input} placeholder="e.g. 75000" />
            </Field>
            <Field label="Estimated time">
              <input value={form.estimated_time} onChange={(e) => setForm({ ...form, estimated_time: e.target.value })} className={input} placeholder="e.g. 2 hours" />
            </Field>
          </div>
          <Field label="Availability">
            <input value={form.availability_note} onChange={(e) => setForm({ ...form, availability_note: e.target.value })} className={input} placeholder="e.g. Available tomorrow morning" />
          </Field>
          <Field label="Preferred contact method">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {contactMethods.map((m) => {
                const active = form.contact_preference === m.value;
                return (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => setForm({ ...form, contact_preference: m.value })}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${active ? "border-orange bg-orange/10 text-orange" : "border-border bg-background text-navy hover:border-orange/60"}`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {existing ? (
            <button onClick={withdraw} disabled={busy} className="rounded-full border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">Withdraw</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-navy hover:border-orange">Cancel</button>
            <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {existing ? "Update response" : "Send response"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-semibold text-navy">{label}</label>{children}</div>;
}
