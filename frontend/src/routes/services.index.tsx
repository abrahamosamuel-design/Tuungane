import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { ShieldCheck, ChevronDown, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ServiceCard } from "@/components/pages/services/ServiceCard";
import { ServiceFilterSidebar, FilterState } from "@/components/pages/services/ServiceFilterSidebar";
import type { PriceType } from "@/lib/price-guide";

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

  return (
    <div className="bg-muted/10 min-h-screen flex flex-col">
      {/* SUBHEADER HERO STRIP */}
      <section className="bg-white border-b border-border py-6">
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
        
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4 flex gap-2">
          <input 
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or bio"
            className="flex-1 rounded-xl border border-border bg-white px-4 py-2 text-sm"
          />
          <button 
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="px-4 py-2 bg-white border border-border rounded-xl text-navy font-semibold text-sm flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      coverUrl={primary?.photos?.[0] || p.cover_url}
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
            )}

            {/* PAGINATION CONTROLS */}
            {!loading && filteredItems.length > 0 && (
              <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-navy">1 - {filteredItems.length}</span> of <span className="font-semibold text-navy">{filteredItems.length}</span> verified service listings
                </p>
                <div className="flex items-center gap-1.5">
                  <button disabled className="p-2 rounded-xl border border-border bg-white text-muted-foreground disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="w-9 h-9 rounded-xl bg-navy text-white font-semibold text-sm shadow-sm">1</button>
                  <button className="p-2 rounded-xl border border-border bg-white text-navy hover:bg-muted transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
