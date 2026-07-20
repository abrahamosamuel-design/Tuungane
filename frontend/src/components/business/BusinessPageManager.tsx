import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Briefcase, Image as ImageIcon, Info, Trash2, Upload } from "lucide-react";

import { BoostButton } from "@/components/BoostButton";
import { AreaAutocomplete } from "@/components/AreaAutocomplete";
import { MapPicker } from "@/components/MapPicker";
import { findDistrictBounds, type Bounds } from "@/lib/geocoding";
import { useCategories } from "@/hooks/use-categories";
import { businessOrgTypes, slugify } from "@/data/businessTypes";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";


type BusinessPageRow = {
  id: string;
  name: string;
  slug: string;
  verified: string;
  is_featured: boolean;
};

export function BusinessPageCreateForm() {
  const { user, loading } = useAuth();
  const { categories } = useCategories();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    org_type: "business",
    category_slug: "",
    subcategory: "",
    description: "",
    address: "",
    district: "",
    town: "",
    area: "",
    contact_phone: "",
    whatsapp: "",
    email: "",
    opening_hours: "",
    website_or_social: "",
    services: "",
    products: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [districtBounds, setDistrictBounds] = useState<Bounds | null>(null);


  useEffect(() => {
    if (loading || user) return;
    // Double-check directly with Supabase before redirecting — guards against
    // a brief window where the auth context hasn't finished hydrating the
    // session from storage on a fresh navigation.
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        nav({ to: "/login", search: { tab: "login", redirect: "/businesses/create" } as never });
      }
    });
    return () => { cancelled = true; };
  }, [loading, user, nav]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === form.category_slug),
    [form.category_slug],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Business name is required");
      return;
    }

    setBusy(true);

    try {
      let logo_url: string | null = null;
      let cover_url: string | null = null;

      if (logo) logo_url = await uploadMedia(user.id, logo, "business-logos");
      if (cover) cover_url = await uploadMedia(user.id, cover, "business-covers");

      const baseSlug = slugify(form.name);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const openingHoursPayload = {
        ...(form.opening_hours.trim() ? { summary: form.opening_hours.trim() } : {}),
        ...(form.website_or_social.trim() ? { website_or_social: form.website_or_social.trim() } : {}),
      };

      const { data, error } = await supabase
        .from("business_pages")
        .insert({
          owner_id: user.id,
          slug,
          name: form.name.trim(),
          org_type: form.org_type,
          category_slug: form.category_slug || null,
          subcategory: form.subcategory || null,
          description: form.description.trim(),
          address: form.address.trim() || null,
          district: form.district.trim() || null,
          town: form.town.trim() || null,
          area: form.area.trim() || null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,

          contact_phone: form.contact_phone.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          email: form.email.trim() || null,
          opening_hours: openingHoursPayload,
          services: form.services.split(",").map((item) => item.trim()).filter(Boolean),
          products: form.products.split(",").map((item) => item.trim()).filter(Boolean),
          logo_url,
          cover_url,
          claim_status: "owned",
        })
        .select("slug")
        .single();

      if (error) throw error;

      toast.success("Business page created");
      nav({ to: "/businesses/$slug", params: { slug: data.slug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create business page");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-orange"><Building2 className="h-4 w-4" /> Create a Business Page</div>
      <h1 className="text-3xl font-bold text-navy">Create a Business Page</h1>
      <p className="mt-2 text-sm text-muted-foreground">Set up your page now, then use it for updates, requests, and business discovery across Tuungane.</p>

      <div className="mt-4 rounded-lg border border-navy/15 bg-navy/5 p-3 text-xs text-navy/80">
        New pages start as <strong>Unverified</strong>. You can earn higher trust by completing your page, getting reviews, and—when you're ready—requesting manual verification from Tuungane. Business and organization profiles may require verification before receiving a verified badge.
      </div>

      <form onSubmit={submit} className="mt-8 space-y-5">

        <Field label="Business name">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="e.g. Kabira Salon & Spa" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business category">
            <select value={form.category_slug} onChange={(e) => { set("category_slug", e.target.value); set("subcategory", ""); }} className="input">
              <option value="">— Select —</option>
              {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Organization type">
            <select value={form.org_type} onChange={(e) => set("org_type", e.target.value)} className="input">
              {businessOrgTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </Field>
        </div>

        {selectedCategory && (
          <Field label="Subcategory">
            <select value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} className="input">
              <option value="">— None —</option>
              {selectedCategory.subcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
            </select>
          </Field>
        )}

        <Field label="Description">
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className="input" placeholder="What does your business or organization do?" />
        </Field>

        <Field label="Location">
          <input value={form.address} onChange={(e) => set("address", e.target.value)} className="input" placeholder="Street, plot, landmark, or trading centre" />
        </Field>

        <Field label="Search for a precise place (optional)">
          <AreaAutocomplete
            placeholder="Search for a town, area, or neighbourhood…"
            bounds={districtBounds}
            onSelect={(p) => {
              setForm((s) => ({
                ...s,
                district: p.district ?? s.district,
                town: p.town ?? s.town,
                area: p.area ?? s.area,
              }));
              setCoords({ lat: p.latitude, lng: p.longitude });
              if (p.bounds) setDistrictBounds(p.bounds);
              if (p.district) {
                findDistrictBounds(p.district).then((b) => {
                  if (b) setDistrictBounds(b);
                });
              }
            }}
          />
        </Field>

        <MapPicker
          latitude={coords?.lat ?? null}
          longitude={coords?.lng ?? null}
          bounds={districtBounds}
          onChange={(lat, lng, place) => {
            setCoords({ lat, lng });
            if (!place) return;
            setForm((s) => ({
              ...s,
              district: place.district ?? s.district,
              town: place.town ?? s.town,
              area: place.area ?? s.area,
            }));
            if (place.district) {
              findDistrictBounds(place.district).then((b) => {
                if (b) setDistrictBounds(b);
              });
            }
          }}
        />


        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="District"><input value={form.district} onChange={(e) => set("district", e.target.value)} className="input" /></Field>
          <Field label="Town"><input value={form.town} onChange={(e) => set("town", e.target.value)} className="input" /></Field>
          <Field label="Area"><input value={form.area} onChange={(e) => set("area", e.target.value)} className="input" /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact phone"><input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="input" placeholder="07…" /></Field>
          <Field label="Email, optional"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opening hours, optional">
            <input value={form.opening_hours} onChange={(e) => set("opening_hours", e.target.value)} className="input" placeholder="Mon–Sat, 8am–6pm" />
          </Field>
          <Field label="Website/social link, optional">
            <input value={form.website_or_social} onChange={(e) => set("website_or_social", e.target.value)} className="input" placeholder="https://... or @pagehandle" />
          </Field>
        </div>

        <Field label="Services or products offered">
          <input value={form.services} onChange={(e) => set("services", e.target.value)} className="input" placeholder="Haircut, manicure, bridal makeup" />
        </Field>
        <Field label="Products offered, optional">
          <input value={form.products} onChange={(e) => set("products", e.target.value)} className="input" placeholder="Hair products, cosmetics" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <FileField label="Logo upload, optional" file={logo} setFile={setLogo} icon={<ImageIcon className="h-4 w-4" />} />
          <FileField label="Cover image upload, optional" file={cover} setFile={setCover} icon={<Upload className="h-4 w-4" />} />
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 text-navy" />
          <p>Any signed-in user can create a business page in this MVP. Verification and featured placement can happen later without blocking basic creation now.</p>
        </div>

        <button type="submit" disabled={busy} className="w-full rounded-full bg-orange px-6 py-3 text-sm font-semibold text-orange-foreground shadow-sm hover:brightness-110 disabled:opacity-60">
          {busy ? "Creating…" : "Create Business Page"}
        </button>
      </form>

      <style>{`.input { width: 100%; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); padding: 0.625rem 0.875rem; border-radius: 0.5rem; font-size: 0.875rem; }`}</style>
    </section>
  );
}

export function MyBusinessPagesPanel() {
  const { user } = useAuth();
  const [pages, setPages] = useState<BusinessPageRow[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("business_pages")
        .select("id,name,slug,verified,is_featured")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      setPages((data ?? []) as BusinessPageRow[]);
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">My Business Pages</h2>
          <p className="mt-1 text-sm text-muted-foreground">View, edit, post updates, create requests, or feature your pages as Tuungane grows.</p>
        </div>
        <Link to="/businesses/create" className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110">
          <Building2 className="h-4 w-4" /> Create business page
        </Link>
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
                <Link to="/businesses/$slug" params={{ slug: page.slug }} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">View page</Link>
                <Link to="/businesses/$slug" params={{ slug: page.slug }} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">Edit page</Link>
                <Link to="/dashboard" search={{ composeBusiness: page.id } as never} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">Post update</Link>
                <Link to="/requests/new" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange"><Briefcase className="h-3.5 w-3.5" /> Post a Service Request</Link>
                <BoostButton boostType="feature_business_page" entityType="business_page" entityId={page.id} label="Feature page" dialogTitle="Feature this business page" dialogDescription="Highlight this page in business discovery areas across Tuungane." isActive={page.is_featured} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange" />
                <DeleteBusinessPageButton pageId={page.id} pageName={page.name} onDeleted={() => setPages((current) => current.filter((item) => item.id !== page.id))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteBusinessPageButton({ pageId, pageName, onDeleted }: { pageId: string; pageName: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${pageName}?`)) return;

    setBusy(true);
    const { error } = await supabase.from("business_pages").delete().eq("id", pageId);
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Business page deleted");
    onDeleted();
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

function FileField({ label, file, setFile, icon }: { label: string; file: File | null; setFile: (file: File | null) => void; icon: React.ReactNode }) {
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