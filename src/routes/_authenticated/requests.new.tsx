import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { categories } from "@/data/categories";
import {
  budgetBuckets,
  contactMethods,
  urgencyOptions,
  visibilityOptions,
  type ContactMethodValue,
  type UrgencyValue,
  type VisibilityValue,
} from "@/data/serviceRequestTypes";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { REQUESTS_SAFETY_TEXT } from "@/data/requestTypes";

export const Route = createFileRoute("/_authenticated/requests/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    providerId: typeof search.providerId === "string" ? search.providerId : "",
  }),
  head: () => ({ meta: [{ title: "Create a Request — Tuungane" }] }),
  component: NewRequest,
});

function NewRequest() {
  const search = useSearch({ from: "/_authenticated/requests/new" });
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({
    title: "",
    category_slug: categories[0].slug,
    subcategory: categories[0].subcategories[0],
    description: "",
    location: "",
    district: "",
    town: "",
    area: "",
    urgency: "normal" as UrgencyValue,
    urgent_flag: false,
    budget_range: "",
    preferred_date: "",
    preferred_time: "",
    preferred_contact_method: "any" as ContactMethodValue,
    visibility: "public" as VisibilityValue,
    customer_phone: "",
    customer_whatsapp: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/login", search: { tab: "signup", redirect: "/requests/new" } as never });
    }
  }, [loading, user, nav]);

  const update = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const cat = categories.find((c) => c.slug === f.category_slug)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!f.title.trim() || !f.description.trim() || !f.location.trim()) {
      toast.error("Title, description, and location are required");
      return;
    }
    setBusy(true);
    let attachment_url: string | null = null;
    try {
      if (file) attachment_url = await uploadMedia(user.id, file, "requests");
    } catch (err) {
      console.error(err);
      toast.error("Photo upload failed");
      setBusy(false);
      return;
    }

    const targetedProvider = search.providerId || null;

    const { error } = await supabase.from("service_requests").insert({
      customer_id: user.id,
      provider_id: targetedProvider,
      category_slug: f.category_slug,
      subcategory: f.subcategory,
      service_needed: f.subcategory || cat.name,
      title: f.title.trim(),
      description: f.description.trim(),
      location: f.location.trim(),
      district: f.district.trim() || null,
      town: f.town.trim() || null,
      area: f.area.trim() || null,
      urgency: f.urgency,
      urgent_flag: f.urgent_flag,
      budget_range: f.budget_range || null,
      preferred_date: f.preferred_date || null,
      preferred_time: f.preferred_time || null,
      preferred_contact_method: f.preferred_contact_method,
      visibility: targetedProvider ? "matching_only" : f.visibility,
      customer_phone: f.customer_phone || null,
      customer_whatsapp: f.customer_whatsapp || null,
      attachment_url,
      status: "requested",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request posted");
    nav({ to: "/requests" });
  };

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</div>
      </Layout>
    );
  }
  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Create a Request</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell providers what you need.</p>

        <div className="mt-4 flex gap-3 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
          <ShieldAlert className="h-4 w-4 shrink-0 text-orange" />
          <p>{REQUESTS_SAFETY_TEXT}</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
          <Field label="What do you need help with? *">
            <input
              required
              value={f.title}
              maxLength={120}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Fix a leaking kitchen tap"
              className={inp}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category *">
              <select
                value={f.category_slug}
                onChange={(e) => {
                  update("category_slug", e.target.value);
                  update("subcategory", categories.find((c) => c.slug === e.target.value)!.subcategories[0]);
                }}
                className={inp}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sub-category">
              <select value={f.subcategory} onChange={(e) => update("subcategory", e.target.value)} className={inp}>
                {cat.subcategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Describe the request *">
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={f.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Share enough detail for a provider to give you a fair quote."
              className={`${inp} resize-none`}
            />
          </Field>

          <Field label="Where is the request located? *">
            <input
              required
              value={f.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Entebbe, Kampala, Wakiso"
              className={inp}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="District">
              <input value={f.district} onChange={(e) => update("district", e.target.value)} className={inp} />
            </Field>
            <Field label="Town">
              <input value={f.town} onChange={(e) => update("town", e.target.value)} className={inp} />
            </Field>
            <Field label="Area">
              <input value={f.area} onChange={(e) => update("area", e.target.value)} className={inp} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="When do you need help?">
              <select value={f.urgency} onChange={(e) => update("urgency", e.target.value as UrgencyValue)} className={inp}>
                {urgencyOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Budget range">
              <select value={f.budget_range} onChange={(e) => update("budget_range", e.target.value)} className={inp}>
                <option value="">Select…</option>
                {budgetBuckets.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.urgent_flag}
              onChange={(e) => update("urgent_flag", e.target.checked)}
            />
            Mark this request as urgent
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Preferred date">
              <input
                type="date"
                value={f.preferred_date}
                onChange={(e) => update("preferred_date", e.target.value)}
                className={inp}
              />
            </Field>
            <Field label="Preferred time">
              <input
                value={f.preferred_time}
                onChange={(e) => update("preferred_time", e.target.value)}
                placeholder="e.g. Morning"
                className={inp}
              />
            </Field>
          </div>

          <Field label="Photo (optional)">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact preference">
              <select
                value={f.preferred_contact_method}
                onChange={(e) => update("preferred_contact_method", e.target.value as ContactMethodValue)}
                className={inp}
              >
                {contactMethods.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Visibility">
              <select
                value={f.visibility}
                onChange={(e) => update("visibility", e.target.value as VisibilityValue)}
                className={inp}
                disabled={!!search.providerId}
              >
                {visibilityOptions.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone (optional)">
              <input value={f.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} className={inp} />
            </Field>
            <Field label="WhatsApp (optional)">
              <input value={f.customer_whatsapp} onChange={(e) => update("customer_whatsapp", e.target.value)} className={inp} />
            </Field>
          </div>

          <button
            disabled={busy}
            className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50"
          >
            {busy ? "Posting…" : "Post request"}
          </button>
        </form>
      </section>
    </Layout>
  );
}

const inp =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      {children}
    </div>
  );
}
