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
import { filterByRadius, proximityScore, type UserLocation } from "@/lib/location";
import { NearYouBadge } from "@/components/NearYouBadge";
import { RadiusFilter } from "@/components/RadiusFilter";
import { useFeaturedLocations, isFeaturedTarget } from "@/hooks/use-featured-locations";
import { ProviderQuickContact } from "@/components/ProviderQuickContact";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { formatSubcategory } from "@/lib/format-category";



const iconMap: Record<string, any> = { Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal };

export const Route = createFileRoute("/services/")({
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
  availability?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  areas_served?: string[] | null;
  service_radius_km?: number | null;
  profile: { full_name: string; avatar_url: string | null } | null;
  trust_score: number;
  average_rating: number;
  completed_jobs: number;
};

const POPULAR_SERVICES = ["Plumber", "Electrician", "Cleaner", "Mechanic", "Tailor", "Tutor", "Driver", "Hairdresser", "Caterer", "Web Designer"];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Avatar({ name, src, size = 56 }: { name: string; src?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-navy/10 font-display font-bold text-navy"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {show ? (
        <img src={src!} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  );
}

function Services() {
  const nav = useNavigate();
  const { location: userLoc } = useUserLocation();
  const { locations: featuredLocs } = useFeaturedLocations();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [filter, setFilter] = useState<RealFilter>("all");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [real, setReal] = useState<RealProvider[]>([]);
  const [loadingReal, setLoadingReal] = useState(true);
  const [dbCats, setDbCats] = useState<Array<{ slug: string; name: string; icon: string; blurb: string; subCount: number; examples: string }> | null>(null);

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
      let qy = supabase.from("service_profiles").select("user_id,business_name,subcategory,bio,town,district,area,latitude,longitude,areas_served,service_radius_km,category_slug,verified,seeded_by_official,seeded_status,updated_at,availability").eq("suspended", false).order("updated_at", { ascending: false }).limit(60);
      if (filter === "featured") qy = qy.eq("verified", "featured");
      if (filter === "verified") qy = qy.in("verified", ["verified", "featured"]);
      if (filter === "available") qy = qy.eq("availability", "available");
      const { data } = await qy;
      const ids = (data ?? []).map((p) => p.user_id);
      const profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      const trustMap = new Map<string, { trust_score: number; average_rating: number; completed_jobs: number }>();
      if (ids.length) {
        const [profsRes, trustRes] = await Promise.all([
          supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids),
          supabase.from("provider_trust_stats").select("provider_id,trust_score,average_rating,completed_service_requests").in("provider_id", ids),
        ]);
        (profsRes.data ?? []).forEach((p) => profMap.set(p.id, p));
        (trustRes.data ?? []).forEach((t: any) => trustMap.set(t.provider_id, {
          trust_score: Number(t.trust_score ?? 0),
          average_rating: Number(t.average_rating ?? 0),
          completed_jobs: Number(t.completed_service_requests ?? 0),
        }));
      }
      setReal((data ?? []).map((p: any) => ({
        ...p,
        profile: profMap.get(p.user_id) ?? null,
        trust_score: trustMap.get(p.user_id)?.trust_score ?? 0,
        average_rating: trustMap.get(p.user_id)?.average_rating ?? 0,
        completed_jobs: trustMap.get(p.user_id)?.completed_jobs ?? 0,
      })) as RealProvider[]);
      setLoadingReal(false);
    })();
  }, [filter]);

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
      .sort((a, b) => scoreProvider(b) - scoreProvider(a));
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
      {/* SECTION 1: HERO / SEARCH */}
      <section className="border-b border-border bg-surface px-4 pb-6 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">Find trusted services near you</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Search providers by service, skill, or location.</p>

          <div className="mt-4 grid gap-2.5 rounded-2xl border border-border bg-card p-2.5 shadow-[var(--shadow-card)] sm:p-3">
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Plumber, tutor, mechanic..." className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Town or district e.g. Entebbe" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <button
              onClick={() => document.getElementById("providers-section")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-xl bg-orange px-6 py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110"
            >
              Search
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-orange/40 bg-orange/5 px-3 py-2.5">
            <p className="text-xs font-medium text-navy sm:text-sm">Not sure who to choose?</p>
            <Link to="/requests/new" className="rounded-lg bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground transition hover:brightness-110 sm:text-sm">
              Post a Request
            </Link>
          </div>
        </div>
      </section>

      {/* PROVIDER TRACK CTA */}
      <section className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ProviderTrackCTA
            title="Offer what you do"
            text="Create your provider profile, list your skills, add photos of your work, and let customers find you."
          />
        </div>
      </section>

      {/* SECTION 2: POPULAR SERVICES */}
      <section className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-lg font-bold text-navy sm:text-xl">Popular services</h2>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {POPULAR_SERVICES.map((s) => (
              <button
                key={s}
                onClick={() => handleChipSearch(s)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${q.toLowerCase() === s.toLowerCase() ? "border-orange bg-orange text-orange-foreground" : "border-border bg-card text-navy hover:border-orange"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: RECOMMENDED PROVIDERS */}
      <section className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-navy sm:text-xl">Recommended providers</h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Trusted providers you can contact or request.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadingReal && <p className="text-sm text-muted-foreground">Loading providers…</p>}
            {!loadingReal && recommended.length === 0 && (
              <div className="col-span-full">
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                  <h3 className="font-display text-lg font-bold text-navy">No providers listed yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Be among the first skilled people to list your skill and get discovered by customers near you.</p>
                  <div className="mt-4 inline-flex"><ListYourSkillButton variant="solid" /></div>
                </div>
              </div>
            )}
            {!loadingReal && recommended.map((p) => <ProviderRow key={p.user_id} p={p} isBoosted={isBoostedProvider(p.user_id)} userLoc={userLoc} onRequest={() => nav({ to: "/u/$id", params: { id: p.user_id } })} />)}
          </div>
        </div>
      </section>

      {/* SECTION 4: BROWSE BY CATEGORY */}
      <section className="px-4 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-lg font-bold text-navy sm:text-xl">Browse services by category</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(dbCats ?? categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, blurb: c.blurb, subCount: c.subcategories.length, examples: c.subcategories.slice(0, 3).join(" · ") }))).map((c) => {
              const Icon = iconMap[c.icon] ?? Wrench;
              return (
                <Link
                  key={c.slug}
                  to="/services/$slug"
                  params={{ slug: c.slug }}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-orange hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy transition group-hover:bg-orange group-hover:text-orange-foreground">
                    <Icon className="h-6 w-6" />
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
        </div>
      </section>

      {/* SECTION 5: SERVICE PROVIDERS ON TUUNGANE */}
      <section id="providers-section" className="px-4 pb-24 pt-10 sm:px-6 sm:pb-16 lg:px-8">
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
                  <h3 className="font-display text-lg font-bold text-navy">No providers listed yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Be among the first skilled people to list your skill and get discovered by customers near you.</p>
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

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <Link to="/u/$id" params={{ id: p.user_id }} className="flex items-start gap-3 p-4">
        <Avatar name={name} src={p.profile?.avatar_url} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            <h3 className="min-w-0 flex-1 font-display text-base font-semibold leading-tight text-navy line-clamp-2 sm:line-clamp-1 sm:truncate">
              {name}
            </h3>
            {isBoosted && <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange" />}
            <ProfileTrustBadge kind="service_profile" id={p.user_id} size="sm" descriptive className="shrink-0" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatSubcategory(p.subcategory)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.town}</span>
            {p.average_rating > 0 && (
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-orange text-orange" />{p.average_rating.toFixed(1)} · {p.completed_jobs} reviews</span>
            )}
          </div>
        </div>
      </Link>
      {p.bio && <p className="line-clamp-2 px-4 text-sm text-foreground/70">{p.bio}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 px-4">
        <NearYouBadge user={userLoc} target={p} />
        {p.seeded_by_official && p.seeded_status !== "claimed" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold text-navy"><ShieldCheck className="h-3 w-3" /> Added by Tuungane Official</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold sm:text-xs ${available ? "text-green" : "text-muted-foreground"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-green" : "bg-muted-foreground"}`} />
          {available ? "Available now" : "Check availability"}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ProviderQuickContact providerId={p.user_id} source="search_result" variant="compact" />
          <Link
            to="/u/$id"
            params={{ id: p.user_id }}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-navy transition hover:border-navy sm:px-3"
          >
            View
          </Link>
          <button
            onClick={onRequest}
            className="inline-flex items-center gap-1 rounded-lg bg-orange px-2.5 py-1.5 text-xs font-semibold text-orange-foreground shadow-sm transition hover:brightness-110 sm:px-3"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Request
          </button>
        </div>
      </div>
    </div>
  );
}

