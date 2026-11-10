import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function LandingSearchBox() {
  const [query, setQuery] = useState("");
  const nav = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      nav({ to: "/services", search: { q: query.trim() } });
    }
  };

  return (
    <div className="relative z-30 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-20">
      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-2xl ring-1 ring-black/5">
        <h2 className="font-display text-2xl font-bold text-navy mb-6">
          Find a service today!
        </h2>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="sr-only" htmlFor="service-search">What service do you need?</label>
            <input
              id="service-search"
              type="text"
              placeholder="E.g., Plumbing, Cleaning, Web Design..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-border bg-muted/30 px-6 py-4 text-base outline-none transition-all focus:border-orange focus:bg-white focus:ring-2 focus:ring-orange/20"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-8 py-4 text-sm font-bold text-white transition-all hover:scale-[0.98] hover:bg-navy/90"
          >
            <Search className="h-5 w-5" /> Search Services
          </button>
        </form>
      </div>
    </div>
  );
}
