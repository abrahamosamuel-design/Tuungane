import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

type Row = {
  id: string; slug: string; name: string; org_type: string;
  verified: string; is_featured: boolean; suspended: boolean;
  claim_status: string; district: string | null; created_at: string;
};

export function BusinessesAdminTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("business_pages")
      .select("id,slug,name,org_type,verified,is_featured,suspended,claim_status,district,created_at")
      .order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const setVerified = async (id: string, v: "verified" | "none") => {
    await supabase.from("business_pages").update({ verified: v }).eq("id", id);
    toast.success(v === "verified" ? "Verified" : "Verification removed"); load();
  };
  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("business_pages").update({ is_featured: !current }).eq("id", id);
    toast.success(!current ? "Featured" : "Unfeatured"); load();
  };
  const toggleSuspend = async (id: string, current: boolean) => {
    await supabase.from("business_pages").update({ suspended: !current }).eq("id", id);
    toast.success(!current ? "Suspended" : "Reinstated"); load();
  };

  const filtered = q.trim()
    ? rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.slug.includes(q.toLowerCase()))
    : rows;

  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or slug…"
        className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm" />
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No business pages.</p>}
      {filtered.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-navy">{r.name}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{r.org_type}</span>
              {r.verified === "verified" && <span className="rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-bold text-green">VERIFIED</span>}
              {r.is_featured && <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">FEATURED</span>}
              {r.suspended && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">SUSPENDED</span>}
            </div>
            <p className="text-xs text-muted-foreground">{r.district || "—"} · {timeAgo(r.created_at)} · /{r.slug}</p>
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            <Link to="/businesses/$slug" params={{ slug: r.slug }} className="rounded border border-border px-2 py-1">View</Link>
            <button onClick={() => setVerified(r.id, r.verified === "verified" ? "none" : "verified")} className="rounded bg-green/10 px-2 py-1 text-green">{r.verified === "verified" ? "Unverify" : "Verify"}</button>
            <button onClick={() => toggleFeatured(r.id, r.is_featured)} className="rounded bg-orange/10 px-2 py-1 text-orange">{r.is_featured ? "Unfeature" : "Feature"}</button>
            <button onClick={() => toggleSuspend(r.id, r.suspended)} className="rounded bg-destructive/10 px-2 py-1 text-destructive">{r.suspended ? "Reinstate" : "Suspend"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
