import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Phone, MessageCircle, Mail, Eye, AlertTriangle, Settings as SettingsIcon, Download, MessageSquare } from "lucide-react";
import { timeAgo } from "@/lib/format";

const STATUSES = ["requested", "accepted", "in_progress", "completed", "cancelled", "disputed"] as const;

type ServiceRequestStatus = typeof STATUSES[number];

interface LogRow {
  id: string;
  customer_id: string;
  provider_id: string;
  service_request_id: string;
  service_job_id: string | null;
  contact_method: string;
  clicked_at: string;
  request_status: ServiceRequestStatus;
  is_urgent: boolean;
}

type RevealRow = { id: string; customer_id: string; provider_id: string; service_request_id: string; reveal_reason: string | null; created_at: string };

const SETTING_KEY = "contact_visibility";

type VisibilitySettings = Record<string, boolean>;

const DEFAULT_TOGGLES: { key: string; label: string; description: string }[] = [
  { key: "require_request_before_reveal", label: "Require service request before reveal", description: "Customers must send a tracked request before phone/WhatsApp/email are unlocked." },
  { key: "allow_whatsapp_reveal", label: "Allow WhatsApp reveal", description: "Show WhatsApp button after the gating policy is satisfied." },
  { key: "allow_phone_reveal", label: "Allow phone-call reveal", description: "Show Call button after the gating policy is satisfied." },
  { key: "allow_email_reveal", label: "Allow email reveal", description: "Show Email button after the gating policy is satisfied." },
  { key: "log_contact_clicks", label: "Log contact clicks", description: "Record every WhatsApp/Call/Email click for analytics and safety review." },
  { key: "log_contact_reveals", label: "Log contact reveals", description: "Record every time a customer reveals a provider's phone or WhatsApp." },
];

export function ContactAnalyticsTab() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [reveals, setReveals] = useState<RevealRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [settings, setSettings] = useState<VisibilitySettings>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"analytics" | "settings">("analytics");

  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | "all">("all");
  const [jobFilter, setJobFilter] = useState<"all" | "has_job" | "no_job">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const load = async () => {
    let lq = supabase.from("contact_logs").select("*, service_requests!inner(status)").order("clicked_at", { ascending: false }).limit(200);
    if (dateFrom) lq = lq.gte("clicked_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) lq = lq.lte("clicked_at", `${dateTo}T23:59:59Z`);

    let rq = supabase.from("contact_reveals").select("*").order("created_at", { ascending: false }).limit(200);
    if (dateFrom) rq = rq.gte("created_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) rq = rq.lte("created_at", `${dateTo}T23:59:59Z`);

    const [l, r, s] = await Promise.all([
      lq,
      rq,
      supabase.from("admin_settings").select("id,setting_value").eq("setting_key", SETTING_KEY).maybeSingle(),
    ]);
    const raw = (l.data ?? []) as unknown as Array<{
      id: string;
      customer_id: string;
      provider_id: string;
      service_request_id: string;
      service_job_id: string | null;
      contact_method: string;
      clicked_at: string;
      is_urgent: boolean;
      service_requests: { status: ServiceRequestStatus };
    }>;
    const ll: LogRow[] = raw.map((x) => ({
      id: x.id,
      customer_id: x.customer_id,
      provider_id: x.provider_id,
      service_request_id: x.service_request_id,
      service_job_id: x.service_job_id,
      contact_method: x.contact_method,
      clicked_at: x.clicked_at,
      request_status: x.service_requests.status,
      is_urgent: x.is_urgent,
    }));
    const rr = (r.data ?? []) as RevealRow[];
    setLogs(ll);
    setReveals(rr);
    const ids = Array.from(new Set([...ll.flatMap((x) => [x.customer_id, x.provider_id]), ...rr.flatMap((x) => [x.customer_id, x.provider_id])]));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      setProfiles(new Map((profs ?? []).map((p) => [p.id, p.full_name || p.id.slice(0, 8)])));
    }
    const sv = (s.data?.setting_value as VisibilitySettings | undefined) ?? {};
    const merged: VisibilitySettings = {};
    for (const t of DEFAULT_TOGGLES) merged[t.key] = sv[t.key] ?? true;
    setSettings(merged);
    setSettingsId((s.data?.id as string | undefined) ?? null);
  };

  useEffect(() => { load(); }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (statusFilter !== "all" && l.request_status !== statusFilter) return false;
      if (jobFilter === "has_job" && l.service_job_id === null) return false;
      if (jobFilter === "no_job" && l.service_job_id !== null) return false;
      return true;
    });
  }, [logs, statusFilter, jobFilter]);

  const stats = useMemo(() => {
    const byMethod = new Map<string, number>();
    for (const l of filteredLogs) byMethod.set(l.contact_method, (byMethod.get(l.contact_method) ?? 0) + 1);
    const byStatus = new Map<string, number>();
    for (const l of filteredLogs) byStatus.set(l.request_status, (byStatus.get(l.request_status) ?? 0) + 1);
    const uniqueProviders = new Set(filteredLogs.map((l) => l.provider_id)).size;
    const uniqueCustomers = new Set(filteredLogs.map((l) => l.customer_id)).size;
    const jobLinked = filteredLogs.filter((l) => l.service_job_id !== null).length;
    const jobNull = filteredLogs.filter((l) => l.service_job_id === null).length;
    const urgentClicks = filteredLogs.filter((l) => l.is_urgent).length;
    const nonUrgentClicks = filteredLogs.length - urgentClicks;
    // suspicious: customers contacting many providers
    const perCust = new Map<string, Set<string>>();
    for (const l of filteredLogs) {
      if (!perCust.has(l.customer_id)) perCust.set(l.customer_id, new Set());
      perCust.get(l.customer_id)!.add(l.provider_id);
    }
    const suspicious = Array.from(perCust.entries())
      .filter(([, s]) => s.size >= 5)
      .map(([cid, s]) => ({ customer_id: cid, providers: s.size }))
      .sort((a, b) => b.providers - a.providers)
      .slice(0, 10);
    return { byMethod, byStatus, uniqueProviders, uniqueCustomers, suspicious, jobLinked, jobNull, urgentClicks, nonUrgentClicks };
  }, [filteredLogs]);

  const saveSettings = async () => {
    setBusy(true);
    let res;
    if (settingsId) {
      res = await supabase.from("admin_settings").update({ setting_value: settings, updated_at: new Date().toISOString() }).eq("id", settingsId);
    } else {
      res = await supabase.from("admin_settings").insert({ setting_key: SETTING_KEY, setting_value: settings });
    }
    setBusy(false);
    if (res.error) toast.error(res.error.message);
    else { toast.success("Contact visibility settings saved"); load(); }
  };

  const methodIcon = (m: string) => m === "whatsapp" ? <MessageCircle className="h-3 w-3" /> : m === "email" ? <Mail className="h-3 w-3" /> : m === "message" ? <MessageSquare className="h-3 w-3" /> : <Phone className="h-3 w-3" />;

  const exportCSV = () => {
    if (filteredLogs.length === 0) { toast.info("No data to export"); return; }
    const rows = filteredLogs.map((l) => ({
      customer: (profiles.get(l.customer_id) ?? l.customer_id).replace(/"/g, '""'),
      provider: (profiles.get(l.provider_id) ?? l.provider_id).replace(/"/g, '""'),
      method: l.contact_method,
      status: l.request_status,
      job_linked: l.service_job_id ? "yes" : "no",
      clicked_at: l.clicked_at,
    }));
    const headers = ["Customer", "Provider", "Method", "Request Status", "Job Linked", "Clicked At"];
    const csv = [
      headers.join(","),
      ...rows.map((r) => [
        `"${r.customer}"`,
        `"${r.provider}"`,
        r.method,
        r.status,
        r.job_linked,
        r.clicked_at,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const rangeLabel = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : dateFrom ? `_from_${dateFrom}` : dateTo ? `_to_${dateTo}` : "";
    link.download = `contact_logs${rangeLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} rows to CSV`);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => setView("analytics")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${view === "analytics" ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground hover:border-navy"}`}>
          <Activity className="mr-1 inline h-3 w-3" /> Analytics
        </button>
        <button onClick={() => setView("settings")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${view === "settings" ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground hover:border-navy"}`}>
          <SettingsIcon className="mr-1 inline h-3 w-3" /> Visibility settings
        </button>
      </div>

      {view === "analytics" && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h3>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1 text-xs items-center">
                <span className="text-muted-foreground mr-1">Request status:</span>
                <button onClick={() => setStatusFilter("all")} className={`rounded-full px-2.5 py-1 font-semibold ${statusFilter === "all" ? "bg-navy text-navy-foreground" : "border border-border hover:border-navy"}`}>All</button>
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-2.5 py-1 font-semibold capitalize ${statusFilter === s ? "bg-navy text-navy-foreground" : "border border-border hover:border-navy"}`}>{s.replace("_", " ")}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 text-xs items-center">
                <span className="text-muted-foreground mr-1">Job link:</span>
                <button onClick={() => setJobFilter("all")} className={`rounded-full px-2.5 py-1 font-semibold ${jobFilter === "all" ? "bg-navy text-navy-foreground" : "border border-border hover:border-navy"}`}>All</button>
                <button onClick={() => setJobFilter("has_job")} className={`rounded-full px-2.5 py-1 font-semibold ${jobFilter === "has_job" ? "bg-navy text-navy-foreground" : "border border-border hover:border-navy"}`}>Has job ID</button>
                <button onClick={() => setJobFilter("no_job")} className={`rounded-full px-2.5 py-1 font-semibold ${jobFilter === "no_job" ? "bg-navy text-navy-foreground" : "border border-border hover:border-navy"}`}>No job ID</button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs items-center pt-1">
                <span className="text-muted-foreground mr-1">Date range:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs"
                />
                <button onClick={load} className="rounded-full bg-navy px-3 py-1 text-[10px] font-bold text-navy-foreground uppercase tracking-wider">Apply</button>
                <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:border-navy">Clear</button>
                <button onClick={exportCSV} className="rounded-full bg-orange px-3 py-1 text-[10px] font-bold text-orange-foreground uppercase tracking-wider"><Download className="inline h-3 w-3 mr-0.5" />Export CSV</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card label="Total contact clicks" value={filteredLogs.length} />
            <Card label="Unique customers" value={stats.uniqueCustomers} />
            <Card label="Unique providers" value={stats.uniqueProviders} />
            <Card label="Message clicks" value={stats.byMethod.get("message") ?? 0} />
            <Card label="Call clicks" value={stats.byMethod.get("call") ?? 0} />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card label="Job linked" value={stats.jobLinked} />
            <Card label="Job unlinked" value={stats.jobNull} />
            <Card label="Urgent clicks" value={stats.urgentClicks} />
            <Card label="Non-urgent clicks" value={stats.nonUrgentClicks} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clicks by method</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(stats.byMethod.entries()).map(([m, n]) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-navy">{methodIcon(m)} {m} · {n}</span>
              ))}
              {stats.byMethod.size === 0 && <span className="text-xs text-muted-foreground">No clicks in this view.</span>}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clicks by request status</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(stats.byStatus.entries()).map(([s, n]) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-navy">{s.replace("_", " ")} · {n}</span>
              ))}
              {stats.byStatus.size === 0 && <span className="text-xs text-muted-foreground">No data in this view.</span>}
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><AlertTriangle className="h-3 w-3" /> Suspicious patterns</h3>
            {stats.suspicious.length === 0 && <p className="text-xs text-muted-foreground">No customers contacting 5+ providers detected.</p>}
            <div className="space-y-1">
              {stats.suspicious.map((s) => (
                <div key={s.customer_id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs">
                  <span className="font-mono text-navy">{profiles.get(s.customer_id) ?? s.customer_id.slice(0, 8)}</span>
                  <span className="font-semibold text-destructive">contacted {s.providers} providers</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent reveals</h3>
            <div className="space-y-1">
              {reveals.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-navy"><Eye className="mr-1 inline h-3 w-3" /> {profiles.get(r.customer_id) ?? "Customer"}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="text-navy">{profiles.get(r.provider_id) ?? "Provider"}</span>
                  </div>
                  <span className="text-muted-foreground">{timeAgo(r.created_at)}</span>
                </div>
              ))}
              {reveals.length === 0 && <p className="text-xs text-muted-foreground">No reveals yet.</p>}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent contact clicks</h3>
            <div className="space-y-1">
              {filteredLogs.slice(0, 15).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2 text-xs">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 capitalize">{methodIcon(l.contact_method)} {l.contact_method}</span>
                    <span className="text-navy">{profiles.get(l.customer_id) ?? "Customer"}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-navy">{profiles.get(l.provider_id) ?? "Provider"}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                      l.request_status === "completed" ? "bg-green/10 text-green" :
                      l.request_status === "accepted" || l.request_status === "in_progress" ? "bg-orange/10 text-orange" :
                      l.request_status === "cancelled" || l.request_status === "disputed" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>{l.request_status.replace("_", " ")}</span>
                    {l.service_job_id ? <span className="rounded-full bg-green/10 px-1.5 py-0.5 text-[10px] font-bold text-green">job</span> : <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">no job</span>}
                  </div>
                  <span className="text-muted-foreground">{timeAgo(l.clicked_at)}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && <p className="text-xs text-muted-foreground">No contact activity in this view.</p>}
            </div>
          </div>
        </div>
      )}

      {view === "settings" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Control platform-wide gating of provider contact details. The "Request first" principle is enforced regardless of these toggles — these refine which channels are offered after the gate.</p>
          <div className="space-y-2">
            {DEFAULT_TOGGLES.map((t) => (
              <label key={t.key} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">{t.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings[t.key] ?? true}
                  onChange={(e) => setSettings((s) => ({ ...s, [t.key]: e.target.checked }))}
                  className="mt-1 h-5 w-5 shrink-0 accent-orange"
                />
              </label>
            ))}
          </div>
          <button disabled={busy} onClick={saveSettings} className="rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

