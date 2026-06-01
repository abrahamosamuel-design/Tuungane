import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

type Dispute = {
  id: string; service_request_id: string; raised_by_user_id: string; against_user_id: string;
  reason: string; description: string; status: string; admin_notes: string | null;
  created_at: string; resolved_at: string | null;
};

export function DisputesAdminTab() {
  const [rows, setRows] = useState<Dispute[]>([]);
  const [filter, setFilter] = useState<"open" | "reviewing" | "resolved" | "dismissed" | "all">("open");
  const [note, setNote] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("service_disputes").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data ?? []) as Dispute[]);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    const patch: { status: typeof status; admin_notes?: string; resolved_at?: string } = { status };
    if (note[id]) patch.admin_notes = note[id];
    if (status === "resolved" || status === "dismissed") patch.resolved_at = new Date().toISOString();
    await supabase.from("service_disputes").update(patch).eq("id", id);
    toast.success(`Marked ${status}`); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-xs">
        {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 font-semibold capitalize ${filter === f ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground"}`}>{f}</button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No disputes in this view.</p>}
      {rows.map((d) => (
        <div key={d.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy">{d.reason}</p>
              <p className="text-xs text-muted-foreground">Request {d.service_request_id.slice(0, 8)} · raised by {d.raised_by_user_id.slice(0, 8)} vs {d.against_user_id.slice(0, 8)} · {timeAgo(d.created_at)}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${d.status === "open" ? "bg-destructive/10 text-destructive" : d.status === "reviewing" ? "bg-orange/10 text-orange" : "bg-green/10 text-green"}`}>{d.status}</span>
          </div>
          {d.description && <p className="mt-2 text-sm text-foreground/80">{d.description}</p>}
          {d.admin_notes && <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Admin note:</span> {d.admin_notes}</p>}
          {d.status !== "resolved" && d.status !== "dismissed" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input value={note[d.id] || ""} onChange={(e) => setNote((s) => ({ ...s, [d.id]: e.target.value }))} placeholder="Admin note (optional)…" className="flex-1 min-w-[200px] rounded-md border border-border bg-background px-2 py-1 text-xs" />
              <button onClick={() => setStatus(d.id, "reviewing")} className="rounded bg-orange/10 px-2 py-1 text-xs text-orange">Reviewing</button>
              <button onClick={() => setStatus(d.id, "resolved")} className="rounded bg-green/10 px-2 py-1 text-xs text-green">Resolve</button>
              <button onClick={() => setStatus(d.id, "dismissed")} className="rounded px-2 py-1 text-xs hover:bg-muted">Dismiss</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
