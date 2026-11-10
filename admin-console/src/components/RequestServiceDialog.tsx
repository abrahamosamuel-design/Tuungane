import { useEffect, useState } from "react";
import { X, ShieldAlert, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { useCategories } from "@/hooks/use-categories";
import { urgencyOptions, contactMethods, budgetBuckets, visibilityOptions, type UrgencyValue, type ContactMethodValue, type VisibilityValue } from "@/data/serviceRequestTypes";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  providerId: string;
  providerName?: string;
  defaultCategorySlug?: string | null;
  defaultSubcategory?: string | null;
  onSubmitted?: () => void;
}

export function RequestServiceDialog({ open, onClose, providerId, providerName, defaultCategorySlug, defaultSubcategory, onSubmitted }: Props) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category_slug: defaultCategorySlug ?? "",
    subcategory: defaultSubcategory ?? "",
    service_needed: defaultSubcategory ?? "",
    location: "",
    district: "",
    town: "",
    description: "",
    preferred_date: "",
    preferred_time: "",
    urgency: "normal" as UrgencyValue,
    budget_range: "",
    visibility: "public" as VisibilityValue,
    preferred_contact_method: "any" as ContactMethodValue,
    customer_phone: "",
    customer_whatsapp: "",
    attachment_url: "",
  });

  useEffect(() => {
    if (open) {
      setForm((s) => ({
        ...s,
        category_slug: defaultCategorySlug ?? s.category_slug,
        subcategory: defaultSubcategory ?? s.subcategory,
        service_needed: s.service_needed || (defaultSubcategory ?? ""),
      }));
    }
  }, [open, defaultCategorySlug, defaultSubcategory]);

  if (!open) return null;
  const cat = categories.find((c) => c.slug === form.category_slug);

  const upload = async (f: File | null) => {
    if (!f || !user) return;
    setBusy(true);
    try {
      const url = await uploadMedia(user.id, f, "service-requests");
      setForm((s) => ({ ...s, attachment_url: url }));
      toast.success("Attachment uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!user) return toast.error("Please sign in");
    if (user.id === providerId) return toast.error("You can't request your own service");
    if (!form.service_needed.trim()) return toast.error("Tell us what service you need");
    if (!form.description.trim()) return toast.error("Add a short description");
    if (!form.location.trim()) return toast.error("Add a location");
    if (!form.customer_phone.trim()) return toast.error("Add a phone number");

    setBusy(true);
    const payload = {
      customer_id: user.id,
      provider_id: providerId,
      title: form.title.trim() ? form.title.trim().slice(0, 120) : null,
      category_slug: form.category_slug || null,
      subcategory: form.subcategory || null,
      service_needed: form.service_needed.trim().slice(0, 200),
      location: form.location.trim().slice(0, 200),
      district: form.district || null,
      town: form.town || null,
      description: form.description.trim().slice(0, 2000),
      preferred_date: form.preferred_date || null,
      preferred_time: form.preferred_time || null,
      urgency: form.urgency,
      budget_range: form.budget_range || null,
      visibility: form.visibility,
      preferred_contact_method: form.preferred_contact_method,
      customer_phone: form.customer_phone || null,
      customer_whatsapp: null,
      attachment_url: form.attachment_url || null,
    };
    try {
      await apiClient.post("/requests", payload);
      toast.success("Your service request has been sent. The provider can now contact you. Tuungane will ask for feedback after the service is completed.");
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not send request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-navy">Request a service</h2>
            {providerName && <p className="text-xs text-muted-foreground">from {providerName}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
          <p>Tuungane helps connect customers and service providers. Please agree on service details, pricing, timing, and safety before work begins. Report suspicious activity or misconduct to Tuungane.</p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Service category">
              <select value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value, subcategory: "" })} className={input}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Subcategory">
              {cat ? (
                <select value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value, service_needed: e.target.value })} className={input}>
                  <option value="">—</option>
                  {cat.subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className={input} placeholder="e.g. Plumbing repair" />
              )}
            </Field>
          </div>

          <Field label="Short title">
            <input maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} placeholder="e.g. Leaking sink in Katabi" />
          </Field>

          <Field label="Service needed *">
            <input maxLength={200} value={form.service_needed} onChange={(e) => setForm({ ...form, service_needed: e.target.value })} className={input} placeholder="e.g. Fix leaking kitchen sink" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Town"><input value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} className={input} /></Field>
            <Field label="District"><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={input} /></Field>
          </div>

          <Field label="Location / address *">
            <input maxLength={200} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={input} placeholder="e.g. Katabi, near the market" />
          </Field>

          <Field label="Description *">
            <textarea maxLength={2000} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} placeholder="Describe what you need done." />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Preferred date"><input type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} className={input} /></Field>
            <Field label="Preferred time"><input value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} className={input} placeholder="e.g. Morning" /></Field>
            <Field label="Urgency">
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as UrgencyValue })} className={input}>
                {urgencyOptions.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Budget / expected price range">
            <select value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} className={input}>
              <option value="">— Select a range —</option>
              {budgetBuckets.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          <Field label="Who can see this request?">
            <div className="grid gap-2 sm:grid-cols-2">
              {visibilityOptions.map((v) => (
                <button key={v.value} type="button" onClick={() => setForm({ ...form, visibility: v.value })} className={`rounded-xl border p-3 text-left text-xs ${form.visibility === v.value ? "border-orange bg-orange/5" : "border-border"}`}>
                  <p className="font-semibold text-navy">{v.label}</p>
                  <p className="mt-0.5 text-muted-foreground">{v.hint}</p>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone *"><input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className={input} placeholder="+256…" /></Field>
            <Field label="Preferred contact">
              <select value={form.preferred_contact_method} onChange={(e) => setForm({ ...form, preferred_contact_method: e.target.value as ContactMethodValue })} className={input}>
                {contactMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Attachment / photo (optional)">
            {form.attachment_url && <img src={form.attachment_url} alt="" className="mb-2 max-h-32 rounded-lg border border-border" />}
            <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0] ?? null)} className="text-xs" />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-navy hover:border-orange">Cancel</button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
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
