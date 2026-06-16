import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, MapPin, Star, Sparkles, ShieldCheck } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/social/Avatar";
import { getCategory } from "@/data/categories";
import { useCategory } from "@/hooks/use-categories";
import { supabase } from "@/integrations/supabase/client";
import { useUserLocation } from "@/hooks/use-user-location";
import { filterByRadius, sortByProximity, proximityLabel, type UserLocation } from "@/lib/location";
import { RadiusFilter } from "@/components/RadiusFilter";
import { ProviderQuickContact } from "@/components/ProviderQuickContact";


type Row = {
  user_id: string;
  business_name: string | null;
  subcategory: string;
  bio: string | null;
  town: string | null;
  district: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: string | null;
  full_name?: string;
  avatar_url?: string | null;
  rating?: number;
};

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    // Static fallback for SEO/SSR; component layer will override with live DB data.
    const category = getCategory(params.slug) ?? { slug: params.slug, name: params.slug, icon: "Wrench", blurb: "", subcategories: [] };
    return { category };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category.name ?? "Services"} — Tuungane` },
      { name: "description", content: loaderData?.category.blurb ?? "Browse Tuungane services" },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Couldn't load this category</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground">Try again</button>
          <Link to="/services" className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-navy">All services</Link>
        </div>
      </div>
    </Layout>
  ),
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Category not found</h1>
        <Link to="/services" className="mt-6 inline-block text-orange">Back to services</Link>
      </div>
    </Layout>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category: loaderCat } = Route.useLoaderData();
  const dbCat = useCategory(loaderCat.slug);
  const category = dbCat ?? loaderCat;
  const { location: userLoc } = useUserLocation();
  const [list, setList] = useState<Row[] | null>(null);
  const [others, setOthers] = useState<Row[]>([]);
  const [sub, setSub] = useState<string>("");
  const [loc, setLoc] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sps } = await supabase
        .from("service_profiles")
        .select("user_id,business_name,subcategory,bio,town,district,area,latitude,longitude,verified,category_slug")
        .eq("suspended", false)
        .limit(200);
      const all = (sps ?? []) as (Row & { category_slug: string })[];
      const inCat = all.filter((r) => r.category_slug === category.slug);
      const outCat = all.filter((r) => r.category_slug !== category.slug);
      const ids = all.map((r) => r.user_id);
      if (ids.length === 0) {
        setList([]);
        setOthers([]);
        return;
      }
      const [{ data: profs }, { data: stats }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids),
        supabase.from("provider_trust_stats").select("provider_id,average_rating").in("provider_id", ids),
      ]);
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
      const smap = new Map((stats ?? []).map((s) => [s.provider_id, s.average_rating ?? 0]));
      const enrich = (r: Row) => ({
        ...r,
        full_name: pmap.get(r.user_id)?.full_name,
        avatar_url: pmap.get(r.user_id)?.avatar_url ?? null,
        rating: Number(smap.get(r.user_id) ?? 0),
      });
      setList(inCat.map(enrich));
      setOthers(
        outCat
          .map(enrich)
          .sort((a, b) => {
            const rA = a.verified === "featured" ? 2 : a.verified === "verified" ? 1 : 0;
            const rB = b.verified === "featured" ? 2 : b.verified === "verified" ? 1 : 0;
            if (rB !== rA) return rB - rA;
            return (b.rating ?? 0) - (a.rating ?? 0);
          })
          .slice(0, 6),
      );
    })();
  }, [category.slug]);


  const filtered = useMemo(() => {
    if (!list) return null;
    const locL = loc.trim().toLowerCase();
    const base = list.filter((p) => {
      if (sub && p.subcategory !== sub) return false;
      if (verifiedOnly && p.verified !== "verified" && p.verified !== "featured") return false;
      if (locL) {
        const hay = `${p.town ?? ""} ${p.district ?? ""} ${p.area ?? ""}`.toLowerCase();
        if (!hay.includes(locL)) return false;
      }
      return true;
    });
    const sorted = sortByProximity(base, userLoc, (p) => p)
      .sort((a, b) => {
        // Re-rank: featured/verified first, then rating, then proximity (sortByProximity already applied a tiebreak)
        const rankA = a.verified === "featured" ? 2 : a.verified === "verified" ? 1 : 0;
        const rankB = b.verified === "featured" ? 2 : b.verified === "verified" ? 1 : 0;
        if (rankB !== rankA) return rankB - rankA;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    return filterByRadius(sorted, userLoc, (p) => p, radiusKm);
  }, [list, sub, loc, verifiedOnly, radiusKm, userLoc]);

  const radiusExpanded = radiusKm != null && userLoc && filtered && list && filtered.length === 0 && list.length > 0;

  return (
    <Layout>
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-orange">
            <ArrowLeft className="h-4 w-4" /> All services
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">{category.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{category.blurb}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setSub("")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${sub === "" ? "border-orange bg-orange text-orange-foreground" : "border-border bg-card text-navy hover:border-orange"}`}
            >
              All {category.subcategories.length}
            </button>
            {category.subcategories.map((s: string) => (
              <button
                key={s}
                onClick={() => setSub(s === sub ? "" : s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${sub === s ? "border-orange bg-orange text-orange-foreground" : "border-border bg-card text-navy hover:border-orange"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-surface px-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="Town, district or area"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${verifiedOnly ? "border-green bg-green text-white" : "border-border bg-card text-navy hover:border-green"}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Verified only
          </button>
          <RadiusFilter value={radiusKm} onChange={setRadiusKm} disabled={!userLoc} />
        </div>

        {radiusExpanded && (
          <div className="mt-4 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
            Not many providers within {radiusKm} km yet.{" "}
            <button onClick={() => setRadiusKm(null)} className="font-semibold text-orange underline">Show all providers</button>
          </div>
        )}

        <div className="mt-6">
          {filtered === null ? (
            <p className="text-sm text-muted-foreground">Loading providers…</p>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-navy">
                {filtered.length} provider{filtered.length !== 1 && "s"}
                {sub && <span className="text-muted-foreground"> · {sub}</span>}
              </h2>
              {filtered.length > 0 ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((p) => <RealProviderCard key={p.user_id} p={p} userLoc={userLoc} />)}
                </div>
              ) : (
                !radiusExpanded && (
                  <div className="mt-6 space-y-6">
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                      <p className="font-semibold text-navy">No providers in {category.name} yet.</p>
                      <p className="mt-1 text-sm text-muted-foreground">Be among the first — list your skill and reach customers in this category.</p>
                      <Link to="/login" search={{ tab: "signup", intent: "provider", redirect: "/list-skill" } as never} className="mt-5 inline-flex rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground">List your skill</Link>
                    </div>
                    {others.length > 0 && (
                      <div>
                        <h3 className="font-display text-lg font-bold text-navy">Explore other trusted providers</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Discover providers across Tuungane while this category grows.</p>
                        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {others.map((p) => <RealProviderCard key={p.user_id} p={p} userLoc={userLoc} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

            </>
          )}
        </div>
      </section>
    </Layout>
  );
}

function RealProviderCard({ p, userLoc }: { p: Row; userLoc: UserLocation | null }) {
  const name = p.business_name || p.full_name || "Provider";
  const near = proximityLabel(userLoc, p);
  return (
    <Link
      to="/u/$id"
      params={{ id: p.user_id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-start gap-4 p-5">
        <Avatar name={name} url={p.avatar_url ?? null} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-semibold text-navy">{name}</h3>
            {p.verified === "verified" && <BadgeCheck className="h-4 w-4 shrink-0 text-green" />}
            {p.verified === "featured" && <Sparkles className="h-4 w-4 shrink-0 text-orange" />}
          </div>
          <p className="text-sm text-muted-foreground">{p.subcategory}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.town && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.town}</span>}
            {near && <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 font-semibold text-green">{near}</span>}
            {p.rating != null && p.rating > 0 && (
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-orange text-orange" />{p.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
      {p.bio && <p className="line-clamp-2 px-5 pb-4 text-sm text-foreground/70">{p.bio}</p>}
      <div className="mt-auto flex items-center justify-between border-t border-border bg-surface px-5 py-3">
        <span className="text-xs text-muted-foreground">{p.district ?? ""}</span>
        <span className="text-xs font-semibold text-orange transition group-hover:underline">View profile →</span>
      </div>
    </Link>
  );
}
