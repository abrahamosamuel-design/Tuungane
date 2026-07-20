import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Plus, ShieldAlert, SlidersHorizontal, ChevronDown, ChevronUp, MapPin } from "lucide-react";

import { apiClient } from "@/lib/api";
import { useCategories } from "@/hooks/use-categories";
import { RequestCard, type RequestRowLite } from "@/components/RequestCard";
import { EmptyState } from "@/components/EmptyState";
import { ProviderTrackCTA } from "@/components/cta/ProviderTrackCTA";
import {
  requestFilterChips,
  type RequestFilterChip,
} from "@/data/requestTypes";
import { useAuth } from "@/hooks/use-auth";
import { useUserLocation } from "@/hooks/use-user-location";
import { filterByRadius, sortByProximity } from "@/lib/location";
import { RadiusFilter } from "@/components/RadiusFilter";
import { EditRequestDialog } from "@/components/EditRequestDialog";

export function RequestsBrowsePage() {
  const { user } = useAuth();
  const { location: userLoc } = useUserLocation();
  const { categories } = useCategories();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [cat, setCat] = useState("");
  const [chip, setChip] = useState<RequestFilterChip>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [budgetShown, setBudgetShown] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [myDistrict, setMyDistrict] = useState<string | null>(null);
  const [items, setItems] = useState<RequestRowLite[]>([]);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const res = await apiClient<{ data: { district?: string | null } | null }>(`/profiles/me`);
        setMyDistrict(res?.district ?? null);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  const load = async () => {
    setLoading(true);
    
    try {
      const searchParams = new URLSearchParams();
      if (cat) searchParams.set("cat", cat);
      if (chip) searchParams.set("chip", chip);
      if (urgentOnly) searchParams.set("urgentOnly", "true");
      if (budgetShown) searchParams.set("budgetShown", "true");
      if (loc) searchParams.set("loc", loc);
      if (q) searchParams.set("q", q);
      if (myDistrict) searchParams.set("myDistrict", myDistrict);
      if (nearMe) searchParams.set("nearMe", "true");

      const res = await apiClient<{ data: RequestRowLite[] }>(`/requests/browse?${searchParams.toString()}`);
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load requests", err);
      setItems([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, chip, urgentOnly, budgetShown, nearMe, myDistrict, user?.id]);

  const category = useMemo(() => categories.find((c) => c.slug === cat), [cat]);
  const rankedItems = useMemo(() => {
    const sorted = sortByProximity(items, userLoc, (r) => r);
    const filtered = filterByRadius(sorted, userLoc, (r) => r, radiusKm);
    return filtered;
  }, [items, userLoc, radiusKm]);
  const radiusExpanded = radiusKm != null && userLoc && rankedItems.length === 0 && items.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="relative overflow-hidden bg-background pt-4 pb-4 sm:pt-10 sm:pb-8 border-b border-border shadow-sm md:shadow-none">
        {/* Decorative background blur */}
        <div className="absolute inset-x-0 -top-40 -z-10 mx-auto h-[400px] w-full max-w-4xl rounded-[100%] bg-orange/5 blur-[100px]" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Service Requests
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-lg">
                Find jobs near you and send quotes.
              </p>
            </div>
            <Link
              to="/requests/new"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-orange/10 px-5 py-2 text-sm font-bold text-orange transition-colors hover:bg-orange/20 active:scale-[0.98] md:rounded-full"
            >
              <Plus className="h-4 w-4" /> Post Request
            </Link>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-md sm:flex-row sm:items-center md:rounded-full sm:p-2 md:shadow-sm"
          >
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-4 py-1 sm:bg-transparent">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What service do you need?"
                className="w-full bg-transparent min-h-[44px] text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-4 py-1 sm:bg-transparent">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="Location (e.g. Entebbe)"
                className="w-full bg-transparent min-h-[44px] text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button className="mt-2 w-full min-h-[44px] rounded-xl bg-navy px-6 py-2.5 text-base font-bold text-white transition hover:bg-navy/90 sm:mt-0 sm:w-auto md:rounded-full active:scale-[0.98]">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 w-full flex-1">
        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {requestFilterChips
            .filter((c) => ["all", "urgent", "today", "week", "nearby"].includes(c.value))
            .map((c) => (
              <Pill key={c.value} active={chip === c.value} onClick={() => setChip(c.value)}>
                {c.label}
              </Pill>
            ))}
          <button
            onClick={() => setShowMoreFilters((s) => !s)}
            className={`shrink-0 snap-start inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
              showMoreFilters ? "border-navy bg-navy text-navy-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:border-navy hover:text-navy"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" /> More filters
          </button>
        </div>

        {showMoreFilters && (
          <div className="mt-4 grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 md:p-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</p>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 min-h-[48px] text-base outline-none focus:border-navy"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {category && (
                <p className="mt-2 text-sm text-muted-foreground">{category.blurb}</p>
              )}
            </div>
            <div className="space-y-3 text-base md:text-sm">
              <label className="flex items-center gap-3 p-1 -m-1">
                <input type="checkbox" className="h-5 w-5 md:h-4 md:w-4 rounded border-border text-navy" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} /> <span className="font-medium text-navy">Urgent only</span>
              </label>
              <label className="flex items-center gap-3 p-1 -m-1">
                <input type="checkbox" className="h-5 w-5 md:h-4 md:w-4 rounded border-border text-navy" checked={budgetShown} onChange={(e) => setBudgetShown(e.target.checked)} /> <span className="font-medium text-navy">Budget shown</span>
              </label>
              <label className="flex items-center gap-3 p-1 -m-1">
                <input
                  type="checkbox"
                  className="h-5 w-5 md:h-4 md:w-4 rounded border-border text-navy disabled:opacity-50"
                  checked={nearMe}
                  onChange={(e) => setNearMe(e.target.checked)}
                  disabled={!myDistrict}
                />
                <span className="font-medium text-navy">Near me {myDistrict ? `(${myDistrict})` : "(set your district)"}</span>
              </label>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-border/50">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Distance</p>
              <RadiusFilter value={radiusKm} onChange={setRadiusKm} disabled={!userLoc} />
            </div>
          </div>
        )}

        {/* Safety notice compact */}
        <SafetyNotice />

        {/* List */}
        <div className="mt-5 pb-32 sm:pb-12">
          {loading && <p className="text-base text-muted-foreground px-2">Loading requests&hellip;</p>}
          {!loading && radiusExpanded && (
            <div className="mb-4 rounded-xl border border-orange/30 bg-orange/5 p-4 text-sm text-foreground/80">
              Not many results in your area within {radiusKm} km yet.{" "}
              <button onClick={() => setRadiusKm(null)} className="font-bold text-orange underline p-1 -m-1">
                Show all results
              </button>
            </div>
          )}
          {!loading && rankedItems.length === 0 && !radiusExpanded && (
            <div className="py-6">
              <EmptyState
                icon={Plus}
                title="No service requests available yet"
                description="Requests from people looking for services will appear here."
                action={{ label: "Post a Service Request", to: "/requests/new" }}
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {rankedItems.map((r, idx) => (
              <Fragment key={r.id}>
                <RequestCard r={r} userLoc={userLoc} currentUserId={user?.id ?? null} onEdit={() => setEditingRequest(r.id)} />
                {idx === 1 && (
                  <div className="sm:col-span-2 my-2">
                    <ProviderTrackCTA
                      title="Want people to find you too?"
                      text="List your service so people looking for it can discover you."
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      
      <EditRequestDialog
        open={!!editingRequest}
        requestId={editingRequest}
        onClose={() => setEditingRequest(null)}
        onSaved={load}
      />
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 snap-start min-h-[40px] rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
        active ? "bg-navy text-navy-foreground border border-navy shadow-sm" : "border border-border bg-background text-muted-foreground hover:border-navy hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

function SafetyNotice() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-orange/20 bg-orange/5 p-4 text-sm text-foreground/80">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
        <div className="flex-1">
          <p className="font-medium text-navy">Stay safe: verify the requester, location, and request details before starting work.</p>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-2 inline-flex items-center gap-1 font-bold text-orange hover:underline p-1 -m-1"
            >
              Safety tips <ChevronDown className="h-4 w-4" />
            </button>
          )}
          {expanded && (
            <div className="mt-2.5">
              <p className="text-foreground/80 leading-relaxed">
                Verify the customer, location, and request details before starting work. Do not share sensitive information or make unsafe payments. Report suspicious requests.
              </p>
              <button
                onClick={() => setExpanded(false)}
                className="mt-2 inline-flex items-center gap-1 font-bold text-orange hover:underline p-1 -m-1"
              >
                Hide <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
