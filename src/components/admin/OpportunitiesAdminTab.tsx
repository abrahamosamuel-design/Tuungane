import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

type Opp = {
  id: string; title: string; opportunity_type: string; status: string;
  archived: boolean; is_featured: boolean; district: string | null;
  poster_id: string; created_at: string;
};

export function OpportunitiesAdminTab() {
  const [rows, setRows] = useState<Opp[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "featured" | "rejected" | "archived" | "all">("pending");

  const load = async () => {
    let q = supabase.from("opportunities")
      .select("id,title,opportunity_type,status,archived,is_featured,district,poster_id,created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (filter === "archived") q = q.eq("archived", true);
    else if (filter !== "all") q = q.eq("status", filter).eq("archived", false);
    const { data } = await q;
    setRows((data ?? []) as Opp[]);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: "approved" | "featured" | "rejected") => {
    await supabase.from("opportunities").update({ status }).eq("id", id);
    toast.success(`Set ${status}`); load();
  };
  const toggleArchive = async (id: string, current: boolean) => {
    await supabase.from("opportunities").update({ archived: !current }).eq("id", id);
    toast.success(!current ? "Archived" : "Restored"); load();
  };
  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("opportunities").update({ is_featured: !current }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-xs">
        {(["pending", "approved", "featured", "rejected", "archived", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 font-semibold capitalize ${filter === f ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground"}`}>{f}</button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No opportunities in this view.</p>}
      {rows.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-navy">{o.title}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{o.opportunity_type}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.status === "pending" ? "bg-orange/10 text-orange" : o.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-green/10 text-green"}`}>{o.status}</span>
              {o.is_featured && <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">FEATURED</span>}
              {o.archived && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">ARCHIVED</span>}
            </div>
            <p className="text-xs text-muted-foreground">{o.district || "—"} · {timeAgo(o.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            <Link to="/opportunities/$id" params={{ id: o.id }} className="rounded border border-border px-2 py-1">View</Link>
            {o.status !== "approved" && <button onClick={() => setStatus(o.id, "approved")} className="rounded bg-green/10 px-2 py-1 text-green">Approve</button>}
            <button onClick={() => toggleFeatured(o.id, o.is_featured)} className="rounded bg-orange/10 px-2 py-1 text-orange">{o.is_featured ? "Unfeature" : "Feature"}</button>
            {o.status !== "rejected" && <button onClick={() => setStatus(o.id, "rejected")} className="rounded bg-destructive/10 px-2 py-1 text-destructive">Reject</button>}
            <button onClick={() => toggleArchive(o.id, o.archived)} className="rounded px-2 py-1 hover:bg-muted">{o.archived ? "Restore" : "Archive"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
