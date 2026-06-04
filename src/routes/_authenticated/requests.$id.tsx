import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, MessageCircle, Loader2, Star, CheckCircle2, Copy, Send } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/social/Avatar";
import { StatusTracker } from "@/components/StatusTracker";
import { ProviderResponseDialog } from "@/components/ProviderResponseDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { requestStatusMap, trustScoreLabel, type ProviderResponseRow, type ServiceRequestRow, type TrustStatsRow } from "@/data/serviceRequestTypes";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { SafetyNote, SAFETY_TIPS } from "@/components/SafetyNote";
import { MobileActionBar } from "@/components/MobileActionBar";
import { ContactOptionsUnlocked } from "@/components/ContactOptionsUnlocked";


import { RouteErrorCard, RouteNotFoundCard } from "@/lib/route-boundaries";

export const Route = createFileRoute("/_authenticated/requests/$id")({
  head: () => ({ meta: [{ title: "Service request — Tuungane" }] }),
  component: RequestDetailsPage,
  errorComponent: ({ error, reset }) => <RouteErrorCard error={error} reset={reset} title="Couldn't load this request" />,
  notFoundComponent: () => <RouteNotFoundCard title="Request not found" message="This service request may have been removed." homeHref="/requests" homeLabel="My requests" />,
});

type Profile = { id: string; full_name: string; avatar_url: string | null };
type ResponseWithProvider = ProviderResponseRow & { provider?: Profile; stats?: TrustStatsRow };

function RequestDetailsPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [req, setReq] = useState<ServiceRequestRow | null>(null);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [responses, setResponses] = useState<ResponseWithProvider[]>([]);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [providerContact, setProviderContact] = useState<{ phone: string | null; whatsapp: string | null; email: string | null; name: string | null } | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completionInput, setCompletionInput] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: `/requests/${id}` } as never });
  }, [loading, user, nav, id]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: r, error } = await supabase.from("service_requests").select("*").eq("id", id).maybeSingle();
    if (error || !r) {
      toast.error("Request not found or you don't have access");
      return;
    }
    const sr = r as ServiceRequestRow;
    setReq(sr);
    const { data: c } = await supabase.from("profiles").select("id,full_name,avatar_url").eq("id", sr.customer_id).maybeSingle();
    setCustomer(c as Profile);
    const { data: rsps } = await supabase.from("provider_responses").select("*").eq("request_id", id).order("created_at", { ascending: false });
    const list = (rsps ?? []) as ProviderResponseRow[];
    const provIds = Array.from(new Set(list.map((x) => x.provider_id)));
    const [{ data: provs }, { data: stats }] = await Promise.all([
      provIds.length ? supabase.from("profiles").select("id,full_name,avatar_url").in("id", provIds) : Promise.resolve({ data: [] as Profile[] } as any),
      provIds.length ? supabase.from("provider_trust_stats").select("*").in("provider_id", provIds) : Promise.resolve({ data: [] as TrustStatsRow[] } as any),
    ]);
    const pmap = new Map<string, Profile>((provs ?? []).map((p: Profile) => [p.id, p]));
    const smap = new Map<string, TrustStatsRow>(((stats ?? []) as TrustStatsRow[]).map((s) => [s.provider_id, s]));
    setResponses(list.map((x): ResponseWithProvider => ({ ...x, provider: pmap.get(x.provider_id), stats: smap.get(x.provider_id) })));
    const { count } = await supabase.from("service_feedback").select("id", { count: "exact", head: true }).eq("service_request_id", id);
    setHasFeedback((count ?? 0) > 0);

    // Fetch contact info of the assigned provider (or original provider for direct requests)
    const assigned = sr.selected_provider_id ?? sr.provider_id;
    if (assigned) {
      const { data: sp } = await supabase.from("service_profiles").select("phone,whatsapp,email,business_name").eq("user_id", assigned).maybeSingle();
      const { data: pp } = await supabase.from("profiles").select("full_name").eq("id", assigned).maybeSingle();
      setProviderContact({
        phone: sp?.phone ?? null,
        whatsapp: sp?.whatsapp ?? null,
        email: sp?.email ?? null,
        name: sp?.business_name || pp?.full_name || null,
      });
    } else {
      setProviderContact(null);
    }
  }, [id, user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user || !req) {
    return <Layout><div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div></Layout>;
  }

  const isCustomer = user.id === req.customer_id;
  const isAssignedProvider = req.selected_provider_id === user.id;
  const myResponse = responses.find((r) => r.provider_id === user.id);
  const canRespond = !isCustomer && req.status === "requested" && !myResponse;

  const chooseProvider = async (resp: ResponseWithProvider) => {
    if (!isCustomer) return;
    if (!confirm(`Choose ${resp.provider?.full_name} as your provider? Other responses will be declined.`)) return;
    setBusy(true);
    const { error } = await supabase.from("provider_responses").update({ status: "chosen" }).eq("id", resp.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Provider selected. A completion code was generated for the job.");
    load();
  };

  const declineResponse = async (resp: ResponseWithProvider) => {
    setBusy(true);
    const { error } = await supabase.from("provider_responses").update({ status: "declined" }).eq("id", resp.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    load();
  };

  const updateStatus = async (status: ServiceRequestRow["status"]) => {
    setBusy(true);
    const { error } = await supabase.from("service_requests").update({ status }).eq("id", req.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status.replace("_", " ")}`);
    load();
  };

  const useCompletionCode = async () => {
    if (!isAssignedProvider) return;
    const code = completionInput.trim().toUpperCase();
    if (!code) return toast.error("Enter the completion code");
    if (code !== (req.completion_code ?? "").toUpperCase()) return toast.error("Code does not match. Ask the customer for the correct code.");
    setBusy(true);
    await supabase.from("service_requests").update({ provider_confirmed_completion: true }).eq("id", req.id);
    if (req.customer_confirmed_completion) {
      await supabase.from("service_requests").update({ status: "completed" }).eq("id", req.id);
    }
    setBusy(false);
    toast.success("Code accepted. Waiting for customer confirmation.");
    load();
  };

  const customerConfirmCompletion = async () => {
    if (!isCustomer) return;
    setBusy(true);
    await supabase.from("service_requests").update({ customer_confirmed_completion: true, status: "completed" }).eq("id", req.id);
    setBusy(false);
    toast.success("Completion confirmed. Please leave a verified review.");
    load();
    setFeedbackOpen(true);
  };

  const openDispute = async () => {
    const reason = window.prompt("Briefly describe the issue:");
    if (!reason) return;
    const against = user.id === req.customer_id ? (req.selected_provider_id ?? req.provider_id) : req.customer_id;
    if (!against) return toast.error("Cannot open dispute on an open request");
    await supabase.from("service_disputes").insert({
      service_request_id: req.id, raised_by_user_id: user.id, against_user_id: against,
      reason: reason.slice(0, 100), description: reason.slice(0, 1000),
    });
    await supabase.from("service_requests").update({ status: "disputed" }).eq("id", req.id);
    toast.success("Dispute opened. Tuungane will review.");
    load();
  };

  const copyCode = () => {
    if (!req.completion_code) return;
    navigator.clipboard.writeText(req.completion_code);
    toast.success("Code copied");
  };

  const meta = requestStatusMap[req.status];
  const visibleResponses = responses.filter((r) => r.status !== "withdrawn");

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/requests" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange"><ArrowLeft className="h-3 w-3" /> Back to my requests</Link>

        <div className="mt-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</span>
            <span className="text-[10px] text-muted-foreground">{timeAgo(req.created_at)}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{visibleResponses.length} {visibleResponses.length === 1 ? "response" : "responses"}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-navy">{req.title || req.service_needed}</h1>
          {req.subcategory && <p className="text-sm text-muted-foreground">{req.subcategory}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.location}{req.town && `, ${req.town}`}</span>
            {req.budget_range && <span>Budget: {req.budget_range}</span>}
            {req.preferred_date && <span>Preferred: {req.preferred_date}{req.preferred_time && ` ${req.preferred_time}`}</span>}
            <span>Urgency: {req.urgency}</span>
          </div>
          {req.description && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/85">{req.description}</p>}
          {req.attachment_url && <img src={req.attachment_url} alt="" className="mt-3 max-h-56 rounded-lg border border-border" />}

          <div className="mt-4 border-t border-border pt-3">
            <StatusTracker status={req.status} hasFeedback={hasFeedback} />
          </div>
        </div>

        <div className="mt-3"><SafetyNote>{SAFETY_TIPS.request}</SafetyNote></div>

        {/* Unlocked contact options — only for the customer, only after a provider is associated */}
        {isCustomer && providerContact && (providerContact.phone || providerContact.whatsapp || providerContact.email) && (
          (req.selected_provider_id || (req.provider_id && req.status !== "requested")) && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-navy">
                Contact {providerContact.name ?? "the provider"} <span className="font-normal text-muted-foreground">— your request is now tracked by Tuungane.</span>
              </p>
              <ContactOptionsUnlocked
                customerId={user.id}
                providerId={(req.selected_provider_id ?? req.provider_id) as string}
                serviceRequestId={req.id}
                phone={providerContact.phone}
                whatsapp={providerContact.whatsapp}
                email={providerContact.email}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">After the service is completed, you'll be able to give verified feedback.</p>
            </div>
          )
        )}

        {/* Provider-side safety note */}
        {!isCustomer && (
          <div className="mt-3 rounded-2xl border border-border bg-surface p-3 text-xs text-foreground/80">
            This customer contacted you through Tuungane. Please communicate clearly, agree on service details, and update the request status so feedback can be collected after completion.
          </div>
        )}

        {/* Customer view: comparison list */}
        {isCustomer && req.status === "requested" && (
          <div className="mt-6">
            <h2 className="font-display text-lg font-bold text-navy">Compare provider responses</h2>
            {visibleResponses.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Your request is live. Matching providers will be able to respond soon.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {visibleResponses.map((r) => (
                  <ResponseCard key={r.id} r={r} busy={busy} onChoose={() => chooseProvider(r)} onDecline={() => declineResponse(r)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Provider view: own response */}
        {!isCustomer && req.status === "requested" && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            {myResponse ? (
              <>
                <h3 className="font-display text-sm font-bold text-navy">Your response</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">{myResponse.message}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {myResponse.quote_amount != null && <span>Quote: UGX {Number(myResponse.quote_amount).toLocaleString()}</span>}
                  {myResponse.estimated_time && <span>ETA: {myResponse.estimated_time}</span>}
                  {myResponse.availability_note && <span>{myResponse.availability_note}</span>}
                  <span className="rounded-full bg-muted px-2 py-0.5">{myResponse.status}</span>
                </div>
                <button onClick={() => setResponseDialogOpen(true)} className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">Edit response</button>
              </>
            ) : canRespond ? (
              <button onClick={() => setResponseDialogOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground"><Send className="h-4 w-4" /> Respond to this request</button>
            ) : null}
          </div>
        )}

        {/* Job tracking section — accepted+ */}
        {(req.status === "accepted" || req.status === "in_progress" || req.status === "completed") && (isCustomer || isAssignedProvider) && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold text-navy">Job tracking</h2>
            <p className="mt-1 text-xs text-muted-foreground">Use the completion code to mark this job as completed. Share it with the provider <strong>only after the service is done</strong>.</p>

            {req.completion_code && (
              <div className="mt-3 rounded-xl border border-orange/40 bg-orange/5 p-3">
                {isCustomer ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completion code</p>
                      <p className="font-display text-2xl font-bold tracking-widest text-navy">{req.completion_code}</p>
                    </div>
                    <button onClick={copyCode} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange"><Copy className="h-3 w-3" /> Copy</button>
                  </div>
                ) : isAssignedProvider ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={completionInput} onChange={(e) => setCompletionInput(e.target.value)} placeholder="Enter completion code" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase" />
                    <button onClick={useCompletionCode} disabled={busy} className="inline-flex items-center gap-1 rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground"><CheckCircle2 className="h-3 w-3" /> Confirm</button>
                  </div>
                ) : null}
                {(req.provider_confirmed_completion || req.customer_confirmed_completion) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {req.provider_confirmed_completion ? "✓ Provider confirmed" : "○ Provider pending"} · {req.customer_confirmed_completion ? "✓ Customer confirmed" : "○ Customer pending"}
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {isAssignedProvider && req.status === "accepted" && <Btn onClick={() => updateStatus("in_progress")} variant="primary">Mark in progress</Btn>}
              {isCustomer && req.status === "in_progress" && !req.customer_confirmed_completion && <Btn onClick={customerConfirmCompletion} variant="primary">Confirm completion</Btn>}
              {isCustomer && req.status === "completed" && !hasFeedback && <Btn onClick={() => setFeedbackOpen(true)} variant="primary">Leave verified review</Btn>}
              {(req.status === "accepted" || req.status === "in_progress") && <Btn onClick={() => updateStatus("cancelled")}>Cancel</Btn>}
              <Btn onClick={openDispute} variant="danger">Open dispute</Btn>
            </div>
          </div>
        )}

        {/* Customer side after selection — list shows only chosen + declined for transparency */}
        {req.status !== "requested" && visibleResponses.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-lg font-bold text-navy">Responses</h2>
            <div className="mt-3 space-y-3">
              {visibleResponses.map((r) => (
                <ResponseCard key={r.id} r={r} busy={busy} showActions={false} />
              ))}
            </div>
          </div>
        )}

        <ProviderResponseDialog open={responseDialogOpen} onClose={() => setResponseDialogOpen(false)} requestId={req.id} existing={myResponse ?? null} onSaved={load} />
        <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} request={req} onSubmitted={() => { load(); setFeedbackOpen(false); }} />

        <div className="mt-6 mb-12 text-xs text-muted-foreground">
          <p>Customer: <span className="font-semibold text-navy">{customer?.full_name ?? "—"}</span></p>
        </div>
      </section>

      {(() => {
        // Choose the most relevant single primary CTA for mobile.
        if (!isCustomer && canRespond) {
          return (
            <MobileActionBar>
              <button onClick={() => setResponseDialogOpen(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange px-4 py-3 text-sm font-semibold text-orange-foreground"><Send className="h-4 w-4" /> Respond to request</button>
            </MobileActionBar>
          );
        }
        if (isCustomer && req.status === "in_progress" && !req.customer_confirmed_completion) {
          return (
            <MobileActionBar>
              <button onClick={customerConfirmCompletion} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange px-4 py-3 text-sm font-semibold text-orange-foreground"><CheckCircle2 className="h-4 w-4" /> Confirm completion</button>
            </MobileActionBar>
          );
        }
        if (isCustomer && req.status === "completed" && !hasFeedback) {
          return (
            <MobileActionBar>
              <button onClick={() => setFeedbackOpen(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange px-4 py-3 text-sm font-semibold text-orange-foreground"><Star className="h-4 w-4" /> Leave verified review</button>
            </MobileActionBar>
          );
        }
        return null;
      })()}
    </Layout>

  );
}

function ResponseCard({ r, busy, onChoose, onDecline, showActions = true }: { r: ResponseWithProvider; busy: boolean; onChoose?: () => void; onDecline?: () => void; showActions?: boolean }) {
  const label = r.stats ? trustScoreLabel(r.stats.trust_score) : null;
  return (
    <div className={`rounded-2xl border p-4 ${r.status === "chosen" ? "border-green/40 bg-green/5" : r.status === "declined" ? "border-border bg-muted/30 opacity-70" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        <Link to="/u/$id" params={{ id: r.provider_id }}>
          <Avatar name={r.provider?.full_name ?? "Provider"} url={r.provider?.avatar_url ?? null} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/u/$id" params={{ id: r.provider_id }} className="font-semibold text-navy hover:text-orange">{r.provider?.full_name ?? "Provider"}</Link>
            {label && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${label.color}`}>{label.label}</span>}
            {r.status === "chosen" && <span className="rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-bold uppercase text-green">Chosen</span>}
            {r.status === "declined" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Declined</span>}
          </div>
          {r.stats && (
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-orange text-orange" /> {Number(r.stats.average_rating).toFixed(1)} ({r.stats.total_verified_reviews})</span>
              <span>{r.stats.completed_service_requests} completed</span>
              <span>Trust: {r.stats.trust_score}/100</span>
            </div>
          )}
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{r.message}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {r.quote_amount != null && <span className="font-semibold text-navy">Quote: UGX {Number(r.quote_amount).toLocaleString()}</span>}
            {r.estimated_time && <span>ETA: {r.estimated_time}</span>}
            {r.availability_note && <span>{r.availability_note}</span>}
          </div>

          {showActions && r.status !== "chosen" && r.status !== "declined" && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {onChoose && <Btn onClick={onChoose} variant="primary">Choose provider</Btn>}
              <Link to="/u/$id" params={{ id: r.provider_id }} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-navy hover:border-orange">View profile</Link>
              {onDecline && <Btn onClick={onDecline}>Decline</Btn>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "danger" }) {
  const cls =
    variant === "primary"
      ? "bg-orange text-orange-foreground hover:brightness-110"
      : variant === "danger"
      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
      : "border border-border text-navy hover:border-orange";
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{children}</button>;
}
