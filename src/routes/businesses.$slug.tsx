import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Building2, BadgeCheck, MapPin, Phone, Mail, MessageCircle, Sparkles, Edit3, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { orgTypeLabel } from "@/data/businessTypes";
import { SafetyNote, SAFETY_TIPS } from "@/components/SafetyNote";
import { EmptyState } from "@/components/EmptyState";

import { RouteErrorCard, RouteNotFoundCard } from "@/lib/route-boundaries";

export const Route = createFileRoute("/businesses/$slug")({
  head: () => ({ meta: [{ title: "Business page — Tuungane" }] }),
  component: BusinessDetail,
  errorComponent: ({ error, reset }) => <RouteErrorCard error={error} reset={reset} title="Couldn't load this business" />,
  notFoundComponent: () => <RouteNotFoundCard title="Business not found" message="This business page may have been removed." homeHref="/businesses" homeLabel="Browse businesses" />,
});

type BPage = {
  id: string; owner_id: string; slug: string; name: string; org_type: string;
  category_slug: string | null; subcategory: string | null; description: string;
  logo_url: string | null; cover_url: string | null;
  district: string | null; town: string | null; area: string | null; address: string | null;
  contact_phone: string | null; whatsapp: string | null; email: string | null;
  opening_hours: Record<string, string>;
  services: string[]; products: string[];
  verified: string; is_featured: boolean; seeded_by_official: boolean;
  claim_status: string;
};

function BusinessDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [page, setPage] = useState<BPage | null>(null);
  const [followers, setFollowers] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [opps, setOpps] = useState<Array<{ id: string; title: string; opportunity_type: string }>>([]);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("business_pages").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) { toast.error("Business page not found"); nav({ to: "/businesses" }); return; }
    setPage(data as BPage);
    const [{ count }, follow, { data: o }] = await Promise.all([
      supabase.from("business_followers").select("*", { count: "exact", head: true }).eq("business_page_id", data.id),
      user ? supabase.from("business_followers").select("follower_id").eq("business_page_id", data.id).eq("follower_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("opportunities").select("id,title,opportunity_type").eq("business_page_id", data.id).eq("archived", false).in("status", ["approved", "featured"]).order("created_at", { ascending: false }).limit(10),
    ]);
    setFollowers(count ?? 0);
    setIsFollowing(!!follow?.data);
    setOpps(o ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug, user]);

  const toggleFollow = async () => {
    if (!user || !page) { nav({ to: "/login", search: { tab: "login", redirect: `/businesses/${slug}` } as never }); return; }
    if (isFollowing) {
      await supabase.from("business_followers").delete().eq("business_page_id", page.id).eq("follower_id", user.id);
      setIsFollowing(false); setFollowers((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("business_followers").insert({ business_page_id: page.id, follower_id: user.id });
      setIsFollowing(true); setFollowers((n) => n + 1);
    }
  };

  if (!page) return <Layout><div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Loading…</div></Layout>;

  const canEdit = user?.id === page.owner_id;

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-8">
        {/* Cover + header */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative h-44 w-full bg-gradient-to-br from-orange/25 via-orange/5 to-navy/15 sm:h-56">
            {page.cover_url && <img src={page.cover_url} alt="" className="h-full w-full object-cover" />}
            {page.is_featured && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1 text-xs font-semibold text-orange-foreground"><Sparkles className="h-3 w-3" /> Featured business</span>
            )}
          </div>
          <div className="-mt-10 px-5 sm:px-8">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-card bg-muted">
              {page.logo_url
                ? <img src={page.logo_url} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-navy"><Building2 className="h-8 w-8" /></div>}
            </div>
          </div>
          <div className="px-5 pb-5 pt-3 sm:px-8 sm:pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{page.name}</h1>
                  {page.verified === "verified" && <BadgeCheck className="h-6 w-6 text-orange" />}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{orgTypeLabel(page.org_type)}{page.subcategory ? ` · ${page.subcategory}` : ""}</div>
                {(page.town || page.district) && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {[page.area, page.town, page.district].filter(Boolean).join(", ")}</div>
                )}
                <div className="mt-2 text-sm text-muted-foreground"><Users className="mr-1 inline h-4 w-4" />{followers} follower{followers === 1 ? "" : "s"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={toggleFollow} className={`rounded-full px-4 py-2 text-sm font-semibold ${isFollowing ? "border border-border bg-card text-navy" : "bg-orange text-orange-foreground hover:brightness-110"}`}>
                  {isFollowing ? "Following" : "Follow"}
                </button>
                {canEdit && (
                  <button onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-navy hover:border-orange/60">
                    <Edit3 className="h-4 w-4" /> {editing ? "Cancel" : "Edit"}
                  </button>
                )}
              </div>
            </div>

            {page.seeded_by_official && page.claim_status !== "claimed" && (
              <div className="mt-4 rounded-xl border border-dashed border-orange/40 bg-orange/5 p-3 text-xs text-navy">
                This page was added by Tuungane to help users discover local businesses. The owner can claim and update this page.
              </div>
            )}

            {editing && canEdit && <EditForm page={page} onSaved={() => { setEditing(false); load(); }} />}
            {!editing && (
              <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{page.description || "No description yet."}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {page.services.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-bold text-navy">Services</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {page.services.map((s) => <span key={s} className="rounded-full bg-orange/10 px-3 py-1 text-xs font-semibold text-orange">{s}</span>)}
                </div>
              </div>
            )}
            {page.products.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-bold text-navy">Products</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {page.products.map((s) => <span key={s} className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy">{s}</span>)}
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-base font-bold text-navy"><Briefcase className="h-4 w-4 text-orange" /> Opportunities</h3>
              {opps.length === 0 ? (
                <div className="mt-3"><EmptyState icon={Briefcase} title="No opportunities yet" description="This page hasn't posted any jobs, gigs, or volunteer roles." /></div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {opps.map((o) => (
                    <li key={o.id}>
                      <Link to="/opportunities/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-orange/60">
                        <span className="text-sm font-medium text-navy">{o.title}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize text-muted-foreground">{o.opportunity_type}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-bold text-navy">Contact</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {page.contact_phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-orange" /> <a href={`tel:${page.contact_phone}`}>{page.contact_phone}</a></li>}
                {page.whatsapp && <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green" /> <a href={`https://wa.me/${page.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{page.whatsapp}</a></li>}
                {page.email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-navy" /> <a href={`mailto:${page.email}`}>{page.email}</a></li>}
                {page.address && <li className="flex items-start gap-2"><MapPin className="h-4 w-4 text-orange" /> <span>{page.address}</span></li>}
                {!page.contact_phone && !page.whatsapp && !page.email && <li>No contact info provided.</li>}
              </ul>
            </div>
            <SafetyNote>{SAFETY_TIPS.business}</SafetyNote>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

function EditForm({ page, onSaved }: { page: BPage; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: page.name, description: page.description,
    contact_phone: page.contact_phone ?? "", whatsapp: page.whatsapp ?? "", email: page.email ?? "",
    address: page.address ?? "", town: page.town ?? "", district: page.district ?? "",
    services: page.services.join(", "), products: page.products.join(", "),
  });

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("business_pages").update({
      name: f.name.trim(),
      description: f.description,
      contact_phone: f.contact_phone || null, whatsapp: f.whatsapp || null, email: f.email || null,
      address: f.address || null, town: f.town || null, district: f.district || null,
      services: f.services.split(",").map((s) => s.trim()).filter(Boolean),
      products: f.products.split(",").map((s) => s.trim()).filter(Boolean),
    }).eq("id", page.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Page updated"); onSaved(); }
  };

  const inputCls = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name" />
      <textarea rows={3} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" />
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={inputCls} value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} placeholder="Phone" />
        <input className={inputCls} value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="WhatsApp" />
        <input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={inputCls} value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} placeholder="Town" />
        <input className={inputCls} value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} placeholder="District" />
        <input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Address" />
      </div>
      <input className={inputCls} value={f.services} onChange={(e) => setF({ ...f, services: e.target.value })} placeholder="Services (comma-separated)" />
      <input className={inputCls} value={f.products} onChange={(e) => setF({ ...f, products: e.target.value })} placeholder="Products (comma-separated)" />
      <button onClick={save} disabled={busy} className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110 disabled:opacity-60">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
