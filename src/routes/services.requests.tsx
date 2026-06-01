import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Send, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/social/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { useAuth } from "@/hooks/use-auth";
import { EmptyState } from "@/components/EmptyState";
import { categories } from "@/data/categories";
import { urgencyOptions, requestStatusMap, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/services/requests")({
  head: () => ({
    meta: [
      { title: "Service Requests Feed — Tuungane" },
      { name: "description", content: "Browse open service requests from customers across Uganda. Respond to jobs that match your skills." },
    ],
  }),
  component: ServiceRequestsFeed,
});

type RequestWithCustomer = ServiceRequestRow & { customer?: { full_name: string; avatar_url: string | null }; response_count: number };

function ServiceRequestsFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<RequestWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("");
  const [town, setTown] = useState("");
  const [urg, setUrg] = useState("");
  const [search, setSearch] = useState("");
  const [providerCategory, setProviderCategory] = useState<string | null>(null);
  const { has: isBoostedReq } = useBoostedSet("service_request", ["urgent_request"]);

  useEffect(() => {
    (async () => {
      if (user) {
        const { data } = await supabase.from("service_profiles").select("category_slug").eq("user_id", user.id).maybeSingle();
        if (data) setProviderCategory(data.category_slug);
      }
    })();
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .eq("status", "requested")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(60);
    const list = (data ?? []) as ServiceRequestRow[];
    const ids = Array.from(new Set(list.map((r) => r.customer_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids)
      : { data: [] as Array<{ id: string; full_name: string; avatar_url: string | null }> };
    const pmap = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    const reqIds = list.map((r) => r.id);
    const { data: counts } = reqIds.length
      ? await supabase.from("provider_responses").select("request_id").in("request_id", reqIds).neq("status", "withdrawn")
      : { data: [] as Array<{ request_id: string }> };
    const cmap = new Map<string, number>();
    (counts ?? []).forEach((c: { request_id: string }) => cmap.set(c.request_id, (cmap.get(c.request_id) ?? 0) + 1));
    setItems(list.map((r) => ({ ...r, customer: pmap.get(r.customer_id), response_count: cmap.get(r.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((r) => {
    if (cat && r.category_slug !== cat) return false;
    if (town && !(r.town ?? "").toLowerCase().includes(town.toLowerCase())) return false;
    if (urg && r.urgency !== urg) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${r.title ?? ""} ${r.service_needed} ${r.description} ${r.subcategory ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => Number(isBoostedReq(b.id)) - Number(isBoostedReq(a.id))), [items, cat, town, urg, search, isBoostedReq]);

  const matching = providerCategory ? filtered.filter((r) => r.category_slug === providerCategory) : [];

  return (
    <Layout>
      <section className="border-b border-border bg-surface py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">Service Requests Feed</h1>
              <p className="mt-2 text-sm text-muted-foreground">Open jobs from customers nearby. Send a response or quote to get the work.</p>
            </div>
            <Link to="/services" className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground hover:brightness-110">Request a service</Link>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_180px_180px_160px]">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests" className="w-full bg-transparent py-2.5 text-sm outline-none" />
            </div>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <input value={town} onChange={(e) => setTown(e.target.value)} placeholder="Town" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm" />
            <select value={urg} onChange={(e) => setUrg(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
              <option value="">Any urgency</option>
              {urgencyOptions.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {providerCategory && matching.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold text-navy">Matching your skill</h2>
            <p className="text-xs text-muted-foreground">Requests in your service category.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {matching.slice(0, 6).map((r) => <FeedCard key={r.id} r={r} highlight />)}
            </div>
            <hr className="my-8 border-border" />
          </>
        )}

        <h2 className="font-display text-xl font-bold text-navy">All open requests</h2>
        {loading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <div className="mt-3"><EmptyState icon={Search} title="No open requests match these filters" description="Try clearing your category or location filter to see more nearby work." /></div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => <FeedCard key={r.id} r={r} highlight={isBoostedReq(r.id)} />)}
        </div>
      </section>
    </Layout>
  );
}

function FeedCard({ r, highlight }: { r: RequestWithCustomer; highlight?: boolean }) {
  const meta = requestStatusMap[r.status];
  const urgencyLabel = urgencyOptions.find((u) => u.value === r.urgency)?.label ?? r.urgency;
  return (
    <Link to="/requests/$id" params={{ id: r.id }} className={`block rounded-2xl border p-4 transition hover:border-orange ${highlight ? "border-orange/60 bg-orange/5" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        <Avatar name={r.customer?.full_name ?? "Customer"} url={r.customer?.avatar_url ?? null} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</span>
            {r.urgency !== "normal" && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                <AlertTriangle className="h-3 w-3" /> {urgencyLabel}
              </span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
          </div>
          <p className="mt-1 font-semibold text-navy">{r.title || r.service_needed}</p>
          {r.subcategory && <p className="text-xs text-muted-foreground">{r.subcategory}</p>}
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {r.location}{r.town && `, ${r.town}`}</p>
          {r.budget_range && <p className="mt-1 text-xs text-foreground/70">Budget: {r.budget_range}</p>}
          {r.description && <p className="mt-2 line-clamp-2 text-sm text-foreground/85">{r.description}</p>}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{r.response_count} {r.response_count === 1 ? "response" : "responses"}</span>
            <span className="inline-flex items-center gap-1 text-orange font-semibold"><Send className="h-3 w-3" /> View & respond</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
