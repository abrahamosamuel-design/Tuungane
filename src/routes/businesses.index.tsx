import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Plus, Sparkles, BadgeCheck } from "lucide-react";
import { orgTypeLabel } from "@/data/businessTypes";
import { categories } from "@/data/categories";

export const Route = createFileRoute("/businesses/")({
  head: () => ({ meta: [
    { title: "Business Pages — Tuungane" },
    { name: "description", content: "Discover schools, shops, salons, NGOs and other organizations on Tuungane. Follow them, see their services, posts and opportunities." },
  ]}),
  component: BusinessesPage,
});

type BPage = {
  id: string; slug: string; name: string; org_type: string; category_slug: string | null;
  description: string; logo_url: string | null; cover_url: string | null;
  district: string | null; town: string | null; verified: string; is_featured: boolean;
};

function BusinessesPage() {
  const { user, loading } = useAuth();
  const [pages, setPages] = useState<BPage[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

  useEffect(() => {
    (async () => {
      let query = supabase.from("business_pages").select("id,slug,name,org_type,category_slug,description,logo_url,cover_url,district,town,verified,is_featured")
        .eq("suspended", false)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (cat) query = query.eq("category_slug", cat);
      const { data } = await query;
      let rows = (data ?? []) as BPage[];
      if (q.trim()) {
        const needle = q.toLowerCase();
        rows = rows.filter((p) => p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle));
      }
      setPages(rows);
    })();
  }, [q, cat]);

  const featured = pages.filter((p) => p.is_featured);
  const rest = pages.filter((p) => !p.is_featured);

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange"><Building2 className="h-4 w-4" /> Business pages</div>
            <h1 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">Schools, shops, salons & organizations</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Discover and follow local businesses and organizations on Tuungane. See their services, posts and opportunities.</p>
          </div>
          <Link
            to="/businesses/create"
            className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground shadow-sm hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Create a page
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search business pages…"
            className="min-w-[220px] flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm"
          />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-full border border-border bg-card px-4 py-2 text-sm">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>

        {featured.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy"><Sparkles className="h-4 w-4 text-orange" /> Featured businesses</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => <BPageCard key={p.id} p={p} featured />)}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-navy">All pages</h2>
          {rest.length === 0 && featured.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-base font-bold text-navy">No business pages yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create a business page to showcase your organization, services, opportunities, and updates.</p>
              <Link
                 to="/businesses/create"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground"
              >
                <Plus className="h-4 w-4" /> Create a page
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => <BPageCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

function BPageCard({ p, featured }: { p: BPage; featured?: boolean }) {
  return (
    <Link to="/businesses/$slug" params={{ slug: p.slug }} className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-orange/60 hover:shadow-[var(--shadow-card)]">
      <div className="relative h-28 w-full bg-gradient-to-br from-orange/20 via-orange/5 to-navy/10">
        {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" />}
        {featured && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-orange px-2 py-0.5 text-xs font-semibold text-orange-foreground"><Sparkles className="h-3 w-3" /> Featured</span>
        )}
      </div>
      <div className="-mt-6 flex items-end gap-3 px-4">
        <div className="h-12 w-12 overflow-hidden rounded-xl border-2 border-card bg-muted">
          {p.logo_url ? <img src={p.logo_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-navy"><Building2 className="h-5 w-5" /></div>}
        </div>
      </div>
      <div className="p-4 pt-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-base font-bold text-navy group-hover:text-orange">{p.name}</h3>
          {p.verified === "verified" && <BadgeCheck className="h-4 w-4 text-orange" />}
        </div>
        <div className="text-xs text-muted-foreground">{orgTypeLabel(p.org_type)}{p.town ? ` · ${p.town}` : ""}{p.district ? `, ${p.district}` : ""}</div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description || "No description yet."}</p>
      </div>
    </Link>
  );
}