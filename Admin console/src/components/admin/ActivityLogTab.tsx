import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
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
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  // Convert local YYYY-MM-DD inputs into ISO bounds (inclusive day range)
  const range = () => {
    const fromIso = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
    const toIso = toDate
      ? new Date(new Date(`${toDate}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    return { fromIso, toIso };
  };

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      const { fromIso, toIso } = range();
      try {
        const query = new URLSearchParams();
        if (q) query.append("q", q);
        query.append("limit", "200");
        query.append("offset", "0");
        if (fromIso) query.append("from", fromIso);
        if (toIso) query.append("to", toIso);

        const { data: resData } = await apiClient<{ data: LogRow[] }>(`/admin/activity?${query.toString()}`);
        if (cancelled) return;
        setRows(resData.data || []);
      } catch (error: any) {
        if (cancelled) return;
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fromDate, toDate]);

  const rowsToCsv = (data: LogRow[]) => {
    const headers = [
      "timestamp", "action", "actor_name", "actor_email", "actor_user_id",
      "target_name", "target_email", "target_user_id", "target_type", "target_id", "details",
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of data) {
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
    return lines.join("\n");
  };

  const download = (csv: string, suffix: string) => {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tuungane-activity-log-${suffix}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.info("Nothing to export");
      return;
    }
    download(rowsToCsv(rows), "filtered");
  };

  const exportRange = async (ignoreDates: boolean) => {
    setExportingAll(true);
    try {
      const pageSize = 500;
      let offset = 0;
      const all: LogRow[] = [];
      const { fromIso, toIso } = ignoreDates ? { fromIso: undefined, toIso: undefined } : range();
      while (true) {
        try {
          const query = new URLSearchParams();
          query.append("limit", pageSize.toString());
          query.append("offset", offset.toString());
          if (fromIso) query.append("from", fromIso);
          if (toIso) query.append("to", toIso);
          
          const { data: resData } = await apiClient<{ data: LogRow[] }>(`/admin/activity?${query.toString()}`);
          const page = resData.data || [];
          all.push(...page);
          if (page.length < pageSize) break;
          offset += pageSize;
          if (all.length >= 100000) break;
        } catch (error: any) {
          toast.error(error.message);
          return;
        }
      }
      if (all.length === 0) {
        toast.info("Nothing to export");
        return;
      }
      const suffix = ignoreDates
        ? "all"
        : `${fromDate || "start"}_to_${toDate || "now"}`;
      download(rowsToCsv(all), suffix);
      toast.success(`Exported ${all.length} entries`);
    } finally {
      setExportingAll(false);
    }
  };

  const hasRange = !!(fromDate || toDate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-navy">Admin activity log</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{rows.length} shown</span>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-navy disabled:opacity-50"
          >
            Export filtered
          </button>
          <button
            onClick={() => exportRange(false)}
            disabled={exportingAll || !hasRange}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-navy disabled:opacity-50"
            title={hasRange ? "Export entries in the selected date range" : "Pick a from/to date first"}
          >
            {exportingAll ? "Exporting…" : "Export date range"}
          </button>
          <button
            onClick={() => exportRange(true)}
            disabled={exportingAll}
            className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-navy-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {exportingAll ? "Exporting…" : "Export all"}
          </button>
        </div>
      </div>
      <Input
        placeholder="Search by action, admin, target user, email, phone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-muted-foreground">
          From
          <Input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[10rem]"
          />
        </label>
        <label className="flex flex-col text-xs text-muted-foreground">
          To
          <Input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[10rem]"
          />
        </label>
        {hasRange && (
          <button
            onClick={() => { setFromDate(""); setToDate(""); }}
            className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>


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
