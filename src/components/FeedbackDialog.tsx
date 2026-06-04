import { useState } from "react";
import { X, Star, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { ServiceRequestRow } from "@/data/serviceRequestTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  request: ServiceRequestRow | null;
  onSubmitted?: () => void;
}

const yesNoMaybe = ["Yes", "No", "Not sure"];
const useAgain = ["Yes", "No", "Maybe"];

export function FeedbackDialog({ open, onClose, request, onSubmitted }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    did_use_provider: true,
    was_completed: true,
    rating: 5,
    quality_rating: 5,
    timekeeping_rating: 5,
    communication_rating: 5,
    price_fairness_rating: 5,
    would_recommend: true,
    service_provided: "",
    review_text: "",
    was_on_time: "Yes",
    work_quality_good: "Yes",
    price_fair: "Yes",
    would_use_again: "Yes",
    issue_reported: false,
    issue_description: "",
  });

  if (!open || !request) return null;

  const submit = async () => {
    if (!user) return toast.error("Please sign in");
    if (!form.review_text.trim()) return toast.error("Please add a short review");
    const providerId = request.selected_provider_id ?? request.provider_id;
    if (!providerId) return toast.error("This request has no provider yet");
    setBusy(true);
    const payload = {
      service_request_id: request.id,
      customer_id: user.id,
      provider_id: providerId,
      did_use_provider: form.did_use_provider,
      was_completed: form.was_completed,
      rating: form.rating,
      quality_rating: form.quality_rating,
      timekeeping_rating: form.timekeeping_rating,
      communication_rating: form.communication_rating,
      price_fairness_rating: form.price_fairness_rating,
      would_recommend: form.would_recommend,
      service_provided: (form.service_provided || request.service_needed).slice(0, 200),
      review_text: form.review_text.trim().slice(0, 2000),
      was_on_time: form.was_on_time,
      work_quality_good: form.work_quality_good,
      price_fair: form.price_fair,
      would_use_again: form.would_use_again,
      issue_reported: form.issue_reported,
      issue_description: form.issue_reported ? form.issue_description.slice(0, 1000) : null,
      is_verified_review: true,
      is_visible: true,
    };
    const { error } = await supabase.from("service_feedback").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks! Your verified review has been posted.");
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy">
              <ShieldCheck className="h-5 w-5 text-green" /> Verified Service Review
            </h2>
            <p className="text-xs text-muted-foreground">How was your experience with this service provider?</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 rounded-xl border border-border bg-orange/5 p-3 text-xs text-foreground/80">
          Your feedback helps other users find trusted service providers and helps good providers grow.
        </div>

        <div className="space-y-3">
          <YesNo label="Did you actually use this service provider?" value={form.did_use_provider} onChange={(v) => setForm({ ...form, did_use_provider: v })} />
          <YesNo label="Was the service completed?" value={form.was_completed} onChange={(v) => setForm({ ...form, was_completed: v })} />

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy">Overall rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`} type="button">
                  <Star className={`h-7 w-7 ${n <= form.rating ? "fill-orange text-orange" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-xs font-semibold text-navy">Rate specific areas</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <StarRow label="Work quality" value={form.quality_rating} onChange={(v) => setForm({ ...form, quality_rating: v })} />
              <StarRow label="Timekeeping" value={form.timekeeping_rating} onChange={(v) => setForm({ ...form, timekeeping_rating: v })} />
              <StarRow label="Communication" value={form.communication_rating} onChange={(v) => setForm({ ...form, communication_rating: v })} />
              <StarRow label="Price fairness" value={form.price_fairness_rating} onChange={(v) => setForm({ ...form, price_fairness_rating: v })} />
            </div>
          </div>

          <YesNo label="Would you recommend this provider?" value={form.would_recommend} onChange={(v) => setForm({ ...form, would_recommend: v })} />

          <Field label="What service did they provide?">
            <input maxLength={200} value={form.service_provided} onChange={(e) => setForm({ ...form, service_provided: e.target.value })} placeholder={request.service_needed} className={input} />
          </Field>

          <Field label="Short review *">
            <textarea maxLength={2000} rows={4} value={form.review_text} onChange={(e) => setForm({ ...form, review_text: e.target.value })} className={input} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Pick label="Was the provider on time?" options={yesNoMaybe} value={form.was_on_time} onChange={(v) => setForm({ ...form, was_on_time: v })} />
            <Pick label="Was the work quality good?" options={yesNoMaybe} value={form.work_quality_good} onChange={(v) => setForm({ ...form, work_quality_good: v })} />
            <Pick label="Was the price fair?" options={yesNoMaybe} value={form.price_fair} onChange={(v) => setForm({ ...form, price_fair: v })} />
            <Pick label="Would you use this provider again?" options={useAgain} value={form.would_use_again} onChange={(v) => setForm({ ...form, would_use_again: v })} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.issue_reported} onChange={(e) => setForm({ ...form, issue_reported: e.target.checked })} />
            Any issue to report?
          </label>
          {form.issue_reported && (
            <textarea maxLength={1000} rows={2} value={form.issue_description} onChange={(e) => setForm({ ...form, issue_description: e.target.value })} className={input} placeholder="Describe the issue (optional)" />
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-navy hover:border-orange">Cancel</button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit verified review
          </button>
        </div>
      </div>
    </div>
  );
}

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-semibold text-navy">{label}</label>{children}</div>;
}
function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-2">
      <span className="text-sm text-navy">{label}</span>
      <div className="flex gap-1">
        <button type="button" onClick={() => onChange(true)} className={`rounded-full px-3 py-1 text-xs font-semibold ${value ? "bg-green text-green-foreground" : "border border-border"}`}>Yes</button>
        <button type="button" onClick={() => onChange(false)} className={`rounded-full px-3 py-1 text-xs font-semibold ${!value ? "bg-destructive text-destructive-foreground" : "border border-border"}`}>No</button>
      </div>
    </div>
  );
}
function Pick({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-navy">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} className={`rounded-full px-3 py-1 text-xs font-semibold ${value === o ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-navy">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${label} ${n} stars`}>
            <Star className={`h-4 w-4 ${n <= value ? "fill-orange text-orange" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
