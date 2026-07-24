import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, BadgeCheck, Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal, ShieldCheck, ChevronRight, Star, ClipboardList } from "lucide-react";

import { categories } from "@/data/categories";
import { apiClient } from "@/lib/api";
import { useBoostedSet } from "@/hooks/use-boosted-set";
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
import { useTrustBadges } from "@/hooks/use-trust-badges";
import type { TrustLevel } from "@/components/trust/TrustBadge";
import { formatSubcategory } from "@/lib/format-category";
import { CoverImage } from "@/components/media/CoverImage";
import { MediaGrid } from "@/components/feed/MediaGrid";
import { ExpandableText } from "@/components/feed/ExpandableText";
import { PriceGuideChip } from "@/components/PriceGuide";
import type { PriceType } from "@/lib/price-guide";

const iconMap: Record<string, any> = { Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal };

type RealFilter = "all" | "verified" | "featured" | "recent" | "available" | "near";

export type RealProvider = {
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
  slug?: string | null;
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



export function ServicesIndexPage({ initialSort }: { initialSort?: "recent" }) {
  const nav = useNavigate();
  const { user: authUser } = useAuth();
  const { location: userLoc } = useUserLocation();
  const { locations: featuredLocs } = useFeaturedLocations();
  
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filter, setFilter] = useState<RealFilter>(initialSort === "recent" ? "recent" : "all");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const [real, setReal] = useState<RealProvider[]>([]);
  const [loadingReal, setLoadingReal] = useState(true);
  const [dbCats, setDbCats] = useState<Array<{ slug: string; name: string; icon: string; blurb: string; subCount: number; examples: string }> | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/services/metadata');
        if (res.data) setDbCats(res.data);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingReal(true);
      try {
        const res = await apiClient.get(`/services/search?filter=${filter}`);
        if (res.data) setReal(res.data as RealProvider[]);
      } catch (err) {
        console.error('Failed to search services:', err);
      } finally {
        setLoadingReal(false);
      }
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
    s += proximityScore(userLoc, p) * 0.6;
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
        const matchesCat = !selectedCategory || p.category_slug === selectedCategory;
        return matchesQ && matchesL && matchesCat;
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
  }, [real, q, loc, selectedCategory, filter, radiusKm, userLoc, featuredLocs]);

  const radiusExpanded = radiusKm != null && userLoc && realFiltered.length === 0 && real.length > 0;

  const allProviderIds = useMemo(() => realFiltered.map((p) => p.user_id), [realFiltered]);
  const { data: trustBadges } = useTrustBadges("service_profile", allProviderIds);

  const recommended = useMemo(() => {
    return [...realFiltered].sort((a, b) => scoreProvider(b) - scoreProvider(a)).slice(0, 4);
  }, [realFiltered]);

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
    <div className="flex flex-col min-h-screen bg-background">
      {/* SECTION 1: SEARCH & FILTER BAR */}
      <section className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md pb-4 pt-20 md:pt-28 md:relative md:top-auto md:z-auto sm:pb-6 shadow-sm md:shadow-none">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-4 mb-4 md:mb-0">
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight text-navy sm:text-4xl hidden md:block">Find services near you</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-lg hidden md:block">Search by service, skill, or location.</p>
            </div>
            <div className="inline-flex rounded-full bg-muted p-1 shrink-0 self-start md:self-auto">
              <Link to="/services" className="rounded-full bg-background px-6 py-2 text-sm font-semibold text-navy shadow-sm">Services</Link>
              <Link to="/requests/browse" className="rounded-full px-6 py-2 text-sm font-medium text-muted-foreground hover:text-navy transition-colors">Requests</Link>
            </div>
          </div>

          <div className="mt-0 md:mt-4 rounded-2xl border border-border bg-card p-2 md:p-3 shadow-sm md:shadow-md">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-4 py-1">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)} 
                  placeholder="What service do you need?" 
                  className="w-full bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground min-h-[44px]" 
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-1 flex-1 md:flex-none md:w-48 lg:w-64">
                <Wrench className="h-5 w-5 shrink-0 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-base outline-none text-foreground min-h-[44px] appearance-none"
                >
                  <option value="">All Categories</option>
                  {(dbCats ?? categories).map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-1 flex-1 md:flex-none md:w-48 lg:w-64">
                <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder={userLoc?.town ? `Near: ${userLoc.town}` : "Location"}
                  className="w-full bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground min-h-[44px]"
                />
              </div>
              
              <button
                onClick={() => document.getElementById("providers-section")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full md:w-auto shrink-0 rounded-xl bg-orange px-6 py-3 md:py-2.5 text-base md:text-sm font-bold text-orange-foreground transition hover:brightness-110 min-h-[44px] active:scale-[0.98]"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: SERVICE PROVIDERS GRID */}
      <section id="providers-section" className="pb-32 pt-6 sm:pb-24 sm:pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-navy sm:text-3xl">Service providers on Tuungane</h2>
            <span className="text-sm font-medium text-muted-foreground">{realFiltered.length} {realFiltered.length === 1 ? "provider" : "providers"}</span>
          </div>

          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:px-0">
            {filterChips.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`min-h-[40px] shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.97] ${filter === f.id ? "bg-navy text-navy-foreground shadow-sm" : "border border-border bg-card text-muted-foreground hover:border-navy hover:text-navy"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <RadiusFilter value={radiusKm} onChange={setRadiusKm} disabled={!userLoc} />
          </div>

          {!loadingReal && radiusExpanded && (
            <div className="mt-4 rounded-xl border border-orange/30 bg-orange/5 p-4 text-sm text-foreground/80">
              Not many providers within {radiusKm} km yet.{" "}
              <button onClick={() => setRadiusKm(null)} className="font-bold text-orange underline p-1 -m-1">Show all providers</button>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {loadingReal && <p className="text-base text-muted-foreground col-span-full">Loading providers&hellip;</p>}
            {!loadingReal && realFiltered.map((p) => (
              <ProviderCardCompact key={p.user_id} p={p} userLoc={userLoc} onRequest={() => nav({ to: "/u/$id", params: { id: p.user_id } })} />
            ))}
            {!loadingReal && realFiltered.length === 0 && !radiusExpanded && (
              <div className="col-span-full">
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 sm:p-12 text-center">
                  <h3 className="font-display text-xl font-bold text-navy">No services found yet</h3>
                  <p className="mt-2 text-base text-muted-foreground max-w-md mx-auto">No services found matching your criteria. Try another service or location, or post a service request.</p>
                  <div className="mt-6 inline-flex"><ListYourSkillButton variant="solid" /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProviderRow({ p, isBoosted, userLoc, onRequest, prefetchedTrustLevel }: { p: RealProvider; isBoosted: boolean; userLoc?: UserLocation | null; onRequest: () => void; prefetchedTrustLevel?: TrustLevel | null; }) {
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {isVerified && <div className="h-1 w-full bg-gradient-to-r from-green via-green/70 to-orange/60" />}

      {p.slug ? (
        <Link to="/p/$slug" params={{ slug: p.slug }} className="flex items-start gap-4 p-4 md:p-5 pb-3 md:pb-4">
          <CoverImage
            variant="square"
            imageUrl={p.cover_url ?? p.profile?.avatar_url}
            categorySlug={p.category_slug}
            name={name}
            verifiedRing={isVerified}
            className="h-16 w-16 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="min-w-0 flex-1 font-display text-base md:text-lg font-bold leading-tight text-navy line-clamp-2">
                {name}
              </h3>
              {isBoosted && <Sparkles className="mt-1 h-4 w-4 shrink-0 text-orange" />}
              <ProfileTrustBadge kind="service_profile" id={p.user_id} size="sm" descriptive className="shrink-0" prefetchedLevel={prefetchedTrustLevel} />
            </div>
            <p className="mt-1 text-sm font-medium text-foreground/80">{formatSubcategory(p.subcategory)}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />{p.town || p.district || "Location not provided"}
            </p>
          </div>
        </Link>
      ) : (
      <Link to="/u/$id" params={{ id: p.user_id }} className="flex items-start gap-4 p-4 md:p-5 pb-3 md:pb-4">
        <CoverImage
          variant="square"
          imageUrl={p.cover_url ?? p.profile?.avatar_url}
          categorySlug={p.category_slug}
          name={name}
          verifiedRing={isVerified}
          className="h-16 w-16 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-display text-base md:text-lg font-bold leading-tight text-navy line-clamp-2">
              {name}
            </h3>
            {isBoosted && <Sparkles className="mt-1 h-4 w-4 shrink-0 text-orange" />}
            <ProfileTrustBadge kind="service_profile" id={p.user_id} size="sm" descriptive className="shrink-0" prefetchedLevel={prefetchedTrustLevel} />
          </div>
          <p className="mt-1 text-sm font-medium text-foreground/80">{formatSubcategory(p.subcategory)}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />{p.town || p.district || "Location not provided"}
          </p>
        </div>
      </Link>
      )}

      {/* Trust summary — positive signals only */}
      {(hasRating || p.completed_jobs > 0 || years > 0) && (
        <div className="px-4 md:px-5 text-xs md:text-sm text-muted-foreground">
          {hasRating ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-orange text-orange" />
                <span className="font-bold text-navy">{p.average_rating.toFixed(1)}</span>
              </span>
              <span>&middot; {p.verified_reviews} {p.verified_reviews === 1 ? "review" : "reviews"}</span>
              {p.completed_jobs > 0 && <span>&middot; {p.completed_jobs} completed</span>}
            </span>
          ) : p.completed_jobs > 0 ? (
            <span className="font-semibold text-navy">{p.completed_jobs} completed {p.completed_jobs === 1 ? "job" : "jobs"}{years > 0 ? ` · ${years} yrs experience` : ""}</span>
          ) : years > 0 ? (
            <span className="font-semibold text-navy">{years} yrs experience</span>
          ) : null}
        </div>
      )}

      {p.bio && <ExpandableText text={p.bio} clampLines={3} maxLines={8} className="mt-3 px-4 md:px-5" />}

      {Array.isArray(p.media_urls) && p.media_urls.length > 0 && (
        <div className="mt-3 px-4 md:px-5">
          <MediaGrid urls={p.media_urls} alt={name} />
        </div>
      )}

      {/* Badge strip */}
      <div className="mt-4 flex flex-wrap items-center gap-2 px-4 md:px-5">
        {p.price_type && (
          <PriceGuideChip guide={{ price_type: p.price_type as PriceType, price_fixed_ugx: p.price_fixed_ugx ?? null, price_min_ugx: p.price_min_ugx ?? null, price_max_ugx: p.price_max_ugx ?? null }} />
        )}
        <NearYouBadge user={userLoc} target={p} />
        {isTopRated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2.5 py-1 text-[11px] md:text-xs font-bold text-orange">
            <Star className="h-3 w-3 fill-orange text-orange" /> Top Rated
          </span>
        )}
      </div>
    </div>
  );
}


function ProviderCardCompact({ p, userLoc, onRequest }: { p: RealProvider; userLoc?: UserLocation | null; onRequest: () => void }) {
  const name = p.business_name || p.profile?.full_name || "Provider";
  const isVerified = p.verified === "verified" || p.verified === "featured";
  
  const coverImage = p.cover_url || (p.media_urls && p.media_urls.length > 0 ? p.media_urls[0] : null) || p.profile?.avatar_url;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative">
      <Link to={p.slug ? "/p/$slug" : "/u/$id"} params={p.slug ? { slug: p.slug } : { id: p.user_id }} className="flex flex-col flex-1">
        {/* Top Image */}
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface">
              <span className="text-muted-foreground/30 text-4xl font-bold font-display uppercase">{name.substring(0, 2)}</span>
            </div>
          )}
          {isVerified && (
            <div className="absolute top-2 left-2 bg-green/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="font-display text-base font-bold leading-tight text-navy line-clamp-1">{name}</h3>
          <p className="mt-1 text-sm font-medium text-foreground/80 line-clamp-1">{formatSubcategory(p.subcategory)}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.town || p.district || "Location not provided"}</span>
          </p>
        </div>
      </Link>

      <div className="p-4 pt-0 mt-auto">
        <button
          onClick={(e) => {
            e.preventDefault();
            onRequest();
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-orange/10 hover:bg-orange px-4 py-2 text-sm font-bold text-orange hover:text-white transition-colors"
        >
          Contact
        </button>
      </div>
    </div>
  );
}
