import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ChevronRight,
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
} from "lucide-react";
import { categories, ServiceCategory } from "@/data/categories";
import { MobileSearchBar } from "@/components/MobileSearchBar";

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

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Service Categories — Tuungane" },
      {
        name: "description",
        content: "Browse all service categories and find verified service providers across Uganda.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const nav = useNavigate();

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return categories;

    return categories.filter((c) => {
      const matchName = c.name.toLowerCase().includes(term);
      const matchBlurb = (c.blurb || "").toLowerCase().includes(term);
      const matchSub = (c.subcategories || []).some((s) => s.toLowerCase().includes(term));
      return matchName || matchBlurb || matchSub;
    });
  }, [searchTerm]);

  const handleCategoryClick = (categorySlug: string) => {
    nav({
      to: "/",
      search: { category: categorySlug } as never,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 md:pb-16">
      {/* Top Search Bar - Same header style as home */}
      <div className="bg-white">
        <div className="mx-auto max-w-3xl">
          <MobileSearchBar
            className="px-4 sm:px-6 py-3 bg-white"
            placeholder="What service do you need?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Categories Section with matching header style */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center justify-between px-2 sm:px-0 mb-4 mt-4">
          <h2 className="font-display text-xl font-bold text-navy">All Categories</h2>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center shadow-xs">
            <p className="text-sm font-semibold text-navy">No categories found matching "{searchTerm}"</p>
            <p className="mt-1 text-xs text-muted-foreground">Try a different search term or clear the filter.</p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 rounded-xl bg-orange px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer hover:brightness-110"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCategories.map((c: ServiceCategory) => {
              const Icon = iconMap[c.icon] || Sparkles;

              return (
                <div
                  key={c.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCategoryClick(c.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleCategoryClick(c.slug);
                    }
                  }}
                  className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-border/40 bg-white shadow-xs transition-all duration-150 hover:border-orange/50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                >
                  {/* Category Circle Icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-navy group-hover:bg-orange/10 group-hover:text-orange transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Category Name & Blurb */}
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-navy tracking-tight truncate group-hover:text-orange transition-colors">
                      {c.name}
                    </span>
                    <span className="text-[12px] text-muted-foreground line-clamp-1">
                      {c.blurb || `${c.subcategories?.length || 0} services`}
                    </span>
                  </div>

                  {/* Arrow — clicking opens the filtered service cards */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                      {c.subcategories?.length || 0} services
                    </span>
                    <ChevronRight className="h-4 w-4 text-navy/40 group-hover:text-orange group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
