import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";
import { requestStatuses, requestStatusMap, type RequestStatusValue, type ServiceRequestRow, type ServiceFeedbackRow } from "@/data/serviceRequestTypes";
import { toast } from "sonner";

type Sub = "requests" | "feedback" | "disputes" | "stats";

export function RequestsAdminTab() {
  const [sub, setSub] = useState<Sub>("requests");
  const [requests, setRequests] = useState<ServiceRequestRow[]>([]);
  const [feedback, setFeedback] = useState<ServiceFeedbackRow[]>([]);
  const [disputes, setDisputes] = useState<Array<{ id: string; service_request_id: string; raised_by_user_id: string; reason: string; description: string; status: string; created_at: string }>>([]);
  const [filter, setFilter] = useState<RequestStatusValue | "all">("all");

  const load = async () => {
    const [r, f, d] = await Promise.all([
      supabase.from("service_requests").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("service_feedback").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("service_disputes").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setRequests((r.data ?? []) as ServiceRequestRow[]);
    setFeedback((f.data ?? []) as ServiceFeedbackRow[]);
    setDisputes(d.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: RequestStatusValue) => {
    await supabase.from("service_requests").update({ status }).eq("id", id);
    toast.success("Updated"); load();
  };
  const hideReview = async (id: string, v: boolean) => {
    await supabase.from("service_feedback").update({ is_visible: !v }).eq("id", id);
    toast.success(!v ? "Hidden" : "Visible"); load();
  };
  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("service_feedback").delete().eq("id", id); load();
  };
  const resolveDispute = async (id: string, status: "resolved" | "dismissed") => {
    await supabase.from("service_disputes").update({ status, resolved_at: new Date().toISOString() }).eq("id", id);
    toast.success("Dispute updated"); load();
  };

  const filteredReq = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const stats = {
    total: requests.length,
    requested: requests.filter((r) => r.status === "requested").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    completed: requests.filter((r) => r.status === "completed").length,
    cancelled: requests.filter((r) => r.status === "cancelled").length,
    disputed: requests.filter((r) => r.status === "disputed").length,
    reviews: feedback.length,
    avgRating: feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(2) : "—",
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["requests", "feedback", "disputes", "stats"] as Sub[]).map((s) => (
          <button key={s} onClick={() => setSub(s)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${sub === s ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground hover:border-navy"}`}>{s}</button>
        ))}
      </div>

      {sub === "requests" && (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>All ({requests.length})</Chip>
            {requestStatuses.map((s) => (
              <Chip key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)}>{s.label}</Chip>
            ))}
          </div>
          <div className="space-y-2">
            {filteredReq.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${requestStatusMap[r.status].color}`}>{requestStatusMap[r.status].label}</span>
                  <span className="font-semibold text-navy">{r.service_needed}</span>
                  <span className="text-xs text-muted-foreground">{r.location} · {timeAgo(r.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">customer {r.customer_id.slice(0, 8)} → provider {r.provider_id ? r.provider_id.slice(0, 8) : "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  {requestStatuses.map((s) => (
                    <button key={s.value} onClick={() => setStatus(r.id, s.value)} disabled={r.status === s.value} className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40">→ {s.label}</button>
                  ))}
                </div>
              </div>
            ))}
            {filteredReq.length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
          </div>
        </>
      )}

      {sub === "feedback" && (
        <div className="space-y-2">
          {feedback.length === 0 && <p className="text-sm text-muted-foreground">No verified reviews yet.</p>}
          {feedback.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-orange">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                <span className="font-semibold text-navy">{f.service_provided}</span>
                {!f.is_visible && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">hidden</span>}
                <span className="ml-auto text-xs text-muted-foreground">{timeAgo(f.created_at)}</span>
              </div>
              <p className="mt-1 text-foreground/85">{f.review_text}</p>
              <div className="mt-2 flex gap-1 text-xs">
                <button onClick={() => hideReview(f.id, f.is_visible)} className="rounded px-2 py-1 hover:bg-muted">{f.is_visible ? "Hide" : "Unhide"}</button>
                <button onClick={() => deleteReview(f.id)} className="rounded bg-destructive/10 px-2 py-1 text-destructive">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "disputes" && (
        <div className="space-y-2">
          {disputes.length === 0 && <p className="text-sm text-muted-foreground">No disputes.</p>}
          {disputes.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-semibold text-navy">{d.reason} <span className="ml-2 text-xs text-muted-foreground">{d.status} · {timeAgo(d.created_at)}</span></p>
              <p className="mt-1 text-foreground/85">{d.description}</p>
              {d.status === "open" && (
                <div className="mt-2 flex gap-1 text-xs">
                  <button onClick={() => resolveDispute(d.id, "resolved")} className="rounded bg-green/10 px-2 py-1 text-green">Resolve</button>
                  <button onClick={() => resolveDispute(d.id, "dismissed")} className="rounded px-2 py-1 hover:bg-muted">Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sub === "stats" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Total requests" value={stats.total} />
          <StatBox label="Requested" value={stats.requested} />
          <StatBox label="Accepted" value={stats.accepted} />
          <StatBox label="Completed" value={stats.completed} />
          <StatBox label="Cancelled" value={stats.cancelled} />
          <StatBox label="Disputed" value={stats.disputed} />
          <StatBox label="Verified reviews" value={stats.reviews} />
          <StatBox label="Avg rating" value={stats.avgRating} />
        </div>
      )}
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground"}`}>{children}</button>;
}
function StatBox({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-border bg-card p-3 text-center"><p className="font-display text-2xl font-bold text-navy">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
