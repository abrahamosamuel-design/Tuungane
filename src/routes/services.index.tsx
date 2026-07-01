import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, BadgeCheck, Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal, ShieldCheck, ChevronRight, Star, ClipboardList } from "lucide-react";
import { Layout } from "@/components/Layout";
import { categories } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { EmptyState } from "@/components/EmptyState";
import { ProviderTrackCTA } from "@/components/cta/ProviderTrackCTA";
import { ListYourSkillButton } from "@/components/cta/ListYourSkillButton";
import { useUserLocation } from "@/hooks/use-user-location";
import { useAuth } from "@/hooks/use-auth";
import { filterByRadius, proximityScore, type UserLocation } from "@/lib/location";
import { NearYouBadge } from "@/components/NearYouBadge";
import { RadiusFilter } from "@/components/RadiusFilter";
import { useFeaturedLocations, isFeaturedTarget } from "@/hooks/use-featured-locations";
import { ProviderQuickContact } from "@/components/ProviderQuickContact";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { formatSubcategory } from "@/lib/format-category";
import { CoverImage } from "@/components/media/CoverImage";
import { MediaGrid } from "@/components/feed/MediaGrid";
import { ExpandableText } from "@/components/feed/ExpandableText";
import { PriceGuideChip } from "@/components/PriceGuide";
import type { PriceType } from "@/lib/price-guide";



const iconMap: Record<string, any> = { Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal };

export const Route = createFileRoute("/services/")({
  validateSearch: (search: Record<string, unknown>) => ({
    sort: (search.sort === "recent" ? "recent" : undefined) as "recent" | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find Trusted Services Near You — Tuungane" },
      { name: "description", content: "Search providers by service, skill, or location. Find plumbers, tutors, mechanics, designers and more across Uganda." },
    ],
  }),
  component: Services,
});


type RealFilter = "all" | "verified" | "featured" | "recent" | "available" | "near";

type RealProvider = {
  user_id: string;
  business_name: string | null;
  subcategory: string;
  bio: string;
  town: string;
  district: string;
  category_slug: string;
  verified: string;
  seeded_by_official: boolean;
  seeded_status: string | null;
  updated_at: string;
  created_at?: string;

  availability?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  areas_served?: string[] | null;
  service_radius_km?: number | null;
  cover_url?: string | null;
  media_urls?: string[] | null;
  profile: { full_name: string; avatar_url: string | null } | null;
  trust_score: number;
  average_rating: number;
  completed_jobs: number;
  verified_reviews: number;
  response_rate: number;
  years_experience?: number | null;
  price_type?: string | null;
  price_fixed_ugx?: number | null;
  price_min_ugx?: number | null;
  price_max_ugx?: number | null;
  price_currency?: string | null;
  price_note?: string | null;
};

const POPULAR_SERVICES = ["Plumber", "Electrician", "Cleaner", "Mechanic", "Tutor", "Barber", "Tailor", "Driver", "Real Estate Agent"];




function Services() {
  const nav = useNavigate();
  const { user: authUser } = useAuth();
  const { location: userLoc } = useUserLocation();
  const { locations: featuredLocs } = useFeaturedLocations();
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [filter, setFilter] = useState<RealFilter>(search.sort === "recent" ? "recent" : "all");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const [real, setReal] = useState<RealProvider[]>([]);
  const [loadingReal, setLoadingReal] = useState(true);
  const [dbCats, setDbCats] = useState<Array<{ slug: string; name: string; icon: string; blurb: string; subCount: number; examples: string }> | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: ss }] = await Promise.all([
        supabase.from("service_categories").select("slug,name,icon,blurb,sort_order,active").eq("active", true).order("sort_order").order("name"),
        supabase.from("service_subcategories").select("category_slug,name,sort_order,active").eq("active", true).order("sort_order").order("name"),
      ]);
      if (!cs) return;
      const subsBy = new Map<string, string[]>();
      (ss ?? []).forEach((s: any) => {
        const arr = subsBy.get(s.category_slug) ?? [];
        arr.push(s.name);
        subsBy.set(s.category_slug, arr);
      });
      setDbCats(cs.map((c: any) => {
        const subs = subsBy.get(c.slug) ?? [];
        return { slug: c.slug, name: c.name, icon: c.icon || "Wrench", blurb: c.blurb || "", subCount: subs.length, examples: subs.slice(0, 3).join(" · ") };
      }).sort((a: any, b: any) => {
        if (a.slug === "other") return 1;
        if (b.slug === "other") return -1;
        return 0;
      }));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingReal(true);
      const isRecent = filter === "recent";
      // Guests can only SELECT the safe subset (no lat/long/area).
      const isGuest = !authUser;
      const spCols = isGuest
        ? "user_id,business_name,subcategory,bio,town,district,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,media_urls,years_experience,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note"
        : "user_id,business_name,subcategory,bio,town,district,area,latitude,longitude,areas_served,service_radius_km,category_slug,verified,seeded_by_official,seeded_status,updated_at,created_at,availability,cover_url,media_urls,years_experience,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note";
      const ppCols = isGuest
        ? "owner_id,name,avatar_url,subcategory,bio,town,district,areas_served,service_radius_km,category_slug,verified,claim_status,updated_at,created_at,availability,cover_url"
        : "owner_id,name,avatar_url,subcategory,bio,town,district,area,latitude,longitude,areas_served,service_radius_km,category_slug,verified,seeded_by_official,claim_status,updated_at,created_at,availability,cover_url";

      let qy: any = supabase.from("service_profiles").select(spCols as string).eq("suspended", false);
      qy = isRecent
        ? qy.order("created_at", { ascending: false }).order("user_id", { ascending: false })
        : qy.order("updated_at", { ascending: false });
      qy = qy.limit(60);
      if (filter === "featured") qy = qy.eq("verified", "featured");
      if (filter === "verified") qy = qy.in("verified", ["verified", "featured"]);
      if (filter === "available") qy = qy.eq("availability", "available");

      // Also pull public/business pages (claimed legacy listings) so their owners
      // appear as provider cards even when they don't have a service_profile row.
      let pqy: any = supabase.from("public_profiles").select(ppCols as string).eq("suspended", false).not("owner_id", "is", null);
      pqy = isRecent
        ? pqy.order("created_at", { ascending: false }).order("owner_id", { ascending: false })
        : pqy.order("updated_at", { ascending: false });
      pqy = pqy.limit(60);
      if (filter === "featured") pqy = pqy.eq("verified", "featured");
      if (filter === "verified") pqy = pqy.in("verified", ["verified", "featured"]);
      if (filter === "available") pqy = pqy.eq("availability", "available");


      const [{ data }, { data: ppData }] = await Promise.all([qy, pqy]);

      const spRows = (data ?? []) as any[];
      const spOwners = new Set(spRows.map((p) => p.user_id));
      const ppRows = ((ppData ?? []) as any[])
        .filter((pp) => pp.owner_id && !spOwners.has(pp.owner_id))
        .map((pp) => ({
          user_id: pp.owner_id,
          business_name: pp.name,
          subcategory: pp.subcategory ?? "",
          bio: pp.bio ?? "",
          town: pp.town ?? "",
          district: pp.district ?? "",
          area: pp.area ?? null,
          latitude: pp.latitude ?? null,
          longitude: pp.longitude ?? null,
          areas_served: pp.areas_served ?? null,
          service_radius_km: pp.service_radius_km ?? null,
          category_slug: pp.category_slug ?? "other",
          verified: pp.verified ?? "none",
          seeded_by_official: !!pp.seeded_by_official,
          seeded_status: pp.claim_status ?? null,
          updated_at: pp.updated_at,
          created_at: pp.created_at,

          availability: pp.availability ?? null,
          cover_url: pp.cover_url ?? pp.avatar_url ?? null,
          media_urls: null,
          years_experience: null,
          price_type: null,
          price_fixed_ugx: null,
          price_min_ugx: null,
          price_max_ugx: null,
          price_currency: null,
          price_note: null,
        }));

      const merged = [...spRows, ...ppRows];
      const ids = merged.map((p) => p.user_id);
      const profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      const trustMap = new Map<string, { trust_score: number; average_rating: number; completed_jobs: number; verified_reviews: number; response_rate: number }>();
      if (ids.length) {
        // `profiles` is auth-only; only fetch the fallback name/avatar map for signed-in visitors.
        const profsPromise = isGuest
          ? Promise.resolve({ data: [] as Array<{ id: string; full_name: string; avatar_url: string | null }> })
          : supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
        const [profsRes, trustRes] = await Promise.all([
          profsPromise,
          supabase.from("provider_trust_stats").select("provider_id,trust_score,average_rating,completed_service_requests,total_verified_reviews,response_rate").in("provider_id", ids),
        ]);
        (profsRes.data ?? []).forEach((p) => profMap.set(p.id, p));
        (trustRes.data ?? []).forEach((t: any) => trustMap.set(t.provider_id, {
          trust_score: Number(t.trust_score ?? 0),
          average_rating: Number(t.average_rating ?? 0),
          completed_jobs: Number(t.completed_service_requests ?? 0),
          verified_reviews: Number(t.total_verified_reviews ?? 0),
          response_rate: Number(t.response_rate ?? 0),
        }));
      }
      setReal(merged.map((p: any) => ({
        ...p,
        profile: profMap.get(p.user_id) ?? null,
        trust_score: trustMap.get(p.user_id)?.trust_score ?? 0,
        average_rating: trustMap.get(p.user_id)?.average_rating ?? 0,
        completed_jobs: trustMap.get(p.user_id)?.completed_jobs ?? 0,
        verified_reviews: trustMap.get(p.user_id)?.verified_reviews ?? 0,
        response_rate: trustMap.get(p.user_id)?.response_rate ?? 0,
      })) as RealProvider[]);
      setLoadingReal(false);
    })();
  }, [filter, authUser]);

  const { has: isBoostedProvider } = useBoostedSet("provider", ["boost_profile", "feature_business_page"]);

  const now = Date.now();
  const scoreProvider = (p: RealProvider) => {
    let s = 0;
    if (isBoostedProvider(p.user_id)) s += 40;
    if (p.verified === "featured") s += 30;
    else if (p.verified === "verified") s += 20;
    s += Math.min(p.trust_score, 100) * 0.5;
    s += Math.min(p.average_rating, 5) * 5;
    s += Math.min(p.completed_jobs, 10) * 2;
    if (loc && (p.town.toLowerCase().includes(loc.toLowerCase()) || p.district.toLowerCase().includes(loc.toLowerCase()))) s += 15;
    // Proximity bonus: heavily weight closeness to the signed-in user's location.
    s += proximityScore(userLoc, p) * 0.6;
    // Admin-curated featured location bonus
    const feat = isFeaturedTarget(p, featuredLocs, p.category_slug);
    if (feat) s += 25 + Math.max(0, feat.priority);
    const daysOld = (now - new Date(p.updated_at).getTime()) / 86400000;
    if (daysOld < 30) s += 10;
    else if (daysOld < 90) s += 5;
    if (p.bio && p.bio.length > 40) s += 5;
    return s;
  };

  const realFiltered = useMemo(() => {
    const base = real
      .filter((p) => {
        const qm = q.toLowerCase();
        const name = p.business_name || p.profile?.full_name || "";
        const matchesQ = !q || name.toLowerCase().includes(qm) || p.subcategory.toLowerCase().includes(qm);
        const matchesL = !loc || p.town.toLowerCase().includes(loc.toLowerCase()) || p.district.toLowerCase().includes(loc.toLowerCase());
        return matchesQ && matchesL;
      })
      .sort((a, b) => {
        if (filter === "recent") {
          const tb = new Date(b.created_at ?? b.updated_at).getTime();
          const ta = new Date(a.created_at ?? a.updated_at).getTime();
          if (tb !== ta) return tb - ta;
          return b.user_id.localeCompare(a.user_id);
        }
        return scoreProvider(b) - scoreProvider(a);
      });
    if (filter === "recent") return base;
    return filterByRadius(base, userLoc, (p) => p, radiusKm);

  }, [real, q, loc, filter, radiusKm, userLoc, featuredLocs]); // eslint-disable-line react-hooks/exhaustive-deps
  const radiusExpanded = radiusKm != null && userLoc && realFiltered.length === 0 && real.length > 0;

  const recommended = useMemo(() => {
    // Top recommended = highest scoring, prefer verified + with rating
    return [...realFiltered].sort((a, b) => scoreProvider(b) - scoreProvider(a)).slice(0, 4);
  }, [realFiltered]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterChips: { id: RealFilter; label: string }[] = [
    { id: "all", label: "All providers" },
    { id: "verified", label: "Verified providers" },
    { id: "featured", label: "Featured by Tuungane" },
    { id: "recent", label: "Recently added" },
    { id: "available", label: "Available now" },
    { id: "near", label: "Near me" },
  ];

  const handleChipSearch = (term: string) => {
    setQ(term);
    const el = document.getElementById("providers-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      {/* SECTION 1: COMPACT SEARCH */}
      <section className="border-b border-border bg-surface px-4 pb-3 pt-4 sm:px-6 sm:pb-5 sm:pt-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-xl font-bold leading-tight text-navy sm:text-3xl">Find services near you</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-base">Search by service, skill, or location.</p>

          <div className="mt-3 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-card)] sm:p-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What service do you need?" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
              </div>
              <button
                onClick={() => document.getElementById("providers-section")?.scrollIntoView({ behavior: "smooth" })}
                className="shrink-0 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground transition hover:brightness-110"
              >
                Search
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface px-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder={userLoc?.town ? `Near: ${userLoc.town}` : "Choose location"}
                className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Slim Post a Service Request row */}
          <Link
            to="/requests/new"
            className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-dashed border-orange/40 bg-orange/5 px-3 py-2 text-xs text-navy transition hover:bg-orange/10 sm:text-sm"
          >
            <span className="min-w-0 truncate font-medium">Can't find what you need?</span>
            <span className="shrink-0 rounded-lg bg-orange px-2.5 py-1 text-[11px] font-semibold text-orange-foreground sm:text-xs">Post a Service Request</span>
          </Link>
        </div>
      </section>

      {/* PROVIDER TRACK CTA — compact */}
      <section className="px-4 pt-3 sm:px-6 sm:pt-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ProviderTrackCTA
            title="Offer a service on Tuungane"
            text="Get discovered by people near you."
          />
        </div>
      </section>

      {/* POPULAR SERVICES */}
      <section className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">

        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-base font-bold text-navy sm:text-xl">Popular services</h2>
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {POPULAR_SERVICES.map((s) => (
              <button
                key={s}
                onClick={() => handleChipSearch(s)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${q.toLowerCase() === s.toLowerCase() ? "border-orange bg-orange text-orange-foreground" : "border-border bg-card text-navy hover:border-orange"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* RECOMMENDED PROVIDERS — horizontal carousel on mobile */}
      <section className="pt-4 sm:pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-navy sm:text-xl">Recommended providers</h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Trusted picks you can contact or request.</p>
            </div>
            <a
              href="#providers-section"
              onClick={(e) => { e.preventDefault(); document.getElementById("providers-section")?.scrollIntoView({ behavior: "smooth" }); }}
              className="shrink-0 text-xs font-semibold text-orange hover:underline sm:text-sm"
            >
              View all →
            </a>
          </div>
        </div>

        {loadingReal && <p className="px-4 pt-3 text-sm text-muted-foreground sm:px-6 lg:px-8">Loading providers…</p>}
        {!loadingReal && recommended.length === 0 && (
          <div className="mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <h3 className="font-display text-base font-bold text-navy">No services found yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try another service or location, or post a service request so providers can respond.</p>
              <div className="mt-3 inline-flex"><ListYourSkillButton variant="solid" /></div>
            </div>
          </div>
        )}
        {!loadingReal && recommended.length > 0 && (
          <>
            {/* Mobile: snap carousel */}
            <div className="mt-3 flex items-start gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 snap-x snap-mandatory [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
              {recommended.map((p) => (
                <div key={p.user_id} className="w-[85vw] max-w-[320px] shrink-0 snap-start">
                  <ProviderCardCompact p={p} userLoc={userLoc} onRequest={() => nav({ to: "/u/$id", params: { id: p.user_id } })} />
                </div>
              ))}
            </div>
            {/* Tablet/Desktop: responsive grid */}
            <div className="mx-auto hidden max-w-7xl px-4 pt-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:px-6 lg:grid-cols-3 lg:px-8">
              {recommended.map((p) => (
                <ProviderRow key={p.user_id} p={p} isBoosted={isBoostedProvider(p.user_id)} userLoc={userLoc} onRequest={() => nav({ to: "/u/$id", params: { id: p.user_id } })} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* BROWSE BY CATEGORY — moved up */}
      <section className="px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-base font-bold text-navy sm:text-xl">Browse services by category</h2>
          {(() => {
            const allCats = dbCats ?? categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, blurb: c.blurb, subCount: c.subcategories.length, examples: c.subcategories.slice(0, 3).join(" · ") }));
            const visible = showAllCats ? allCats : allCats.slice(0, 6);
            return (
              <>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                  {visible.map((c) => {
                    const Icon = iconMap[c.icon] ?? Wrench;
                    return (
                      <Link
                        key={c.slug}
                        to="/services/$slug"
                        params={{ slug: c.slug }}
                        className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 transition hover:border-orange hover:shadow-[var(--shadow-card)] sm:p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy transition group-hover:bg-orange group-hover:text-orange-foreground sm:h-12 sm:w-12">
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-semibold text-navy">{c.name}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.examples || c.blurb}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-orange">{c.subCount} services</p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-orange" />
                      </Link>
                    );
                  })}
                </div>
                {allCats.length > 6 && (
                  <div className="mt-3 flex justify-center sm:hidden">
                    <button
                      onClick={() => setShowAllCats((v) => !v)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-navy hover:border-orange"
                    >
                      {showAllCats ? "Show fewer categories" : `View all categories (${allCats.length})`}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>


      {/* SECTION 5: SERVICE PROVIDERS ON TUUNGANE */}
      <section id="providers-section" className="px-4 pb-32 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-navy sm:text-xl">Service providers on Tuungane</h2>
            <span className="text-xs text-muted-foreground">{realFiltered.length} {realFiltered.length === 1 ? "provider" : "providers"}</span>
          </div>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {filterChips.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === f.id ? "bg-navy text-navy-foreground" : "border border-border bg-card text-muted-foreground hover:border-navy"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <RadiusFilter value={radiusKm} onChange={setRadiusKm} disabled={!userLoc} />
          </div>

          {!loadingReal && radiusExpanded && (
            <div className="mt-3 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
              Not many providers within {radiusKm} km yet.{" "}
              <button onClick={() => setRadiusKm(null)} className="font-semibold text-orange underline">Show all providers</button>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadingReal && <p className="text-sm text-muted-foreground">Loading providers…</p>}
            {!loadingReal && realFiltered.map((p) => <ProviderRow key={p.user_id} p={p} isBoosted={isBoostedProvider(p.user_id)} userLoc={userLoc} onRequest={() => nav({ to: "/u/$id", params: { id: p.user_id } })} />)}
            {!loadingReal && realFiltered.length === 0 && !radiusExpanded && (
              <div className="col-span-full">
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                  <h3 className="font-display text-lg font-bold text-navy">No services found yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">No services found yet. Try another service or location, or post a service request so people offering services can respond.</p>
                  <div className="mt-4 inline-flex"><ListYourSkillButton variant="solid" /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function ProviderRow({ p, isBoosted, userLoc, onRequest }: { p: RealProvider; isBoosted: boolean; userLoc?: UserLocation | null; onRequest: () => void }) {
  const name = p.business_name || p.profile?.full_name || "Provider";
  const available = (p.availability ?? "").toLowerCase() === "available";
  const isVerified = p.verified === "verified" || p.verified === "featured";
  const hasRating = p.average_rating > 0 && p.verified_reviews > 0;
  const isNew = !hasRating && p.completed_jobs === 0;
  const isTopRated = hasRating && p.average_rating >= 4.5 && p.verified_reviews >= 5;
  const isFastResponder = p.response_rate >= 80 && p.completed_jobs >= 3;
  const years = p.years_experience ?? 0;
  const recentlyJoined = isNew && (Date.now() - new Date(p.updated_at).getTime()) < 60 * 86400000;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      {isVerified && <div className="h-1 w-full bg-gradient-to-r from-green via-green/70 to-orange/60" />}

      <Link to="/u/$id" params={{ id: p.user_id }} className="flex items-start gap-3 p-4 pb-3">
        <CoverImage
          variant="square"
          imageUrl={p.cover_url ?? p.profile?.avatar_url}
          categorySlug={p.category_slug}
          name={name}
          verifiedRing={isVerified}
          className="h-14 w-14 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-display text-[15px] font-bold leading-tight text-navy line-clamp-2">
              {name}
            </h3>
            {isBoosted && <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange" />}
            <ProfileTrustBadge kind="service_profile" id={p.user_id} size="sm" descriptive className="shrink-0" />
          </div>
          <p className="mt-0.5 text-[13px] font-medium text-foreground/80">{formatSubcategory(p.subcategory)}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />{p.town || p.district || "Location not provided"}
          </p>
        </div>
      </Link>

      {/* Trust summary — positive signals only */}
      {(hasRating || p.completed_jobs > 0 || years > 0) && (
        <div className="px-4 text-xs text-muted-foreground">
          {hasRating ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Star className="h-3.5 w-3.5 fill-orange text-orange" />
              <span className="font-semibold text-navy">{p.average_rating.toFixed(1)}</span>
              <span>· {p.verified_reviews} {p.verified_reviews === 1 ? "review" : "reviews"}</span>
              {p.completed_jobs > 0 && <span>· {p.completed_jobs} completed</span>}
            </span>
          ) : p.completed_jobs > 0 ? (
            <span className="font-medium text-navy">{p.completed_jobs} completed {p.completed_jobs === 1 ? "job" : "jobs"}{years > 0 ? ` · ${years} yrs experience` : ""}</span>
          ) : years > 0 ? (
            <span className="font-medium text-navy">{years} yrs experience</span>
          ) : null}
        </div>
      )}

      {p.bio && <ExpandableText text={p.bio} clampLines={3} maxLines={8} className="mt-2 px-4" />}

      {Array.isArray(p.media_urls) && p.media_urls.length > 0 && (
        <div className="mt-2 px-4">
          <MediaGrid urls={p.media_urls} alt={name} />
        </div>
      )}


      {/* Badge strip */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 px-4">
        {p.price_type && (
          <PriceGuideChip guide={{ price_type: p.price_type as PriceType, price_fixed_ugx: p.price_fixed_ugx ?? null, price_min_ugx: p.price_min_ugx ?? null, price_max_ugx: p.price_max_ugx ?? null }} />
        )}
        <NearYouBadge user={userLoc} target={p} />
        {isTopRated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
            <Star className="h-3 w-3 fill-orange text-orange" /> Top Rated
          </span>
        )}
        {isFastResponder && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
            <Sparkles className="h-3 w-3" /> Fast Responder
          </span>
        )}
        {p.seeded_by_official && p.seeded_status !== "claimed" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold text-navy">
            <ShieldCheck className="h-3 w-3" /> Added by Tuungane
          </span>
        )}
        {recentlyJoined && !isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Recently joined
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2.5 sm:px-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${available ? "text-green" : "text-muted-foreground"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-green" : "bg-muted-foreground"}`} />
          {available ? "Available now" : "Check availability"}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ProviderQuickContact providerId={p.user_id} source="search_result" variant="compact" />
          <button
            onClick={onRequest}
            className="inline-flex items-center gap-1 rounded-lg bg-orange px-3 py-1.5 text-xs font-bold text-orange-foreground shadow-sm transition hover:brightness-110 sm:px-3.5"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Request
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderCardCompact({ p, userLoc, onRequest }: { p: RealProvider; userLoc?: UserLocation | null; onRequest: () => void }) {
  const name = p.business_name || p.profile?.full_name || "Provider";
  const available = (p.availability ?? "").toLowerCase() === "available";
  const isVerified = p.verified === "verified" || p.verified === "featured";
  const isNew = p.average_rating === 0 && p.completed_jobs === 0;
  const recentlyJoined = isNew && (Date.now() - new Date(p.updated_at).getTime()) < 60 * 86400000;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      {isVerified && <div className="h-1 w-full bg-gradient-to-r from-green via-green/70 to-orange/60" />}
      <Link to="/u/$id" params={{ id: p.user_id }} className="flex items-start gap-2.5 p-3">
        <CoverImage
          variant="square"
          imageUrl={p.cover_url ?? p.profile?.avatar_url}
          categorySlug={p.category_slug}
          name={name}
          verifiedRing={isVerified}
          className="h-12 w-12 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[14px] font-bold leading-tight text-navy">{name}</h3>
          <p className="mt-0.5 truncate text-[12px] font-medium text-foreground/80">{formatSubcategory(p.subcategory)}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />{p.town || p.district || "Location"}
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5 px-3">
        {p.price_type && (
          <PriceGuideChip guide={{ price_type: p.price_type as PriceType, price_fixed_ugx: p.price_fixed_ugx ?? null, price_min_ugx: p.price_min_ugx ?? null, price_max_ugx: p.price_max_ugx ?? null }} />
        )}
        {isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        )}
        <NearYouBadge user={userLoc} target={p} />
        {recentlyJoined && !isVerified && (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Recently joined
          </span>
        )}
      </div>

      {p.bio && (
        <div className="mt-2 px-3">
          <ExpandableText text={p.bio} clampLines={3} maxLines={8} />
        </div>
      )}



      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${available ? "text-green" : "text-muted-foreground"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-green" : "bg-muted-foreground"}`} />
          {available ? "Available now" : "Check"}
        </span>
        <div className="flex items-center gap-1.5">
          <ProviderQuickContact providerId={p.user_id} source="search_result" variant="compact" />
          <button
            onClick={onRequest}
            className="inline-flex items-center gap-1 rounded-lg bg-orange px-2.5 py-1.5 text-[11px] font-bold text-orange-foreground shadow-sm transition hover:brightness-110"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Request
          </button>
        </div>
      </div>
    </div>
  );
}


