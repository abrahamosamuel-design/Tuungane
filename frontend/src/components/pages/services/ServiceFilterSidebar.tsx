import { ShieldCheck, Filter, RotateCcw, Star } from "lucide-react";
import { categories } from "@/data/categories";

export type FilterState = {
  verifiedOnly: boolean;
  categories: string[];
  region: string;
  radiusKm: number;
  minPrice: string;
  maxPrice: string;
  minRating: number;
};

type ServiceFilterSidebarProps = {
  filters: FilterState;
  setFilters: (f: (prev: FilterState) => FilterState) => void;
  onReset: () => void;
  className?: string;
};

export function ServiceFilterSidebar({ filters, setFilters, onReset, className = "" }: ServiceFilterSidebarProps) {
  
  const regions = ["Nairobi", "Mombasa", "Kisumu", "Eldoret"];

  const toggleCategory = (slug: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(slug) 
        ? prev.categories.filter(c => c !== slug)
        : [...prev.categories, slug]
    }));
  };

  return (
    <aside className={`space-y-4 ${className}`}>
      <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-5 h-5 text-navy" />
            <h2 className="font-bold text-lg text-navy">Refine Search</h2>
          </div>
          <button onClick={onReset} className="text-xs font-semibold text-orange hover:underline flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset All
          </button>
        </div>

        {/* Filter Section 1: Verification Toggle */}
        <div className="py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-navy flex items-center gap-1">
                Verified Providers Only
                <ShieldCheck className="w-4 h-4 text-green-500" />
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">Show ID and trade-vetted pros</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={filters.verifiedOnly}
                onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange"></div>
            </label>
          </div>
        </div>

        {/* Filter Section 2: Service Categories */}
        <div className="py-3 border-b border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Industry & Category
          </h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <label key={cat.slug} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className="rounded text-orange focus:ring-orange border-border" 
                    checked={filters.categories.includes(cat.slug)}
                    onChange={() => toggleCategory(cat.slug)}
                  />
                  <span className="text-sm font-medium text-navy group-hover:text-orange transition-colors">
                    {cat.name}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Filter Section 3: Location / Hub City */}
        <div className="py-3 border-b border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Metro Region & Hub
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {regions.map(r => (
              <button 
                key={r}
                onClick={() => setFilters(prev => ({ ...prev, region: prev.region === r ? "" : r }))}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center transition-all border ${
                  filters.region === r 
                    ? "bg-navy text-white border-navy" 
                    : "bg-muted/30 hover:bg-muted text-navy border-border"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-muted-foreground font-medium">Proximity Radius</span>
              <span className="font-semibold text-navy">Within {filters.radiusKm} km</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="100" 
              className="w-full accent-orange cursor-pointer" 
              value={filters.radiusKm}
              onChange={(e) => setFilters(prev => ({ ...prev, radiusKm: parseInt(e.target.value) }))}
            />
          </div>
        </div>

        {/* Filter Section 4: Price Range */}
        <div className="py-3 border-b border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Price Range (UGX)
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-1/2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Min</span>
              <div className="relative mt-0.5">
                <input 
                  type="number" 
                  className="w-full px-2 py-1.5 bg-muted/30 border border-border rounded-lg text-sm font-semibold text-navy focus:border-orange focus:ring-1 focus:ring-orange" 
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                />
              </div>
            </div>
            <span className="text-muted-foreground mt-3">-</span>
            <div className="w-1/2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Max</span>
              <div className="relative mt-0.5">
                <input 
                  type="number" 
                  className="w-full px-2 py-1.5 bg-muted/30 border border-border rounded-lg text-sm font-semibold text-navy focus:border-orange focus:ring-1 focus:ring-orange" 
                  placeholder="Any"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section 5: Minimum Rating */}
        <div className="pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Minimum Provider Rating
          </h3>
          <div className="space-y-1">
            {[4.5, 4.0, 3.5, 0].map(rating => (
              <label key={rating} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="rating" 
                  className="text-orange focus:ring-orange border-border" 
                  checked={filters.minRating === rating}
                  onChange={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                />
                <span className="flex items-center text-sm font-medium text-navy">
                  {rating > 0 ? (
                    <>
                      <Star className="w-4 h-4 text-orange fill-current mr-1" />
                      {rating.toFixed(1)} stars & higher
                    </>
                  ) : "Any Rating"}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Mini Banner */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 text-green-600 shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-green-900">Tuungane Verified Guarantee</h4>
          <p className="text-xs text-green-800/80 mt-0.5 leading-snug">
            Direct verification of trade certifications and identity records ensures escrowed milestone safety.
          </p>
        </div>
      </div>
    </aside>
  );
}
