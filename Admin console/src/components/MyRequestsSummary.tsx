import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { requestStatusMap, type ServiceRequestRow } from "@/data/serviceRequestTypes";

interface Props {
  limit?: number;
  title?: string;
}

export function MyRequestsSummary({ limit = 5, title = "My service requests" }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Array<ServiceRequestRow & { counterparty?: { full_name: string; avatar_url: string | null } }>>([]);
  const [counts, setCounts] = useState({ active: 0, completed: 0, disputed: 0, total: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: res } = await apiClient(`/requests/me?role=all`);
        const list = (res.data ?? []) as ServiceRequestRow[];
        const active = list.filter((r) => ["requested", "accepted", "in_progress"].includes(r.status)).length;
        const completed = list.filter((r) => r.status === "completed").length;
        const disputed = list.filter((r) => r.status === "disputed").length;
        setCounts({ active, completed, disputed, total: list.length });
        
        const top = list.slice(0, limit);
        // The backend `/requests/me` now joins `customer` and `provider` object for us!
        setItems(top.map((r: any) => ({
          ...r,
          counterparty: r.customer_id === user.id ? r.provider : r.customer
        })));
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load summary", err);
        setLoaded(true);
      }
    })();
  }, [user, limit]);

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-orange/10 p-2 text-orange"><ClipboardList className="h-4 w-4" /></div>
          <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
        </div>
        <Link to="/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Active" value={counts.active} accent="text-navy" />
        <MiniStat label="Completed" value={counts.completed} accent="text-green" />
        <MiniStat label="Disputed" value={counts.disputed} accent="text-destructive" />
      </div>

      <div className="mt-4 space-y-2">
        {!loaded && <p className="text-xs text-muted-foreground">Loading…</p>}
        {loaded && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            <p>No service requests yet.</p>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
              <Link to="/services" className="rounded-full bg-orange px-3 py-1 font-semibold text-orange-foreground">Browse services</Link>
              <Link to="/requests/browse" className="rounded-full border border-border px-3 py-1 font-semibold text-navy hover:border-orange">See open requests</Link>
            </p>
          </div>
        )}
        {items.map((r) => {
          const s = requestStatusMap[r.status];
          return (
            <Link key={r.id} to="/requests/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:border-orange">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">{r.service_needed}</p>
                <p className="truncate text-xs text-muted-foreground">with {r.counterparty?.full_name ?? "Someone"} · {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>{s.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-center">
      <p className={`font-display text-xl font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
