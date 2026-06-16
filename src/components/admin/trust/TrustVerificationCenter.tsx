import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";
import { TrustBadge, TRUST_LABEL, type TrustLevel } from "@/components/trust/TrustBadge";

type SubTab = "overview" | "requests" | "reports" | "status" | "notes" | "audit" | "settings";

const SUBTABS: Array<{ id: SubTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "Verification Requests" },
  { id: "reports", label: "Reported Profiles" },
  { id: "status", label: "Trust Status" },
  { id: "notes", label: "Admin Notes" },
  { id: "audit", label: "Audit Log" },
  { id: "settings", label: "Settings" },
];

export function TrustVerificationCenter() {
  const [tab, setTab] = useState<SubTab>("overview");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === t.id ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground hover:border-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <OverviewSub />}
      {tab === "requests" && <RequestsSub />}
      {tab === "reports" && <ReportsSub />}
      {tab === "status" && <StatusSub />}
      {tab === "notes" && <NotesSub />}
      {tab === "audit" && <AuditSub />}
      {tab === "settings" && <SettingsSub />}
    </div>
  );
}

// ---------- Overview ----------
function OverviewSub() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(0);
  const [reports, setReports] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profile_trust_status")
        .select("profile_kind,manual_level,auto_level,reports_count");
      const c: Record<string, number> = {};
      let reportsTotal = 0;
      for (const r of (data ?? []) as Array<{ manual_level: TrustLevel | null; auto_level: TrustLevel; reports_count: number }>) {
        const lvl = (r.manual_level ?? r.auto_level) as TrustLevel;
        c[lvl] = (c[lvl] ?? 0) + 1;
        if (r.reports_count > 0) reportsTotal += 1;
      }
      setCounts(c);
      setReports(reportsTotal);

      const { count: pCount } = await supabase
        .from("profile_verification_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "more_info"]);
      setPending(pCount ?? 0);
    })();
  }, []);

  const card = (label: string, value: number, tone = "navy") => (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className={`font-display text-2xl font-bold text-${tone}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {card("New", counts.new ?? 0)}
        {card("Phone Verified", counts.phone_verified ?? 0)}
        {card("Profile Complete", counts.profile_complete ?? 0)}
        {card("Reviewed Provider", counts.reviewed_provider ?? 0, "green")}
        {card("Verified Provider", counts.verified_provider ?? 0, "green")}
        {card("Verified Business", counts.verified_business ?? 0, "green")}
        {card("Verified Org", counts.verified_organization ?? 0, "green")}
        {card("Pending Requests", pending, "orange")}
        {card("Under Review", counts.under_review ?? 0, "orange")}
        {card("Suspended", counts.suspended ?? 0, "destructive")}
        {card("Reported", reports, "destructive")}
      </div>
      <NeedsAttentionList />
    </div>
  );
}

function NeedsAttentionList() {
  const [items, setItems] = useState<Array<{ key: string; label: string; sub: string; href?: string }>>([]);
  useEffect(() => {
    (async () => {
      const out: Array<{ key: string; label: string; sub: string }> = [];
      const { data: pr } = await supabase.from("profile_verification_requests").select("id,profile_id,requested_type,created_at").in("status", ["pending", "more_info"]).order("created_at", { ascending: true }).limit(5);
      for (const r of (pr ?? []) as Array<{ id: string; profile_id: string; requested_type: string; created_at: string }>) {
        out.push({ key: `pvr:${r.id}`, label: `Verification request · ${r.requested_type.replace("verified_", "")}`, sub: `Profile ${r.profile_id.slice(0, 8)} · submitted ${timeAgo(r.created_at)}` });
      }
      const { data: ts } = await supabase.from("profile_trust_status").select("profile_kind,profile_id,reports_count,manual_level").gt("reports_count", 0).order("reports_count", { ascending: false }).limit(5);
      for (const r of (ts ?? []) as Array<{ profile_kind: string; profile_id: string; reports_count: number; manual_level: TrustLevel | null }>) {
        out.push({ key: `rep:${r.profile_id}`, label: `${r.reports_count} open report(s)`, sub: `${r.profile_kind} · ${r.profile_id.slice(0, 8)}${r.manual_level ? ` · ${TRUST_LABEL[r.manual_level]}` : ""}` });
      }
      setItems(out);
    })();
  }, []);
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Needs Attention</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i.key} className="flex flex-col">
            <span className="font-semibold text-navy">{i.label}</span>
            <span className="text-xs text-muted-foreground">{i.sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Verification Requests ----------
type ReqRow = {
  id: string;
  profile_kind: "service_profile" | "business_page";
  profile_id: string;
  owner_user_id: string;
  requested_type: string;
  status: string;
  full_name: string | null;
  contact_person: string | null;
  business_name: string | null;
  phone: string | null;
  location: string | null;
  experience_summary: string | null;
  admin_note: string | null;
  created_at: string;
};

function RequestsSub() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("profile_verification_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter as never);
    const { data } = await q;
    setRows((data ?? []) as ReqRow[]);
  };
  useEffect(() => {
    load();
  }, [filter]);

  const act = async (id: string, decision: "approve" | "reject" | "more_info" | "revoke") => {
    const { error } = await supabase.rpc("admin_decide_verification_request" as never, {
      _request_id: id,
      _decision: decision,
      _admin_note: notes[id] || null,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Request ${decision}`);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-xs">
        {["pending", "more_info", "approved", "rejected", "revoked", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 font-semibold capitalize ${filter === f ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No requests in this view.</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy">{r.business_name || r.full_name || "Profile"} — {r.requested_type.replace("verified_", "Verified ")}</p>
              <p className="text-xs text-muted-foreground">{r.profile_kind} · {r.profile_id.slice(0, 8)} · {timeAgo(r.created_at)}</p>
            </div>
            <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase text-orange">{r.status}</span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {r.contact_person && <p><b>Contact:</b> {r.contact_person}</p>}
            {r.phone && <p><b>Phone:</b> {r.phone}</p>}
            {r.location && <p><b>Location:</b> {r.location}</p>}
          </div>
          {r.experience_summary && <p className="mt-2 text-sm text-foreground/80">{r.experience_summary}</p>}
          {r.admin_note && <p className="mt-1 text-xs text-muted-foreground"><b>Admin note:</b> {r.admin_note}</p>}
          {(r.status === "pending" || r.status === "more_info" || r.status === "approved") && (
            <div className="mt-3 space-y-2">
              <input
                value={notes[r.id] || ""}
                onChange={(e) => setNotes((s) => ({ ...s, [r.id]: e.target.value }))}
                placeholder="Admin note (optional)…"
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                {(r.status === "pending" || r.status === "more_info") && (
                  <>
                    <button onClick={() => act(r.id, "approve")} className="rounded bg-green/10 px-2 py-1 text-xs font-semibold text-green">Approve</button>
                    <button onClick={() => act(r.id, "more_info")} className="rounded bg-orange/10 px-2 py-1 text-xs font-semibold text-orange">Request More Info</button>
                    <button onClick={() => act(r.id, "reject")} className="rounded bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Reject</button>
                  </>
                )}
                {r.status === "approved" && (
                  <button onClick={() => act(r.id, "revoke")} className="rounded bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Revoke Verification</button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Reports ----------
type Report = {
  id: string;
  profile_kind: "service_profile" | "business_page";
  profile_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
};

function ReportsSub() {
  const [rows, setRows] = useState<Report[]>([]);
  const [filter, setFilter] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("profile_reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter as never);
    const { data } = await q;
    setRows((data ?? []) as Report[]);
  };
  useEffect(() => {
    load();
  }, [filter]);

  const act = async (id: string, resolution: "dismiss" | "review" | "action") => {
    const { error } = await supabase.rpc("admin_resolve_profile_report" as never, {
      _report_id: id,
      _resolution: resolution,
      _note: notes[id] || null,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Report ${resolution}`);
    load();
  };

  const setLevel = async (kind: "service_profile" | "business_page", id: string, level: TrustLevel, reason: string) => {
    const { error } = await supabase.rpc("admin_set_trust_level" as never, { _kind: kind, _id: id, _level: level, _reason: reason } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Profile marked ${TRUST_LABEL[level]}`);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-xs">
        {["open", "reviewed", "dismissed", "action_taken", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 font-semibold capitalize ${filter === f ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No reports in this view.</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy">{r.reason}</p>
              <p className="text-xs text-muted-foreground">{r.profile_kind} · {r.profile_id.slice(0, 8)} · reported {timeAgo(r.created_at)}</p>
            </div>
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">{r.status}</span>
          </div>
          {r.description && <p className="mt-2 text-sm text-foreground/80">{r.description}</p>}
          {r.status === "open" && (
            <div className="mt-3 space-y-2">
              <input value={notes[r.id] || ""} onChange={(e) => setNotes((s) => ({ ...s, [r.id]: e.target.value }))} placeholder="Resolution note (optional)…" className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs" />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => act(r.id, "dismiss")} className="rounded px-2 py-1 text-xs hover:bg-muted">Dismiss</button>
                <button onClick={() => act(r.id, "review")} className="rounded bg-orange/10 px-2 py-1 text-xs text-orange">Mark reviewed</button>
                <button onClick={() => setLevel(r.profile_kind, r.profile_id, "under_review", `report ${r.id.slice(0, 6)}`)} className="rounded bg-orange/10 px-2 py-1 text-xs text-orange">Mark Under Review</button>
                <button onClick={() => setLevel(r.profile_kind, r.profile_id, "suspended", `report ${r.id.slice(0, 6)}`)} className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">Suspend profile</button>
                <button onClick={() => act(r.id, "action")} className="rounded bg-green/10 px-2 py-1 text-xs text-green">Mark action taken</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Trust Status ----------
type StatusRow = {
  profile_kind: "service_profile" | "business_page";
  profile_id: string;
  owner_user_id: string;
  auto_level: TrustLevel;
  manual_level: TrustLevel | null;
  reports_count: number;
  updated_at: string;
};

const ALL_LEVELS: TrustLevel[] = [
  "new", "phone_verified", "profile_complete", "reviewed_provider",
  "verified_provider", "verified_business", "verified_organization",
  "under_review", "suspended",
];

function StatusSub() {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [kind, setKind] = useState<"all" | "service_profile" | "business_page">("all");
  const [lvl, setLvl] = useState<"all" | TrustLevel>("all");
  const [q, setQ] = useState("");

  const load = async () => {
    let qy = supabase.from("profile_trust_status").select("*").order("updated_at", { ascending: false }).limit(200);
    if (kind !== "all") qy = qy.eq("profile_kind", kind);
    const { data } = await qy;
    setRows((data ?? []) as StatusRow[]);
  };
  useEffect(() => {
    load();
  }, [kind]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const displayed = (r.manual_level ?? r.auto_level) as TrustLevel;
      if (lvl !== "all" && displayed !== lvl) return false;
      if (q && !r.profile_id.includes(q) && !r.owner_user_id.includes(q)) return false;
      return true;
    });
  }, [rows, lvl, q]);

  const setLevel = async (r: StatusRow, level: TrustLevel) => {
    const { error } = await supabase.rpc("admin_set_trust_level" as never, { _kind: r.profile_kind, _id: r.profile_id, _level: level, _reason: "manual change" } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Set to ${TRUST_LABEL[level]}`);
    load();
  };

  const clearManual = async (r: StatusRow) => {
    const { error } = await supabase.rpc("admin_clear_manual_trust_level" as never, { _kind: r.profile_kind, _id: r.profile_id, _reason: "cleared" } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Manual level cleared");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as never)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
          <option value="all">All profile types</option>
          <option value="service_profile">Service profiles</option>
          <option value="business_page">Business pages</option>
        </select>
        <select value={lvl} onChange={(e) => setLvl(e.target.value as never)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
          <option value="all">All trust levels</option>
          {ALL_LEVELS.map((l) => <option key={l} value={l}>{TRUST_LABEL[l]}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search profile or owner id…" className="flex-1 min-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-xs" />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} profiles</p>
      {filtered.map((r) => {
        const displayed = (r.manual_level ?? r.auto_level) as TrustLevel;
        return (
          <div key={`${r.profile_kind}:${r.profile_id}`} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-navy">{r.profile_kind} · {r.profile_id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">owner {r.owner_user_id.slice(0, 8)} · {r.reports_count} report(s) · updated {timeAgo(r.updated_at)}</p>
              </div>
              <TrustBadge level={displayed} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-muted-foreground mr-1">Auto: {TRUST_LABEL[r.auto_level]}</span>
              <span className="text-muted-foreground mr-1">| Manual: {r.manual_level ? TRUST_LABEL[r.manual_level] : "—"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
              {(["verified_provider", "verified_business", "verified_organization", "under_review", "suspended"] as TrustLevel[]).map((l) => (
                <button key={l} onClick={() => setLevel(r, l)} className="rounded border border-border px-2 py-0.5 hover:bg-muted">Set {TRUST_LABEL[l]}</button>
              ))}
              {r.manual_level && (
                <button onClick={() => clearManual(r)} className="rounded bg-muted px-2 py-0.5 hover:bg-muted/80">Clear manual</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Admin Notes ----------
type Note = {
  id: string; profile_kind: string; profile_id: string; author_id: string; note: string; created_at: string;
};
function NotesSub() {
  const [rows, setRows] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState({ kind: "service_profile" as "service_profile" | "business_page", id: "", note: "" });

  const load = async () => {
    const { data } = await supabase.from("profile_admin_notes").select("*").order("created_at", { ascending: false }).limit(100);
    setRows((data ?? []) as Note[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = q ? rows.filter((r) => r.note.toLowerCase().includes(q.toLowerCase()) || r.profile_id.includes(q)) : rows;

  const add = async () => {
    if (!draft.id || !draft.note) { toast.error("Profile id and note required"); return; }
    const { error } = await supabase.rpc("admin_add_profile_note" as never, { _kind: draft.kind, _id: draft.id, _note: draft.note } as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Note added");
    setDraft({ ...draft, id: "", note: "" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add note</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_auto]">
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as never })} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
            <option value="service_profile">service_profile</option>
            <option value="business_page">business_page</option>
          </select>
          <input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder="profile id (uuid)" className="rounded-md border border-border bg-background px-2 py-1 text-xs" />
          <button onClick={add} className="rounded bg-orange px-3 py-1 text-xs font-semibold text-orange-foreground">Add</button>
        </div>
        <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} rows={2} placeholder="Private note…" className="mt-2 w-full resize-none rounded-md border border-border bg-background px-2 py-1 text-xs" />
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs" />
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No notes.</p>}
      {filtered.map((n) => (
        <div key={n.id} className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{n.profile_kind} · {n.profile_id.slice(0, 8)} · by {n.author_id.slice(0, 8)} · {timeAgo(n.created_at)}</p>
          <p className="mt-1 text-sm">{n.note}</p>
        </div>
      ))}
    </div>
  );
}

// ---------- Audit Log ----------
type Audit = {
  id: string; actor_id: string | null; action: string; profile_kind: string | null; profile_id: string | null;
  prev_level: TrustLevel | null; new_level: TrustLevel | null; reason: string | null; created_at: string;
};
function AuditSub() {
  const [rows, setRows] = useState<Audit[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("trust_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      setRows((data ?? []) as Audit[]);
    })();
  }, []);
  const filtered = q ? rows.filter((r) => r.action.includes(q) || (r.profile_id ?? "").includes(q) || (r.reason ?? "").toLowerCase().includes(q.toLowerCase())) : rows;
  return (
    <div className="space-y-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action / profile / reason…" className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs" />
      {filtered.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-2 text-xs">
          <div className="flex flex-wrap justify-between gap-1">
            <span className="font-semibold text-navy">{r.action}</span>
            <span className="text-muted-foreground">{timeAgo(r.created_at)}</span>
          </div>
          <p className="text-muted-foreground">
            {r.profile_kind} · {r.profile_id?.slice(0, 8) ?? "—"} · actor {r.actor_id?.slice(0, 8) ?? "system"}
            {r.prev_level && r.new_level ? ` · ${TRUST_LABEL[r.prev_level]} → ${TRUST_LABEL[r.new_level]}` : ""}
          </p>
          {r.reason && <p className="mt-0.5">{r.reason}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------- Settings ----------
type Settings = {
  manual_verification_open: boolean;
  documents_required: boolean;
  min_completed_jobs_for_reviewed: number;
  min_verified_reviews_for_reviewed: number;
  report_auto_flag_threshold: number;
  allow_boost_unverified: boolean;
  show_badges_publicly: boolean;
};
function SettingsSub() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("trust_settings").select("*").eq("id", 1).maybeSingle();
      setS(data as Settings);
    })();
  }, []);
  if (!s) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const save = async (patch: Partial<Settings>) => {
    setBusy(true);
    const next = { ...s, ...patch };
    setS(next);
    const { error } = await supabase.from("trust_settings").update(patch as never).eq("id", 1);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <Toggle label="Accept manual verification requests" v={s.manual_verification_open} on={(v) => save({ manual_verification_open: v })} />
      <Toggle label="Require documents for verification" v={s.documents_required} on={(v) => save({ documents_required: v })} />
      <Toggle label="Allow boosting for unverified profiles" v={s.allow_boost_unverified} on={(v) => save({ allow_boost_unverified: v })} />
      <Toggle label="Show trust badges publicly" v={s.show_badges_publicly} on={(v) => save({ show_badges_publicly: v })} />
      <NumberField label="Min completed jobs for Reviewed Provider" v={s.min_completed_jobs_for_reviewed} on={(v) => save({ min_completed_jobs_for_reviewed: v })} />
      <NumberField label="Min verified reviews for Reviewed Provider" v={s.min_verified_reviews_for_reviewed} on={(v) => save({ min_verified_reviews_for_reviewed: v })} />
      <NumberField label="Auto-flag profile after this many open reports" v={s.report_auto_flag_threshold} on={(v) => save({ report_auto_flag_threshold: v })} />
      {busy && <p className="text-[11px] text-muted-foreground">Saving…</p>}
    </div>
  );
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} />
    </label>
  );
}
function NumberField({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="number" value={v} min={0} onChange={(e) => on(parseInt(e.target.value || "0", 10))} className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-xs" />
    </label>
  );
}
