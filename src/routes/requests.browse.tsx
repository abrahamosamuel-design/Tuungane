import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/use-categories";
import { RequestCard, type RequestRowLite } from "@/components/RequestCard";
import { EmptyState } from "@/components/EmptyState";
import { ProviderTrackCTA } from "@/components/cta/ProviderTrackCTA";
import {
  REQUESTS_SAFETY_TEXT,
  requestFilterChips,
  type RequestFilterChip,
} from "@/data/requestTypes";
import { useAuth } from "@/hooks/use-auth";
import { useUserLocation } from "@/hooks/use-user-location";
import { filterByRadius, sortByProximity } from "@/lib/location";
import { RadiusFilter } from "@/components/RadiusFilter";

export const Route = createFileRoute("/requests/browse")({
  head: () => ({
    meta: [
      { title: "Find Open Requests — Tuungane" },
      {
        name: "description",
        content:
          "Browse real requests from people and businesses looking for skilled help nearby on Tuungane.",
      },
    ],
  }),
  component: BrowseRequests,
});

function BrowseRequests() {
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
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("district").eq("id", user.id).maybeSingle();
      setMyDistrict(data?.district ?? null);
    })();
  }, [user]);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("service_requests")
      .select("id,customer_id,provider_id,category_slug,subcategory,service_needed,title,visibility,location,district,town,area,latitude,longitude,description,preferred_date,preferred_time,urgency,budget_range,preferred_contact_method,attachment_url,status,urgent_flag,created_at,updated_at,completed_at,cancelled_at,disputed_at,service_profile_id,selected_provider_id,provider_confirmed_completion,customer_confirmed_completion")
      .eq("visibility", "public")
      .eq("status", "requested")
      
      .order("created_at", { ascending: false })
      .limit(80);

    if (cat) query = query.eq("category_slug", cat);
    if (chip === "urgent" || urgentOnly) query = query.eq("urgent_flag", true);
    if (chip === "today") query = query.eq("urgency", "emergency");
    if (chip === "week") query = query.eq("urgency", "urgent");
    if (budgetShown) query = query.not("budget_range", "is", null);
    if (loc) query = query.or(`town.ilike.%${loc}%,district.ilike.%${loc}%,location.ilike.%${loc}%`);
    if (q) query = query.or(`title.ilike.%${q}%,service_needed.ilike.%${q}%,description.ilike.%${q}%`);
    if ((chip === "nearby" || nearMe) && myDistrict) query = query.eq("district", myDistrict);

    const { data } = await query;
    let list = (data ?? []) as unknown as RequestRowLite[];

    // attach customer names + response counts in parallel
    const customerIds = Array.from(new Set(list.map((r) => r.customer_id)));
    const requestIds = list.map((r) => r.id);
    const [{ data: profs }, { data: resps }] = await Promise.all([
      customerIds.length
        ? supabase.from("profiles").select("id,full_name").in("id", customerIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
      requestIds.length
        ? supabase.from("provider_responses").select("request_id").in("request_id", requestIds)
        : Promise.resolve({ data: [] as Array<{ request_id: string }> }),
    ]);
    const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    const countMap = new Map<string, number>();
    (resps ?? []).forEach((r) => countMap.set(r.request_id, (countMap.get(r.request_id) ?? 0) + 1));
    list = list.map((r) => ({
      ...r,
      customer_name: nameMap.get(r.customer_id) ?? null,
      response_count: countMap.get(r.id) ?? 0,
    }));

    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, chip, urgentOnly, budgetShown, nearMe, myDistrict]);

  const category = useMemo(() => categories.find((c) => c.slug === cat), [cat]);
  const rankedItems = useMemo(() => {
    const sorted = sortByProximity(items, userLoc, (r) => r);
    const filtered = filterByRadius(sorted, userLoc, (r) => r, radiusKm);
    return filtered;
  }, [items, userLoc, radiusKm]);
  const radiusExpanded = radiusKm != null && userLoc && rankedItems.length === 0 && items.length > 0;

  return (
    <Layout>
      <section className="bg-navy py-5 text-white sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-orange">
                Open Requests
              </p>
              <h1 className="mt-0.5 font-display text-2xl font-bold sm:text-3xl">
                Open Requests Near You
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-white/70 sm:text-sm">
                Browse real customer requests near you and respond with your offer.
              </p>
            </div>
            <Link
              to="/requests/new"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              <Plus className="h-3.5 w-3.5" /> Create
            </Link>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-foreground">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search requests…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="Location e.g. Entebbe, Kampala, Wakiso"
              className="rounded-full bg-white/95 px-3.5 py-2 text-sm text-foreground outline-none sm:w-72"
            />
            <button className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <ProviderTrackCTA
          title="Want customers to find you too?"
          text="List your skill so people can discover you even before you respond to requests."
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {requestFilterChips
            .filter((c) => ["all", "urgent", "today", "week", "nearby"].includes(c.value))
            .map((c) => (
              <Pill key={c.value} active={chip === c.value} onClick={() => setChip(c.value)}>
                {c.label}
              </Pill>
            ))}
          <button
            onClick={() => setShowMoreFilters((s) => !s)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              showMoreFilters ? "border-navy bg-navy text-navy-foreground" : "border-border bg-background text-muted-foreground hover:border-navy"
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" /> More filters
          </button>
        </div>

        {showMoreFilters && (
          <div className="mt-3 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {category && (
                <p className="mt-1 text-[11px] text-muted-foreground">{category.blurb}</p>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} /> Urgent only
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={budgetShown} onChange={(e) => setBudgetShown(e.target.checked)} /> Budget shown
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={nearMe}
                  onChange={(e) => setNearMe(e.target.checked)}
                  disabled={!myDistrict}
                />
                Near me {myDistrict ? `(${myDistrict})` : "(set your district)"}
              </label>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Distance</p>
              <RadiusFilter value={radiusKm} onChange={setRadiusKm} disabled={!userLoc} />
            </div>
          </div>
        )}

        {/* Safety notice compact */}
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/5 px-3 py-2 text-[11px] text-foreground/80">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-orange" />
          <p>{REQUESTS_SAFETY_TEXT}</p>
        </div>

        {/* List */}
        <div className="mt-4">
          <h2 className="mb-2.5 font-display text-base font-bold text-navy sm:text-lg">
            Recent requests
          </h2>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && radiusExpanded && (
            <div className="mb-3 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
              Not many results in your area within {radiusKm} km yet.{" "}
              <button onClick={() => setRadiusKm(null)} className="font-semibold text-orange underline">
                Show all results
              </button>
            </div>
          )}
          {!loading && rankedItems.length === 0 && !radiusExpanded && (
            <EmptyState
              icon={Plus}
              title="No requests yet"
              description="Be the first to create a request, or check back soon for requests near you."
              action={{ label: "Create a request", to: "/requests/new" }}
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {rankedItems.map((r) => (
              <RequestCard key={r.id} r={r} userLoc={userLoc} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"
      }`}
    >
      {children}
    </button>
  );
}
