import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { ServiceRequestCard, type RequestWithParty } from "@/components/ServiceRequestCard";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { ReportDialog } from "@/components/social/ReportDialog";
import { requestStatuses, type RequestStatusValue, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests/")({
  head: () => ({ meta: [{ title: "Service requests — Tuungane" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [filter, setFilter] = useState<RequestStatusValue | "all">("all");
  const [items, setItems] = useState<RequestWithParty[]>([]);
  const [feedbackFor, setFeedbackFor] = useState<ServiceRequestRow | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: "/requests" } as never });
  }, [loading, user, nav]);

  const [loadingItems, setLoadingItems] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoadingItems(true);
    try {
      const { data } = await apiClient<{ data: RequestWithParty[] }>(`/requests/me?role=${role}`);
      setItems(data || []);
    } catch (err) {
      toast.error("Failed to load requests");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user, role]);

  const updateStatus = async (id: string, status: RequestStatusValue) => {
    try {
      await apiClient(`/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      toast.success(`Marked ${status.replace("_", " ")}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const openDispute = async (r: ServiceRequestRow) => {
    const reason = window.prompt("Briefly describe the issue:");
    if (!reason || !user) return;
    const against = user.id === r.customer_id ? r.provider_id : r.customer_id;
    if (!against) return toast.error("Cannot open dispute on an open (untaken) request");
    
    try {
      await apiClient(`/requests/${r.id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason,
          against_user_id: against
        })
      });
      toast.success("Dispute opened. Tuungane will review.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open dispute");
    }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="font-display text-3xl font-bold text-navy">Service requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track requests, mark progress, and leave verified reviews.</p>

        <div className="mt-4 inline-flex rounded-full border border-border bg-card p-1">
          <button onClick={() => setRole("customer")} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${role === "customer" ? "bg-orange text-orange-foreground" : "text-muted-foreground"}`}>Requests I sent</button>
          <button onClick={() => setRole("provider")} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${role === "provider" ? "bg-orange text-orange-foreground" : "text-muted-foreground"}`}>Requests I received</button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          {requestStatuses.map((s) => (
            <Chip key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)}>{s.label}</Chip>
          ))}
        </div>

        <div className="mt-5 space-y-3 pb-12">
          {loadingItems && items.length === 0 && (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </>
          )}
          {!loadingItems && filtered.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={`No requests ${role === "customer" ? "sent" : "received"} yet`}
              description={role === "customer" ? "Find a verified provider and send your first service request." : "When members send requests in your category, they'll show up here."}
              action={role === "customer" ? { label: "Browse services", to: "/services" } : { label: "See open requests", to: "/requests/browse" }}
            />
          )}
          {filtered.map((r) => (
            <ServiceRequestCard
              key={r.id}
              r={r}
              viewerRole={role}
              onStatus={(s) => updateStatus(r.id, s)}
              onFeedback={() => setFeedbackFor(r)}
              onDispute={() => openDispute(r)}
              onReport={() => setReportFor(r.id)}
            />
          ))}
        </div>

        <FeedbackDialog open={!!feedbackFor} request={feedbackFor} onClose={() => setFeedbackFor(null)} onSubmitted={load} />
        <ReportDialog open={!!reportFor} onClose={() => setReportFor(null)} targetType="service_request" targetId={reportFor ?? ""} />
      </section>
    </>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground hover:border-navy"}`}>{children}</button>
  );
}
