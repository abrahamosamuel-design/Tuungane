import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  ShieldCheck,
  ChevronDown,
  Filter,
  ChevronRight,
  MapPin,
  BadgeCheck,
  Sparkles,
  Wrench,
  Building2,
  Scissors,
  Truck,
  Car,
  GraduationCap,
  Camera,
  ChefHat,
  Laptop,
  HeartPulse,
  Sprout,
  MoreHorizontal,
  MessageCircle,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ServiceCard } from "@/components/pages/services/ServiceCard";
import { ServiceFilterSidebar, FilterState } from "@/components/pages/services/ServiceFilterSidebar";
import { MobileSearchBar } from "@/components/MobileSearchBar";
import { categories } from "@/data/categories";
import type { PriceType } from "@/lib/price-guide";

const iconMap: Record<string, any> = {
  Wrench,
  Sparkles,
  Building2,
  Scissors,
  Truck,
  Car,
  GraduationCap,
  Camera,
  ChefHat,
  Laptop,
  HeartPulse,
  Sprout,
  MoreHorizontal,
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  "home-repair": ["home-repair", "household", "construction", "solar", "security"],
  "cleaning": ["cleaning", "laundry"],
  "real-estate": ["real-estate"],
  "beauty": ["beauty", "fashion"],
  "transport": ["transport", "automotive"],
  "automotive": ["automotive"],
  "education": ["education"],
  "events": ["events"],
  "food": ["food"],
  "digital": ["digital", "business"],
  "health": ["health"],
  "agriculture": ["agriculture"],
};

export type PProfile = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  profile_type: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  district: string | null;
  town: string | null;
  area: string | null;
  verified: string;
  is_featured: boolean;
};

export type ServiceRow = {
  id: string;
  profile_id: string;
  title: string | null;
  is_primary: boolean;
  price_type: PriceType | null;
  price_fixed_ugx: number | null;
  price_min_ugx: number | null;
  price_max_ugx: number | null;
  price_currency: string | null;
  category_slug?: string | null;
  photos?: string[];
  media_urls?: string[];
};

export function ServicesDirectoryView() {
  const location = useLocation();
  const nav = useNavigate();
  const searchParams = useMemo(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }, [location.search]);

  const initialQ = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category");

  const [profiles, setProfiles] = useState<PProfile[]>([]);
  const [servicesByProfile, setServicesByProfile] = useState<Record<string, ServiceRow[]>>({});
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(initialQ);
  const [sortParam, setSortParam] = useState("highest_rated");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const initialFilters: FilterState = {
    verifiedOnly: false,
    categories: initialCategory ? [initialCategory] : [],
    region: "",
    radiusKm: 25,
    minPrice: "",
    maxPrice: "",
    minRating: 0,
  };
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Sync state if URL search query changes
  useEffect(() => {
    const urlQ = searchParams.get("q") || "";
    const urlCategory = searchParams.get("category");
    if (urlQ) setQ(urlQ);
    if (urlCategory) {
      setFilters((prev) => ({
        ...prev,
        categories: [urlCategory],
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient<{ data: { profiles: PProfile[]; services: ServiceRow[] } }>("/profiles/browse");
        if (cancelled) return;
        const list = res.data.profiles || [];
        setProfiles(list);
        if (list.length) {
          const map: Record<string, ServiceRow[]> = {};
          for (const row of res.data.services ?? []) {
            (map[row.profile_id] ||= []).push(row);
          }
          setServicesByProfile(map);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase();
    const minP = filters.minPrice ? parseInt(filters.minPrice) : 0;
    const maxP = filters.maxPrice ? parseInt(filters.maxPrice) : Infinity;

    return profiles.filter((p) => {
      const svcs = servicesByProfile[p.id] ?? [];
      const primary = svcs.find((s) => s.is_primary) || svcs[0];

      // Name/Bio or Service Title/Category search
      if (term) {
        const matchesNameOrBio =
          p.name.toLowerCase().includes(term) || (p.bio || "").toLowerCase().includes(term);
        const matchesServices = svcs.some(
          (s) =>
            (s.title || "").toLowerCase().includes(term) ||
            (s.category_slug || "").toLowerCase().includes(term)
        );
        if (!matchesNameOrBio && !matchesServices) {
          return false;
        }
      }

      // Verified Only
      if (filters.verifiedOnly && p.verified !== "verified") {
        return false;
      }

      // Region
      if (filters.region) {
        const locString = [p.area, p.town, p.district].join(" ").toLowerCase();
        if (!locString.includes(filters.region.toLowerCase())) return false;
      }

      // Categories
      if (filters.categories.length > 0) {
        const allowedSlugs = new Set<string>();
        for (const cat of filters.categories) {
          allowedSlugs.add(cat);
          const aliases = CATEGORY_ALIASES[cat] || [];
          aliases.forEach((a) => allowedSlugs.add(a));
        }

        const hasMatchingCat =
          svcs.some((s) => s.category_slug && allowedSlugs.has(s.category_slug)) ||
          filters.categories.includes(p.profile_type);
        if (!hasMatchingCat) return false;
      }

      // Price Range
      if (minP > 0 || maxP < Infinity) {
        if (!primary) return false;
        const price = primary.price_fixed_ugx || primary.price_min_ugx || 0;
        if (price < minP || price > maxP) return false;
      }

      // Mock Rating
      const mockRating = 4.8;
      if (mockRating < filters.minRating) return false;

      return true;
    });
  }, [profiles, q, filters, servicesByProfile]);

  const isSearching =
    q.length > 0 || filters.categories.length > 0 || filters.region.length > 0 || filters.verifiedOnly;
  const [showAllCats, setShowAllCats] = useState(false);

  return (
    <div className="bg-muted/10 min-h-screen flex flex-col">
      {/* SUBHEADER HERO STRIP */}
      <section className="hidden md:block bg-white border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                  <ShieldCheck className="w-3 h-3" /> Direct Verified Marketplace
                </span>
                <span className="text-muted-foreground text-xs font-medium">• Uganda</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-navy tracking-tight">
                Showing {filteredItems.length} verified services
              </h1>
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground font-medium whitespace-nowrap">Sort By:</label>
              <div className="relative min-w-[180px]">
                <select
                  className="w-full appearance-none bg-muted/30 border border-border rounded-xl px-3.5 py-2 pr-8 text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-orange/20 focus:border-orange cursor-pointer transition-all"
                  value={sortParam}
                  onChange={(e) => setSortParam(e.target.value)}
                >
                  <option value="highest_rated">Highest Rated (4.8+)</option>
                  <option value="popular">Most Popular</option>
                  <option value="recent">Newly Added</option>
                  <option value="price_asc">Price: Low to High</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Discovery Quick Tags */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-none">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider whitespace-nowrap mr-1">
              Popular:
            </span>
            {["Solar Installation", "Graphic Design", "Web Development", "Catering", "Logistics & Moving"].map(
              (tag) => (
                <button
                  key={tag}
                  onClick={() => setQ(tag)}
                  className="inline-flex items-center px-3 py-1 bg-muted/30 hover:bg-orange/10 text-navy text-xs font-medium rounded-full border border-border hover:border-orange/50 transition-all whitespace-nowrap"
                >
                  {tag}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-0 py-0 md:px-6 md:py-8">
        {/* MOBILE DEFAULT: CATEGORIES LIST */}
        <div className={`md:hidden ${isSearching ? "hidden" : "block"}`}>
          <MobileSearchBar
            placeholder="What service do you need?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {/* Popular Services (Horizontal Scroll) */}
          {filteredItems.length > 0 && (
            <div className="pt-2 pb-4">
              <div className="flex items-center justify-between px-6 mb-4 mt-4">
                <h2 className="font-display text-xl font-bold text-navy">Popular services</h2>
              </div>
              <div className="flex overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="w-6 shrink-0" />
                {filteredItems.slice(0, 4).map((p, idx) => {
                  const svcs = servicesByProfile[p.id] ?? [];
                  const primary = svcs.find((s) => s.is_primary) || svcs[0];
                  return (
                    <div key={p.id} className={`w-[240px] shrink-0 snap-start ${idx !== 3 ? "mr-4" : ""}`}>
                      <ProviderCardListMobile
                        id={primary?.id || p.id}
                        profileSlug={p.slug}
                        coverUrl={
                          primary?.photos?.[0] ||
                          (primary?.media_urls && primary?.media_urls[0]) ||
                          p.cover_url ||
                          null
                        }
                        category={primary?.category_slug || p.profile_type}
                        providerName={p.name}
                        isVerified={p.verified === "verified"}
                        locationName={[p.area, p.town].filter(Boolean).join(", ") || p.district || "Uganda"}
                      />
                    </div>
                  );
                })}
                <div className="w-6 shrink-0" />
              </div>
            </div>
          )}

        </div>

        {/* Mobile Top Bar (When searching or category open) */}
        <div className={`lg:hidden mb-3 flex gap-2 ${!isSearching ? "hidden" : "flex"} items-center px-4 w-full`}>
          {filters.categories.length > 0 && (
            <button
              onClick={() => {
                setFilters((prev) => ({ ...prev, categories: [] }));
                setQ("");
                nav({ to: "/categories" });
              }}
              aria-label="Back to Categories"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-white text-navy shadow-xs hover:border-orange hover:text-orange active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <MobileSearchBar
              className="px-0 py-0 bg-transparent w-full"
              placeholder={filters.categories.length > 0 ? "Search in this category..." : "What service do you need?"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            aria-label="Filters"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-white text-navy shadow-xs hover:border-orange hover:text-orange active:scale-95 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-4 md:px-0 pb-12 md:pb-0">
          {/* Mobile Provider List Header */}
          <div className="md:hidden">
            {filters.categories.length > 0 ? (
              <div className="flex items-center justify-between gap-2 mb-3 bg-white p-3 rounded-2xl border border-border/40 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground">Category:</span>
                  {filters.categories.map((catSlug) => {
                    const matchedCat = categories.find((c) => c.slug === catSlug);
                    return (
                      <span
                        key={catSlug}
                        className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 border border-orange/30 px-3 py-1 text-xs font-bold text-orange"
                      >
                        {matchedCat?.name || catSlug}
                        <button
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              categories: prev.categories.filter((c) => c !== catSlug),
                            }));
                            window.history.replaceState({}, "", window.location.pathname);
                          }}
                          className="hover:text-navy cursor-pointer ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setFilters(initialFilters);
                    setQ("");
                    window.history.replaceState({}, "", window.location.pathname);
                  }}
                  className="text-xs font-bold text-orange hover:underline shrink-0"
                >
                  Clear all
                </button>
              </div>
            ) : !isSearching ? (
              <h2 className="font-display text-xl font-bold text-navy pt-2">Service providers on Tuungane</h2>
            ) : null}
          </div>

          {/* LEFT FILTER PANEL (col-span-3) */}
          <div className={`lg:col-span-3 ${isMobileFilterOpen ? "block" : "hidden lg:block"}`}>
            {/* Desktop Search (hidden on mobile) */}
            <div className="hidden lg:block mb-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, skill, or service"
                className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange/20 focus:border-orange transition-all"
              />
            </div>
            <ServiceFilterSidebar
              filters={filters}
              setFilters={setFilters}
              onReset={() => setFilters(initialFilters)}
            />
          </div>

          {/* MAIN CONTENT: SERVICE CARD GRID (col-span-9) */}
          <section className="lg:col-span-9">
            {filters.categories.length > 0 && (
              <div className="hidden lg:flex items-center justify-between mb-5 bg-white border border-border/40 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-navy">Active Category:</span>
                  {filters.categories.map((catSlug) => {
                    const matchedCat = categories.find((c) => c.slug === catSlug);
                    return (
                      <span
                        key={catSlug}
                        className="inline-flex items-center gap-2 rounded-full bg-orange text-white px-3.5 py-1 text-xs font-bold shadow-xs"
                      >
                        {matchedCat?.name || catSlug}
                        <button
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              categories: prev.categories.filter((c) => c !== catSlug),
                            }));
                            window.history.replaceState({}, "", window.location.pathname);
                          }}
                          className="hover:opacity-80 cursor-pointer ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setFilters(initialFilters);
                    setQ("");
                    window.history.replaceState({}, "", window.location.pathname);
                  }}
                  className="text-xs font-bold text-orange hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading services...</p>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title="No services match your search"
                description="Try a different search term or clear your filters."
                action={{
                  label: "Clear filters",
                  onClick: () => {
                    setQ("");
                    setFilters(initialFilters);
                  },
                }}
              />
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredItems.map((p) => {
                    const svcs = servicesByProfile[p.id] ?? [];
                    const primary = svcs.find((s) => s.is_primary) || svcs[0];

                    const mockDistance = Math.random() * 10 + 1;
                    const mockRating = 4.8;
                    const mockReviews = Math.floor(Math.random() * 100) + 5;

                    return (
                      <ServiceCard
                        key={p.id}
                        id={primary?.id || p.id}
                        profileSlug={p.slug}
                        coverUrl={
                          primary?.photos?.[0] ||
                          (primary?.media_urls && primary?.media_urls[0]) ||
                          p.cover_url ||
                          p.avatar_url ||
                          null
                        }
                        category={primary?.category_slug || p.profile_type}
                        distanceKm={mockDistance}
                        avatarUrl={p.avatar_url}
                        providerName={p.name}
                        isVerified={p.verified === "verified"}
                        providerSubtitle={
                          p.bio
                            ? p.bio.length > 40
                              ? p.bio.substring(0, 40) + "..."
                              : p.bio
                            : undefined
                        }
                        title={primary?.title || `${p.name}'s Services`}
                        rating={mockRating}
                        reviewCount={mockReviews}
                        locationName={[p.area, p.town].filter(Boolean).join(", ") || p.district || "Uganda"}
                        priceAmount={primary?.price_fixed_ugx || primary?.price_min_ugx}
                        priceCurrency="UGX"
                        priceUnit={primary?.price_type === "hourly" ? "/ hr" : undefined}
                      />
                    );
                  })}
                </div>

                {/* Mobile View */}
                <div className="grid md:hidden grid-cols-2 gap-3">
                  {filteredItems.map((p) => {
                    const svcs = servicesByProfile[p.id] ?? [];
                    const primary = svcs.find((s) => s.is_primary) || svcs[0];
                    return (
                      <ProviderCardListMobile
                        key={p.id}
                        id={primary?.id || p.id}
                        profileSlug={p.slug}
                        coverUrl={
                          primary?.photos?.[0] ||
                          (primary?.media_urls && primary?.media_urls[0]) ||
                          p.cover_url ||
                          p.avatar_url ||
                          null
                        }
                        category={primary?.category_slug || p.profile_type}
                        providerName={p.name}
                        isVerified={p.verified === "verified"}
                        locationName={[p.area, p.town].filter(Boolean).join(", ") || p.district || "Uganda"}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export function ProviderCardListMobile({
  id,
  profileSlug,
  coverUrl,
  category,
  providerName,
  isVerified,
  locationName,
}: {
  id: string;
  profileSlug: string;
  coverUrl?: string | null;
  category: string;
  providerName: string;
  isVerified: boolean;
  locationName: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-border/40 relative h-full">
      <Link to="/service/$id" params={{ id: id }} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted block">
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt={providerName}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface absolute inset-0">
            <span className="font-display text-3xl font-bold uppercase text-muted-foreground/30">
              {providerName.substring(0, 2)}
            </span>
          </div>
        )}
        {isVerified && (
          <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-white/95 p-1.5 shadow-sm backdrop-blur-sm">
            <BadgeCheck className="h-3.5 w-3.5 text-green-600" />
          </div>
        )}
      </Link>
      <div className="p-2 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-1">
          <Link
            to="/p/$slug"
            params={{ slug: profileSlug }}
            className="font-display text-[16px] font-bold leading-tight text-[#1A1A1A] line-clamp-1 block tracking-tight"
          >
            {providerName}
          </Link>
        </div>
        <p className="text-[12px] font-medium text-[#8F8F8F] line-clamp-1">{category || "Service"}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#4A4A4A] truncate">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#8F8F8F] shrink-0" />
            <span className="truncate">{locationName || "Uganda"}</span>
          </div>
        </div>
        <div className="mt-auto pt-2.5 flex items-center gap-1.5">
          <Link
            to="/service/$id"
            params={{ id: id }}
            className="flex h-[36px] flex-1 items-center justify-center rounded-[8px] bg-orange text-[12.5px] font-bold text-white hover:brightness-110 transition-all shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
          >
            View details
          </Link>
          <div
            role="button"
            onClick={(e) => {
              e.preventDefault();
            }}
            className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] border border-orange/20 bg-orange/5 text-orange hover:bg-orange/10 transition-colors cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
