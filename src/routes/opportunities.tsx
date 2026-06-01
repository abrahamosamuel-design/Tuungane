import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Plus, ShieldAlert } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { categories } from "@/data/categories";
import { opportunityTypes } from "@/data/opportunities";
import { OpportunityCard, type OpportunityRow } from "@/components/OpportunityCard";
import { OfficialPostCard } from "@/components/OfficialPostCard";
import type { OfficialAccountRow, OfficialPostRow } from "@/data/officialPostTypes";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities — Tuungane" },
      { name: "description", content: "Find gigs, jobs, internships, volunteer work, and apprenticeships connected to your skills and services." },
    ],
  }),
  component: Opportunities,
});

function Opportunities() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [cat, setCat] = useState<string>("");
  const [sub, setSub] = useState<string>("");
  const [loc, setLoc] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withDeadline, setWithDeadline] = useState(false);
  const [items, setItems] = useState<OpportunityRow[]>([]);
  const [featured, setFeatured] = useState<OpportunityRow[]>([]);
  const [officialOpps, setOfficialOpps] = useState<OfficialPostRow[]>([]);
  const [officialAccount, setOfficialAccount] = useState<OfficialAccountRow | null>(null);
  const [source, setSource] = useState<"all" | "official" | "users">("all");
  const [loading, setLoading] = useState(true);
  const { has: isBoostedOpp, ids: boostedOppIds } = useBoostedSet("opportunity", ["feature_opportunity"]);

  const category = categories.find((c) => c.slug === cat);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("opportunities")
      .select("*")
      .in("status", ["approved", "featured"])
      .order("created_at", { ascending: false })
      .limit(60);
    if (type) query = query.eq("opportunity_type", type as never);
    if (cat) query = query.eq("category_slug", cat);
    if (sub) query = query.eq("subcategory", sub);
    if (loc) query = query.ilike("location", `%${loc}%`);
    if (verifiedOnly) query = query.eq("poster_type", "admin");
    if (withDeadline) query = query.not("deadline", "is", null);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data } = await query;
    setItems((data ?? []) as OpportunityRow[]);

    const { data: feats } = await supabase
      .from("opportunities")
      .select("*")
      .or("is_featured.eq.true,status.eq.featured")
      .in("status", ["approved", "featured"])
      .order("created_at", { ascending: false })
      .limit(4);
    setFeatured((feats ?? []) as OpportunityRow[]);

    // Official opportunities
    const [{ data: acct }, { data: ops }] = await Promise.all([
      supabase.from("official_accounts").select("*").eq("is_active", true).limit(1).maybeSingle(),
      supabase.from("official_posts").select("*").eq("status", "published").eq("post_type", "opportunity").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(20),
    ]);
    setOfficialAccount(acct as OfficialAccountRow | null);
    let filteredOps = (ops ?? []) as OfficialPostRow[];
    if (cat) filteredOps = filteredOps.filter((o) => o.category_slug === cat);
    if (loc) filteredOps = filteredOps.filter((o) => (o.location ?? "").toLowerCase().includes(loc.toLowerCase()));
    if (q) filteredOps = filteredOps.filter((o) => o.title.toLowerCase().includes(q.toLowerCase()));
    setOfficialOpps(filteredOps);

    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type, cat, sub, loc, verifiedOnly, withDeadline]);

  return (
    <Layout>
      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange">Skills-Based Opportunities</p>
              <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Find Work Opportunities</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">Gigs, jobs, internships, volunteer work and apprenticeships connected to your skills and services.</p>
            </div>
            <Link to="/opportunities/new" className="inline-flex w-fit items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground hover:brightness-110">
              <Plus className="h-4 w-4" /> Post an Opportunity
            </Link>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-foreground">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities…" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Location (e.g. Kampala)" className="rounded-full bg-white/95 px-4 py-2.5 text-sm text-foreground outline-none sm:w-56" />
            <button className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground">Search</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-5">
            <FilterGroup label="Type">
              <Pill active={type === ""} onClick={() => setType("")}>All</Pill>
              {opportunityTypes.map((t) => (
                <Pill key={t.value} active={type === t.value} onClick={() => setType(t.value)}>{t.label}</Pill>
              ))}
            </FilterGroup>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
              <select value={cat} onChange={(e) => { setCat(e.target.value); setSub(""); }} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            {category && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-category</p>
                <select value={sub} onChange={(e) => setSub(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                  <option value="">All</option>
                  {category.subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withDeadline} onChange={(e) => setWithDeadline(e.target.checked)} /> Has deadline</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified poster only</label>
            </div>
            <div className="rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
              <ShieldAlert className="mb-1 inline h-4 w-4 text-orange" /> Verify details before paying money or sharing sensitive information. Report suspicious opportunities.
            </div>
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Pill active={source === "all"} onClick={() => setSource("all")}>All sources</Pill>
              <Pill active={source === "official"} onClick={() => setSource("official")}>Posted by Tuungane Official</Pill>
              <Pill active={source === "users"} onClick={() => setSource("users")}>Posted by users</Pill>
            </div>

            {source !== "users" && officialOpps.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 font-display text-lg font-bold text-navy">Posted by Tuungane Official</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {officialOpps.map((o) => <OfficialPostCard key={o.id} post={o} account={officialAccount} />)}
                </div>
              </div>
            )}

            {source !== "official" && featured.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 font-display text-lg font-bold text-navy">Featured opportunities</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {featured.map((o) => <OpportunityCard key={o.id} o={o} />)}
                </div>
              </div>
            )}

            {source !== "official" && (
              <>
                <h2 className="mb-3 font-display text-lg font-bold text-navy">Recent opportunities</h2>
                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loading && items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                    <p className="font-semibold text-navy">No opportunities yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try clearing filters, or be the first to post one.</p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((o) => <OpportunityCard key={o.id} o={o} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${active ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}>{children}</button>
  );
}
