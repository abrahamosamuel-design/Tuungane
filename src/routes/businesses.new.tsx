import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { businessOrgTypes, slugify } from "@/data/businessTypes";
import { categories } from "@/data/categories";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { Building2, Image as ImageIcon, Upload, Info, Briefcase, Sparkles, Trash2 } from "lucide-react";
import { BoostButton } from "@/components/BoostButton";

export const Route = createFileRoute("/businesses/new")({
  beforeLoad: () => {
    throw redirect({ to: "/businesses/create" });
  },
});

export const CreateBusinessRoute = createFileRoute("/businesses/create")({
  head: () => ({ meta: [{ title: "Create a business page — Tuungane" }] }),
  component: NewBusinessPage,
});

function NewBusinessPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", org_type: "business", category_slug: "", subcategory: "",
    description: "", district: "", town: "", area: "", address: "",
    contact_phone: "", whatsapp: "", email: "",
    services: "", products: "", opening_hours: "", website_or_social: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: "/businesses/create" } as never });
  }, [loading, user, nav]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { toast.error("Page name is required"); return; }
    setBusy(true);
    try {
      let logo_url: string | null = null;
      let cover_url: string | null = null;
      if (logo) logo_url = await uploadMedia(user.id, logo, "business-logos");
      if (cover) cover_url = await uploadMedia(user.id, cover, "business-covers");
      const base = slugify(form.name);
      const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("business_pages").insert({
        owner_id: user.id,
        slug,
        name: form.name.trim(),
        org_type: form.org_type,
        category_slug: form.category_slug || null,
        subcategory: form.subcategory || null,
        description: form.description.trim(),
        district: form.district || null,
        town: form.town || null,
        area: form.area || null,
        address: form.address || null,
        contact_phone: form.contact_phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        opening_hours: form.opening_hours.trim() ? { summary: form.opening_hours.trim() } : {},
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        products: form.products.split(",").map((s) => s.trim()).filter(Boolean),
        logo_url, cover_url,
        claim_status: "owned",
      }).select("slug").single();
      if (error) throw error;
      toast.success("Business page created");
      nav({ to: "/businesses/$slug", params: { slug: data!.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create page");
    } finally { setBusy(false); }
  };

  const cat = categories.find((c) => c.slug === form.category_slug);

  if (loading) return <Layout><div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</div></Layout>;
  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-orange"><Building2 className="h-4 w-4" /> Create a business page</div>
        <h1 className="text-3xl font-bold text-navy">Tell us about your organization</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set up your page in a minute. You can add posts, opportunities and services later.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label="Page name *">
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="e.g. Kabira Salon & Spa" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization type">
              <select value={form.org_type} onChange={(e) => set("org_type", e.target.value)} className="input">
                {businessOrgTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Service category">
              <select value={form.category_slug} onChange={(e) => { set("category_slug", e.target.value); set("subcategory", ""); }} className="input">
                <option value="">— Select —</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          {cat && (
            <Field label="Subcategory">
              <select value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} className="input">
                <option value="">— None —</option>
                {cat.subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          )}

          <Field label="Description">
            <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className="input" placeholder="What does your business or organization do?" />
          </Field>

          <Field label="Location">
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className="input" placeholder="Street, plot, landmark, or trading centre" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="District"><input value={form.district} onChange={(e) => set("district", e.target.value)} className="input" /></Field>
            <Field label="Town"><input value={form.town} onChange={(e) => set("town", e.target.value)} className="input" /></Field>
            <Field label="Area"><input value={form.area} onChange={(e) => set("area", e.target.value)} className="input" /></Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Phone"><input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="input" placeholder="07…" /></Field>
            <Field label="WhatsApp"><input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="input" placeholder="07…" /></Field>
            <Field label="Email (optional)"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" /></Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opening hours (optional)">
              <input value={form.opening_hours} onChange={(e) => set("opening_hours", e.target.value)} className="input" placeholder="Mon–Sat, 8am–6pm" />
            </Field>
            <Field label="Website or social link (optional)">
              <input value={form.website_or_social} onChange={(e) => set("website_or_social", e.target.value)} className="input" placeholder="https://... or @pagehandle" />
            </Field>
          </div>

          <Field label="Services offered">
            <input value={form.services} onChange={(e) => set("services", e.target.value)} className="input" placeholder="Haircut, Manicure, Bridal makeup" />
          </Field>
          <Field label="Products offered">
            <input value={form.products} onChange={(e) => set("products", e.target.value)} className="input" placeholder="Hair products, Cosmetics" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileField label="Logo" file={logo} setFile={setLogo} icon={<ImageIcon className="h-4 w-4" />} />
            <FileField label="Cover image" file={cover} setFile={setCover} icon={<Upload className="h-4 w-4" />} />
          </div>

          <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 text-navy" />
            <p>You can edit your page anytime. Use Tuungane Credits to feature your page, promote posts or feature opportunities. All paid visibility is clearly labeled.</p>
          </div>

          <button type="submit" disabled={busy} className="w-full rounded-full bg-orange px-6 py-3 text-sm font-semibold text-orange-foreground shadow-sm hover:brightness-110 disabled:opacity-60">
            {busy ? "Creating…" : "Create business page"}
          </button>
        </form>
      </section>

      <style>{`.input { width: 100%; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); padding: 0.625rem 0.875rem; border-radius: 0.5rem; font-size: 0.875rem; }`}</style>
    </Layout>
  );
}

type BusinessPageActionItem = {
  id: string;
  name: string;
  slug: string;
  verified: string;
  is_featured: boolean;
};

export function MyBusinessPagesPanel() {
  const { user } = useAuth();
  const [pages, setPages] = useState<BusinessPageActionItem[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("business_pages")
        .select("id,name,slug,verified,is_featured")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      setPages((data ?? []) as BusinessPageActionItem[]);
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">My Business Pages</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your pages, publish opportunities, and prepare them for featured placement later.</p>
        </div>
        <a href="/businesses/create" className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110">
          <Building2 className="h-4 w-4" /> Create business page
        </a>
      </div>

      {pages.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          You have not created any business pages yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {pages.map((page) => (
            <div key={page.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-navy">{page.name}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{page.verified}</span>
                  {page.is_featured && <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange">Featured</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Owned by you</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a href={`/businesses/${page.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">View page</a>
                <a href={`/businesses/${page.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">Edit page</a>
                <a href={`/dashboard?composeBusiness=${page.id}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">Post update</a>
                <a href={`/opportunities/new?businessPageId=${page.id}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange"><Briefcase className="h-3.5 w-3.5" /> Post opportunity</a>
                <BoostButton boostType="feature_business_page" entityType="business_page" entityId={page.id} label="Feature page" dialogTitle="Feature this business page" dialogDescription="Highlight this page in Tuungane business discovery spaces." isActive={page.is_featured} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange" />
                <DeleteBusinessPageButton pageId={page.id} pageName={page.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteBusinessPageButton({ pageId, pageName }: { pageId: string; pageName: string }) {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${pageName}?`)) return;
    setBusy(true);
    const { error } = await supabase.from("business_pages").delete().eq("id", pageId);
    setBusy(false);
    if (error) toast.error(error.message);
    else window.location.reload();
  };

  return (
    <button onClick={handleDelete} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60">
      <Trash2 className="h-3.5 w-3.5" /> {busy ? "Deleting…" : "Delete page"}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FileField({ label, file, setFile, icon }: { label: string; file: File | null; setFile: (f: File | null) => void; icon: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground hover:border-orange/60">
      {icon}
      <span className="flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-navy">{label}</span>
        <span>{file ? file.name : "Click to upload"}</span>
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
    </label>
  );
}
