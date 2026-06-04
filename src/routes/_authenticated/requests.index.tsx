import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
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

  const load = async () => {
    if (!user) return;
    const col = role === "customer" ? "customer_id" : "provider_id";
    const { data: rs } = await supabase
      .from("service_requests")
      .select("*")
      .eq(col, user.id)
      .order("created_at", { ascending: false });
    const list = (rs ?? []) as ServiceRequestRow[];
    const ids = Array.from(new Set(list.flatMap((r) => [r.customer_id, r.provider_id]).filter((id): id is string => !!id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids)
      : { data: [] as Array<{ id: string; full_name: string; avatar_url: string | null }> };
    const pmap = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    const reqIds = list.map((r) => r.id);
    const { data: fb } = reqIds.length
      ? await supabase.from("service_feedback").select("service_request_id").in("service_request_id", reqIds)
      : { data: [] as Array<{ service_request_id: string }> };
    const fbSet = new Set((fb ?? []).map((x: { service_request_id: string }) => x.service_request_id));
    setItems(list.map((r) => ({ ...r, customer: pmap.get(r.customer_id), provider: r.provider_id ? pmap.get(r.provider_id) : undefined, has_feedback: fbSet.has(r.id) })));
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user, role]);

  const updateStatus = async (id: string, status: RequestStatusValue) => {
    const { error } = await supabase.from("service_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status.replace("_", " ")}`);
    load();
  };

  const openDispute = async (r: ServiceRequestRow) => {
    const reason = window.prompt("Briefly describe the issue:");
    if (!reason || !user) return;
    const against = user.id === r.customer_id ? r.provider_id : r.customer_id;
    if (!against) return toast.error("Cannot open dispute on an open (untaken) request");
    const { error } = await supabase.from("service_disputes").insert({
      service_request_id: r.id, raised_by_user_id: user.id, against_user_id: against,
      reason: reason.slice(0, 100), description: reason.slice(0, 1000),
    });
    if (error) return toast.error(error.message);
    await supabase.from("service_requests").update({ status: "disputed" }).eq("id", r.id);
    toast.success("Dispute opened. Tuungane will review.");
    load();
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="font-display text-3xl font-bold text-navy">Service requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track requests, mark progress, and leave verified reviews.</p>

        <div className="mt-4 inline-flex rounded-full border border-border bg-card p-1">
          <button onClick={() => setRole("customer")} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${role === "customer" ? "bg-orange text-orange-foreground" : "text-muted-foreground"}`}>As customer</button>
          <button onClick={() => setRole("provider")} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${role === "provider" ? "bg-orange text-orange-foreground" : "text-muted-foreground"}`}>As provider</button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          {requestStatuses.map((s) => (
            <Chip key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)}>{s.label}</Chip>
          ))}
        </div>

        <div className="mt-5 space-y-3 pb-12">
          {filtered.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={`No requests ${role === "customer" ? "sent" : "received"} yet`}
              description={role === "customer" ? "Find a verified provider and send your first service request." : "When customers send requests in your category, they'll show up here."}
              action={role === "customer" ? { label: "Browse services", to: "/services" } : { label: "See open requests", to: "/services/requests" }}
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
    </Layout>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground hover:border-navy"}`}>{children}</button>
  );
}
