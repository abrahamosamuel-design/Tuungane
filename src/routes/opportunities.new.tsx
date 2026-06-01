import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { categories } from "@/data/categories";
import { opportunityTypes, posterTypes } from "@/data/opportunities";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { Info } from "lucide-react";

export const Route = createFileRoute("/opportunities/new")({
  head: () => ({ meta: [{ title: "Post an Opportunity — Tuungane" }] }),
  component: NewOpportunity,
});

function NewOpportunity() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState<Array<{ id: string; name: string; verified: string }>>([]);
  const [f, setF] = useState({
    title: "",
    opportunity_type: "gig" as (typeof opportunityTypes)[number]["value"],
    category_slug: categories[0].slug,
    subcategory: categories[0].subcategories[0],
    location: "",
    district: "",
    town: "",
    description: "",
    requirements: "",
    compensation: "",
    deadline: "",
    contact_phone: "",
    whatsapp_number: "",
    contact_email: "",
    poster_type: "individual" as (typeof posterTypes)[number]["value"],
    business_page_id: "" as string,
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "signup", redirect: "/opportunities/new" } as never });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("business_pages")
        .select("id,name,verified")
        .eq("owner_id", user.id)
        .eq("suspended", false)
        .order("name");
      setMyBusinesses((data ?? []) as Array<{ id: string; name: string; verified: string }>);
    })();
  }, [user]);


  const cat = categories.find((c) => c.slug === f.category_slug)!;

  const update = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!f.title.trim() || !f.location.trim() || !f.description.trim()) { toast.error("Title, location and description are required"); return; }
    if (!f.contact_phone && !f.whatsapp_number && !f.contact_email) { toast.error("Provide at least one contact method"); return; }
    setBusy(true);
    let image_url: string | null = null;
    try {
      if (file) image_url = await uploadMedia(user.id, file, "opportunities");
    } catch (err) { console.error(err); toast.error("Image upload failed"); setBusy(false); return; }

    const { error } = await supabase.from("opportunities").insert({
      title: f.title.trim(),
      opportunity_type: f.opportunity_type,
      category_slug: f.category_slug,
      subcategory: f.subcategory,
      location: f.location.trim(),
      district: f.district || null,
      town: f.town || null,
      description: f.description.trim(),
      requirements: f.requirements || null,
      compensation: f.compensation || null,
      deadline: f.deadline || null,
      contact_phone: f.contact_phone || null,
      whatsapp_number: f.whatsapp_number || null,
      contact_email: f.contact_email || null,
      image_url,
      poster_id: user.id,
      poster_type: f.poster_type,
      status: "pending",
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Opportunity submitted for review"); nav({ to: "/dashboard" }); }
  };

  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Post an Opportunity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find skilled people for a gig, job, internship, volunteer role, or apprenticeship.</p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
          <p>Only skills-based and service-related opportunities are allowed on Tuungane MVP. Grants, scholarships, fellowships, and unrelated opportunities are not allowed at this stage.</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
          <Field label="Opportunity title *"><input required value={f.title} maxLength={120} onChange={(e) => update("title", e.target.value)} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type *">
              <select value={f.opportunity_type} onChange={(e) => update("opportunity_type", e.target.value as never)} className={inp}>
                {opportunityTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Posted as">
              <select value={f.poster_type} onChange={(e) => update("poster_type", e.target.value as never)} className={inp}>
                {posterTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service category *">
              <select value={f.category_slug} onChange={(e) => { update("category_slug", e.target.value); update("subcategory", categories.find((c) => c.slug === e.target.value)!.subcategories[0]); }} className={inp}>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Sub-category">
              <select value={f.subcategory} onChange={(e) => update("subcategory", e.target.value)} className={inp}>
                {cat.subcategories.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Location *"><input required value={f.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Entebbe, Kampala" className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="District"><input value={f.district} onChange={(e) => update("district", e.target.value)} className={inp} /></Field>
            <Field label="Town"><input value={f.town} onChange={(e) => update("town", e.target.value)} className={inp} /></Field>
          </div>
          <Field label="Description *"><textarea required rows={5} maxLength={2000} value={f.description} onChange={(e) => update("description", e.target.value)} className={`${inp} resize-none`} /></Field>
          <Field label="Requirements"><textarea rows={3} maxLength={1000} value={f.requirements} onChange={(e) => update("requirements", e.target.value)} className={`${inp} resize-none`} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Compensation / payment"><input value={f.compensation} onChange={(e) => update("compensation", e.target.value)} placeholder="e.g. UGX 50,000 per day" className={inp} /></Field>
            <Field label="Deadline"><input type="date" value={f.deadline} onChange={(e) => update("deadline", e.target.value)} className={inp} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input value={f.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} className={inp} /></Field>
            <Field label="WhatsApp"><input value={f.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} className={inp} /></Field>
          </div>
          <Field label="Email (optional)"><input type="email" value={f.contact_email} onChange={(e) => update("contact_email", e.target.value)} className={inp} /></Field>
          <Field label="Image / flyer (optional)"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" /></Field>

          <p className="text-xs text-muted-foreground">Your opportunity will be reviewed before going live (status: Pending).</p>
          <button disabled={busy} className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50">{busy ? "Submitting…" : "Submit opportunity"}</button>
        </form>
      </section>
    </Layout>
  );
}

const inp = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      {children}
    </div>
  );
}
