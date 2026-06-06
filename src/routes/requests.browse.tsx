import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, ShieldAlert } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import { RequestCard, type RequestRowLite } from "@/components/RequestCard";
import { EmptyState } from "@/components/EmptyState";
import { ProviderTrackCTA } from "@/components/cta/ProviderTrackCTA";
import {
  REQUESTS_COPY,
  REQUESTS_SAFETY_TEXT,
  requestFilterChips,
  type RequestFilterChip,
} from "@/data/requestTypes";
import { useAuth } from "@/hooks/use-auth";
import { useUserLocation } from "@/hooks/use-user-location";
import { sortByProximity } from "@/lib/location";

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
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [cat, setCat] = useState("");
  const [chip, setChip] = useState<RequestFilterChip>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [budgetShown, setBudgetShown] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [myDistrict, setMyDistrict] = useState<string | null>(null);
  const [items, setItems] = useState<RequestRowLite[]>([]);
  const [loading, setLoading] = useState(true);

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
      .select("id,customer_id,provider_id,category_slug,subcategory,service_needed,title,visibility,location,district,town,area,latitude,longitude,description,preferred_date,preferred_time,urgency,budget_range,preferred_contact_method,attachment_url,status,urgent_flag,created_at,updated_at,completed_at,cancelled_at,disputed_at,service_profile_id,selected_provider_id,completion_code,provider_confirmed_completion,customer_confirmed_completion")
      .eq("visibility", "public")
      .eq("status", "requested")
      .is("provider_id", null)
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
  const rankedItems = useMemo(() => sortByProximity(items, userLoc, (r) => r), [items, userLoc]);

  return (
    <Layout>
      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange">
                {REQUESTS_COPY.eyebrow}
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
                {REQUESTS_COPY.heading}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">{REQUESTS_COPY.supporting}</p>
            </div>
            <Link
              to="/requests/new"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> {REQUESTS_COPY.primaryCTA}
            </Link>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="mt-6 flex flex-col gap-2 sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-foreground">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={REQUESTS_COPY.searchPlaceholder}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder={REQUESTS_COPY.locationPlaceholder}
              className="rounded-full bg-white/95 px-4 py-2.5 text-sm text-foreground outline-none sm:w-72"
            />
            <button className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ProviderTrackCTA
          title="Want customers to find you too?"
          text="List your skill and show your work so people can discover you even before you respond to requests."
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filter</p>
              <div className="flex flex-wrap gap-2">
                {requestFilterChips.map((c) => (
                  <Pill key={c.value} active={chip === c.value} onClick={() => setChip(c.value)}>
                    {c.label}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
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

            <div className="flex gap-3 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
              <ShieldAlert className="h-4 w-4 shrink-0 text-orange" />
              <p>{REQUESTS_SAFETY_TEXT}</p>
            </div>
          </aside>

          <div>
            <h2 className="mb-3 font-display text-lg font-bold text-navy">
              {REQUESTS_COPY.listTitle}
            </h2>
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && items.length === 0 && (
              <EmptyState
                icon={Plus}
                title={REQUESTS_COPY.emptyTitle}
                description={REQUESTS_COPY.emptyDescription}
                action={{ label: REQUESTS_COPY.emptyCTA, to: "/requests/new" }}
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((r) => (
                <RequestCard key={r.id} r={r} />
              ))}
            </div>
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
