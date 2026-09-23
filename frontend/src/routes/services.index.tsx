import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { ShieldCheck, ChevronDown, Filter, ChevronLeft, ChevronRight, MapPin, BadgeCheck, Sparkles, Wrench, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal, MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ServiceCard } from "@/components/pages/services/ServiceCard";
import { ServiceFilterSidebar, FilterState } from "@/components/pages/services/ServiceFilterSidebar";
import { Avatar } from "@/components/social/Avatar";
import { ExpandableText } from "@/components/feed/ExpandableText";
import { PriceGuideChip } from "@/components/PriceGuide";
import type { PriceType, PriceGuide } from "@/lib/price-guide";
import { MobileSearchBar } from "@/components/MobileSearchBar";
import { categories } from "@/data/categories";

const iconMap: Record<string, any> = { Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal };

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Browse Services — Tuungane" },
      { name: "description", content: "Discover verified service providers across Uganda." },
    ],
  }),
  component: ServicesDirectoryPage,
});

type PProfile = {
  id: string; owner_id: string; slug: string; name: string; profile_type: string;
  bio: string; avatar_url: string | null; cover_url: string | null;
  district: string | null; town: string | null; area: string | null;
  verified: string; is_featured: boolean;
};

type ServiceRow = {
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
};

function ServicesDirectoryPage() {
  const [profiles, setProfiles] = useState<PProfile[]>([]);
  const [servicesByProfile, setServicesByProfile] = useState<Record<string, ServiceRow[]>>({});
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [sortParam, setSortParam] = useState("highest_rated");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const initialFilters: FilterState = {
    verifiedOnly: false,
    categories: [],
    region: "",
    radiusKm: 25,
    minPrice: "",
    maxPrice: "",
    minRating: 0,
  };
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient<{ data: { profiles: PProfile[], services: ServiceRow[] } }>("/profiles/browse");
        const list = res.data.profiles || [];
        setProfiles(list);
        if (list.length) {
          const map: Record<string, ServiceRow[]> = {};
          for (const row of (res.data.services ?? [])) {
            (map[row.profile_id] ||= []).push(row);
          }
          setServicesByProfile(map);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
      setLoading(false);
    })();
  }, []);

  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase();
    const minP = filters.minPrice ? parseInt(filters.minPrice) : 0;
    const maxP = filters.maxPrice ? parseInt(filters.maxPrice) : Infinity;

    return profiles.filter((p) => {
      // Name/Bio search
      if (term && !(p.name.toLowerCase().includes(term) || (p.bio || "").toLowerCase().includes(term))) {
        return false;
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

      const svcs = servicesByProfile[p.id] ?? [];
      const primary = svcs.find(s => s.is_primary) || svcs[0];

      // Categories
      if (filters.categories.length > 0) {
        if (!primary || !primary.category_slug) return false;
        if (!filters.categories.includes(primary.category_slug)) return false;
      }

      // Price Range (Mock logic based on available data)
      if (minP > 0 || maxP < Infinity) {
        if (!primary) return false;
        const price = primary.price_fixed_ugx || primary.price_min_ugx || 0;
        if (price < minP || price > maxP) return false;
      }

      // Mock Rating (Everyone gets 4.5+ for demo unless specified by backend)
      const mockRating = 4.8;
      if (mockRating < filters.minRating) return false;

      return true;
    });
  }, [profiles, q, filters, servicesByProfile]);

  const isSearching = q.length > 0 || filters.categories.length > 0 || filters.region.length > 0 || filters.verifiedOnly;
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
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider whitespace-nowrap mr-1">Popular:</span>
            {["Solar Installation", "Graphic Design", "Web Development", "Catering", "Logistics & Moving"].map(tag => (
              <button 
                key={tag}
                onClick={() => setQ(tag)}
                className="inline-flex items-center px-3 py-1 bg-muted/30 hover:bg-orange/10 text-navy text-xs font-medium rounded-full border border-border hover:border-orange/50 transition-all whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-0 py-0 md:px-6 md:py-8">
        
        {/* MOBILE DEFAULT: CATEGORIES LIST */}
        <div className={`md:hidden ${isSearching ? 'hidden' : 'block'}`}>
          <MobileSearchBar placeholder="What service do you need?" value={q} onChange={(e) => setQ(e.target.value)} />

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
                  const primary = svcs.find(s => s.is_primary) || svcs[0];
                  return (
                    <div key={p.id} className={`w-[240px] shrink-0 snap-start ${idx !== 3 ? 'mr-4' : ''}`}>
                      <ProviderCardListMobile
                        id={primary?.id || p.id}
                        profileSlug={p.slug}
                        coverUrl={primary?.photos?.[0] || p.cover_url || p.avatar_url}
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

          {/* Services */}
          <h2 className="font-display text-xl font-bold text-navy mb-3 px-6 pt-2">Services</h2>
          <div className="flex flex-col gap-3 px-6 pb-6">
            {(showAllCats ? categories : categories.slice(0, 4)).map((c) => {
              const Icon = iconMap[c.icon] || Sparkles;
              return (
                <button
                  key={c.slug}
                  onClick={() => {
                    setFilters(prev => ({ ...prev, categories: [c.slug] }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-border/30 bg-white p-3.5 shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98] text-left"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-navy">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold text-navy">{c.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-navy/40" />
                </button>
              );
            })}
            {!showAllCats && categories.length > 4 && (
              <button
                onClick={() => setShowAllCats(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border/30 bg-slate-50 p-3.5 shadow-sm transition-colors hover:bg-slate-100 text-sm font-bold text-navy mt-1"
              >
                More categories
                <ChevronDown className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filter Toggle (Only when searching) */}
        <div className={`lg:hidden mb-4 flex gap-2 ${!isSearching ? 'hidden' : 'flex'} items-center`}>
          <div className="flex-1">
             <MobileSearchBar placeholder="What service do you need?" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button 
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="px-4 py-2 bg-white border border-border rounded-xl text-navy font-semibold text-sm flex items-center justify-center gap-2 h-[56px] mr-4 md:mr-0"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-4 md:px-0 pb-12 md:pb-0">
          
          {/* Mobile Provider List Header (Only when NOT searching) */}
          {!isSearching && (
            <div className="md:hidden">
              <h2 className="font-display text-xl font-bold text-navy pt-2">Service providers on Tuungane</h2>
            </div>
          )}
          
          {/* LEFT FILTER PANEL (col-span-3) */}
          <div className={`lg:col-span-3 ${isMobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            {/* Desktop Search (hidden on mobile) */}
            <div className="hidden lg:block mb-4">
               <input 
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or bio"
                  className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
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
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading services...</p>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title="No services match your search"
                description="Try a different search term or clear your filters."
                action={{ label: "Clear filters", onClick: () => { setQ(""); setFilters(initialFilters); } }}
              />
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredItems.map(p => {
                    const svcs = servicesByProfile[p.id] ?? [];
                    const primary = svcs.find(s => s.is_primary) || svcs[0];
                    
                    // Mock data for missing fields
                    const mockDistance = Math.random() * 10 + 1; 
                    const mockRating = 4.5 + Math.random() * 0.5;
                    const mockReviews = Math.floor(Math.random() * 100) + 5;
                    
                    return (
                      <ServiceCard
                        key={p.id}
                        id={primary?.id || p.id}
                        profileSlug={p.slug}
                        coverUrl={primary?.photos?.[0] || p.cover_url || p.avatar_url}
                        category={primary?.category_slug || p.profile_type}
                        distanceKm={mockDistance}
                        avatarUrl={p.avatar_url}
                        providerName={p.name}
                        isVerified={p.verified === "verified"}
                        providerSubtitle={p.bio ? (p.bio.length > 40 ? p.bio.substring(0, 40) + '...' : p.bio) : undefined}
                        title={primary?.title || `${p.name}'s Services`}
                        rating={mockRating}
                        reviewCount={mockReviews}
                        locationName={[p.area, p.town].filter(Boolean).join(", ") || p.district || "Uganda"}
                        priceAmount={primary?.price_fixed_ugx || primary?.price_min_ugx}
                        priceCurrency="UGX"
                        priceUnit={primary?.price_type === 'hourly' ? '/ hr' : undefined}
                      />
                    );
                  })}
                </div>

                {/* Mobile View */}
                <div className="grid md:hidden grid-cols-2 gap-3">
                  {filteredItems.map(p => {
                    const svcs = servicesByProfile[p.id] ?? [];
                    const primary = svcs.find(s => s.is_primary) || svcs[0];
                    return (
                      <ProviderCardListMobile
                        key={p.id}
                        id={primary?.id || p.id}
                        profileSlug={p.slug}
                        coverUrl={primary?.photos?.[0] || p.cover_url || p.avatar_url}
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

function ProviderCardListMobile({ 
  id, profileSlug, coverUrl, category, providerName, isVerified, locationName
}: { 
  id: string; profileSlug: string; coverUrl?: string | null; category: string;
  providerName: string; isVerified: boolean; locationName: string;
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
            <span className="font-display text-3xl font-bold uppercase text-muted-foreground/30">{providerName.substring(0, 2)}</span>
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
            <Link to="/p/$slug" params={{ slug: profileSlug }} className="font-display text-[16px] font-bold leading-tight text-[#1A1A1A] line-clamp-1 block tracking-tight">
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
              to="/service/$id" params={{ id: id }}
              className="flex h-[36px] flex-1 items-center justify-center rounded-[8px] bg-orange text-[12.5px] font-bold text-white hover:brightness-110 transition-all shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
            >
               View details
            </Link>
            <div 
              role="button"
              onClick={(e) => { e.preventDefault(); }}
              className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] border border-orange/20 bg-orange/5 text-orange hover:bg-orange/10 transition-colors cursor-pointer"
            >
               <MessageCircle className="h-4 w-4 pointer-events-none" />
            </div>
         </div>
      </div>
    </div>
  );
}
