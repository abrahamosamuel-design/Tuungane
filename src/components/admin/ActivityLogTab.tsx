import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

type LogRow = {
  id: string;
  created_at: string;
  action: string;
  details: Record<string, unknown> | null;
  target_type: string | null;
  target_id: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  target_user_id: string | null;
  target_name: string | null;
  target_email: string | null;
};

export function ActivityLogTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_search_activity_log", {
        _q: q || undefined,
        _limit: 200,
        _offset: 0,
      });
      if (cancelled) return;
      if (error) toast.error(error.message);
      setRows((data as LogRow[] | null) ?? []);
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.info("Nothing to export");
      return;
    }
    const headers = [
      "timestamp", "action", "actor_name", "actor_email", "actor_user_id",
      "target_name", "target_email", "target_user_id", "target_type", "target_id", "details",
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([
        new Date(r.created_at).toISOString(),
        r.action,
        r.actor_name ?? "",
        r.actor_email ?? "",
        r.actor_user_id ?? "",
        r.target_name ?? "",
        r.target_email ?? "",
        r.target_user_id ?? "",
        r.target_type ?? "",
        r.target_id ?? "",
        r.details ?? {},
      ].map(escape).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tuungane-activity-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-navy">Admin activity log</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{rows.length} entries</span>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-navy-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>
      <Input
        placeholder="Search by action, admin, target user, email, phone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading && rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No activity recorded yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="font-semibold text-navy">{formatAction(r.action)}</div>
                  <div className="text-xs text-muted-foreground" title={new Date(r.created_at).toLocaleString()}>
                    {timeAgo(r.created_at)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{r.actor_name || r.actor_email || "Unknown admin"}</span>
                  {r.target_user_id && (
                    <>
                      {" "}→{" "}
                      <span className="font-medium text-foreground">
                        {r.target_name || r.target_email || r.target_user_id.slice(0, 8)}
                      </span>
                    </>
                  )}
                  {r.details && Object.keys(r.details).length > 0 && (
                    <span className="ml-2 inline-flex flex-wrap gap-1">
                      {Object.entries(r.details).map(([k, v]) => (
                        <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatAction(a: string): string {
  return a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
