import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Plus, ShieldAlert, SlidersHorizontal, ChevronDown, ChevronUp, MapPin, ArrowLeft } from "lucide-react";

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
import { MobileSearchBar } from "@/components/MobileSearchBar";

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
    <div className="flex flex-col min-h-screen bg-background flex-1 w-full min-w-0">
      {/* MOBILE HEADER - matches rest of app */}
      <div className="md:hidden bg-white">
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <button onClick={() => window.history.back()} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-navy" />
          </button>
          <h2 className="font-display text-lg font-bold text-navy">Service Requests</h2>
        </div>
        <MobileSearchBar placeholder="Search requests" value={q} onChange={(e: any) => setQ(e.target.value)} />
      </div>

      {/* DESKTOP HEADER */}
      <section className="hidden md:block bg-surface/95 backdrop-blur-md pt-4 pb-3 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-4xl">
            Service Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-lg">
            Find jobs near you and send quotes.
          </p>
        </div>
      </section>

      {/* DESKTOP SEARCH */}
      <section className="hidden md:block bg-surface/95 pb-4 pt-3 sm:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex flex-row items-center gap-2 rounded-full border border-border bg-card p-2 md:p-3 shadow-sm md:shadow-md"
          >
            <div className="flex flex-1 items-center gap-2 rounded-full bg-surface px-3 py-1 sm:bg-transparent min-w-0">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What service do you need?"
                className="w-full min-w-0 bg-transparent min-h-[44px] text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            
            <div className="relative flex shrink-0 items-center justify-center rounded-full bg-surface focus-within:border-orange h-auto w-auto flex-1 px-4 py-1 bg-transparent">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mr-2" />
              <select
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                className="relative bg-transparent min-h-[44px] text-base outline-none text-foreground appearance-none w-full"
                title="Location"
              >
                <option value="">All Locations</option>
                <option value="Kampala">Kampala</option>
                <option value="Entebbe">Entebbe</option>
                <option value="Wakiso">Wakiso</option>
                <option value="Jinja">Jinja</option>
                <option value="Gulu">Gulu</option>
                <option value="Mbarara">Mbarara</option>
                <option value="Mbale">Mbale</option>
              </select>
            </div>
            
            <button className="shrink-0 h-auto w-auto rounded-full bg-navy px-6 flex items-center justify-center py-2.5 text-base font-bold text-white transition hover:bg-navy/90 active:scale-[0.98]">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 w-full flex-1 min-w-0">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-w-0 w-full">
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
      className={`shrink-0 min-h-[40px] rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
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
