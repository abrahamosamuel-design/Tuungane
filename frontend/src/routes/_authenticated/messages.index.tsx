import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, ShieldCheck, Briefcase, CheckCircle2, Loader2, Clock, ImagePlus, ArrowRight, X, Star } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/social/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { AddTimelinePostDialog } from "@/components/AddTimelinePostDialog";
import { SubmitReviewDialog } from "@/components/SubmitReviewDialog";
import { MessageButton } from "@/components/MessageButton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — Tuungane" }] }),
  component: MessagesIndex,
});

type Tab = "messages" | "booked";

type Row = {
  id: string;
  service_request_id: string | null;
  customer_id: string;
  provider_id: string;
  status: string;
  last_message_at: string;
  last_message_preview: string | null;
  customer_unread_count: number;
  provider_unread_count: number;
};

type Profile = { id: string; full_name: string; avatar_url: string | null };
type Req = { id: string; service_needed: string; title: string | null };

type BookedJob = {
  id: string;
  customer_id: string;
  provider_id: string | null;
  service_needed: string;
  title: string | null;
  description: string;
  status: string;
  district: string | null;
  town: string | null;
  created_at: string;
  updated_at: string;
  customer?: { full_name: string; avatar_url: string | null };
  provider?: { full_name: string; avatar_url: string | null };
  has_feedback?: boolean;
  provider_confirmed_completion?: boolean;
  customer_confirmed_completion?: boolean;
  is_direct_booking?: boolean;
};

function MessagesIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("messages");

  // Messages state
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [requests, setRequests] = useState<Map<string, Req>>(new Map());
  const [msgLoaded, setMsgLoaded] = useState(false);

  // Booked jobs state
  const [jobs, setJobs] = useState<BookedJob[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Timeline post dialog
  const [postDialog, setPostDialog] = useState<{ open: boolean; jobTitle: string; requestId: string }>({ open: false, jobTitle: "", requestId: "" });
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; providerId: string; providerName: string; providerAvatar: string | null; serviceTitle: string } | null>(null);

  // Load Messages
  useEffect(() => {
    if (!user || tab !== "messages") return;
    let active = true;

    const load = async () => {
      try {
        const { data } = await apiClient<{ data: any[] }>("/messages");
        if (!active) return;

        let list = Array.isArray(data) ? data : (data?.data || []);

        setRows(list as Row[]);

        const pMap = new Map<string, Profile>();
        const rMap = new Map<string, Req>();

        for (const r of list) {
          if (r.otherProfile) {
            pMap.set(r.otherProfile.id, r.otherProfile);
          }
          if (r.request) {
            rMap.set(r.request.id, r.request);
          }
        }

        setProfiles(pMap);
        setRequests(rMap);
        setMsgLoaded(true);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [user?.id, tab]);

  // Load Booked Jobs
  useEffect(() => {
    if (!user || tab !== "booked") return;
    let active = true;

    const load = async () => {
      try {
        const [{ data: reqs }, { data: dbs }] = await Promise.all([
          apiClient.get<{ data: BookedJob[] }>("/requests/me", { params: { role: "all" } }),
          apiClient.get<{ data: BookedJob[] }>("/direct-bookings/me")
        ]);
        if (!active) return;
        let listReqs = (reqs as any)?.data || reqs || [];
        let listDbs = (dbs as any)?.data || dbs || [];
        
        // Add a flag to distinguish them
        listReqs = listReqs.map((j: any) => ({ ...j, is_direct_booking: false }));
        listDbs = listDbs.map((j: any) => ({ ...j, is_direct_booking: true }));

        let list = [...listReqs, ...listDbs];
        
        // Sort by created_at
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Filter to only requested, accepted, in_progress, or completed jobs
        list = list.filter((j: BookedJob) => ["requested", "accepted", "in_progress", "completed"].includes(j.status));
        setJobs(list);
        setJobsLoaded(true);
      } catch (err) {
        console.error("Failed to load booked jobs", err);
        setJobsLoaded(true);
      }
    };

    load();
    return () => { active = false; };
  }, [user?.id, tab]);

  const handleMarkComplete = async (job: BookedJob) => {
    setCompleting(job.id);
    try {
      if (job.is_direct_booking) {
        await apiClient.patch(`/direct-bookings/${job.id}`, { status: "completed" });
      } else {
        await apiClient.post(`/requests/${job.id}/confirm_completion`, {});
      }
      toast.success("Job marked as complete!");
      // Refresh list
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "completed" } : j).filter((j) => ["accepted", "in_progress", "completed"].includes(j.status)));
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as complete");
    } finally {
      setCompleting(null);
    }
  };

  if (!user) return null;

  const statusBadge = (status: string) => {
    if (status === "requested") return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-700"><Clock className="h-3 w-3" />Pending</span>;
    if (status === "in_progress") return <span className="inline-flex items-center gap-1 rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-semibold text-orange"><Clock className="h-3 w-3" />In Progress</span>;
    if (status === "accepted") return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700"><CheckCircle2 className="h-3 w-3" />Confirmed</span>;
    if (status === "completed") return <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2.5 py-0.5 text-[11px] font-semibold text-green"><CheckCircle2 className="h-3 w-3" />Completed</span>;
    return null;
  };

  return (
    <>
      {reviewDialog && (
        <SubmitReviewDialog
          open={reviewDialog.open}
          onOpenChange={(open) => {
            if (!open) setReviewDialog(null);
            else setReviewDialog({ ...reviewDialog, open });
          }}
          providerId={reviewDialog.providerId}
          providerName={reviewDialog.providerName}
          providerAvatar={reviewDialog.providerAvatar}
          serviceTitle={reviewDialog.serviceTitle}
        />
      )}
      <section className="mx-auto max-w-7xl w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pt-8 md:pb-8">
        {/* Toggle Pill */}
        <div className="flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1 w-fit">
          <button
            id="tab-messages"
            onClick={() => setTab("messages")}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              tab === "messages"
                ? "bg-white text-navy shadow-sm"
                : "text-muted-foreground hover:text-navy"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Messages
          </button>
          <button
            id="tab-booked"
            onClick={() => setTab("booked")}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              tab === "booked"
                ? "bg-white text-navy shadow-sm"
                : "text-muted-foreground hover:text-navy"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Booked Jobs
          </button>
        </div>
        </div>

        {/* ─── MESSAGES TAB ─── */}
        {tab === "messages" && (
          <>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-green/30 bg-green/5 p-3 text-xs sm:text-sm text-foreground/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
              <p>For safety, tracking, and verified reviews, keep communication on Tuungane. Tuungane Messages help protect both customers and providers.</p>
            </div>

            <div className="mt-5 space-y-2 w-full min-w-0">
              {!msgLoaded && <p className="text-sm text-muted-foreground">Loading…</p>}
              {msgLoaded && rows.length === 0 && (
                <div className="py-4 w-full min-w-0">
                  <EmptyState
                    icon={MessageSquare}
                    title="No conversations yet"
                    description="Message a provider from their profile or a service listing to start a conversation."
                    action={{ label: "Browse services", to: "/services" }}
                  />
                </div>
              )}
              {rows.map((r) => {
                const otherId = r.customer_id === user.id ? r.provider_id : r.customer_id;
                const other = profiles.get(otherId);
                const req = r.service_request_id ? requests.get(r.service_request_id) : null;
                const unread = r.customer_id === user.id ? r.customer_unread_count : r.provider_unread_count;
                return (
                  <Link key={r.id} to="/messages/$id" params={{ id: r.id }} className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-orange">
                    <Avatar name={other?.full_name ?? "User"} url={other?.avatar_url ?? null} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-navy">{other?.full_name ?? "User"}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.last_message_at)}</span>
                      </div>
                      {req && <p className="truncate text-[11px] text-muted-foreground">Re: {req.title ?? req.service_needed}</p>}
                      <p className="truncate text-sm text-foreground/75">{r.last_message_preview ?? "Start the conversation"}</p>
                    </div>
                    {unread > 0 && (
                      <span className="ml-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-orange px-2 text-xs font-bold text-orange-foreground">{unread}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* ─── BOOKED JOBS TAB ─── */}
        {tab === "booked" && (
          <>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs sm:text-sm text-foreground/80">
              <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              <p>These are your confirmed jobs — accepted or in progress. Mark them complete when the work is done, and add a timeline post to showcase your work.</p>
            </div>

            <div className="mt-5 space-y-3 w-full min-w-0">
              {!jobsLoaded && (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading booked jobs…
                </div>
              )}
              {jobsLoaded && jobs.length === 0 && (
                <div className="py-4 w-full min-w-0">
                  <EmptyState
                    icon={Briefcase}
                    title="No booked jobs yet"
                    description="When a service request is accepted or in progress, it will appear here."
                    action={{ label: "Browse requests", to: "/requests/browse" }}
                  />
                </div>
              )}
              {jobs.map((job) => {
                const isCustomer = job.customer_id === user.id;
                const otherParty = isCustomer ? job.provider : job.customer;
                const roleLabel = isCustomer ? "Provider" : "Customer";

                return (
                  <div key={job.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-orange/50 transition-colors">
                    {/* Card Header */}
                    <div className="flex items-start gap-3 p-4">
                      <Avatar name={otherParty?.full_name ?? "User"} url={otherParty?.avatar_url ?? null} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-navy">{job.title || job.service_needed}</p>
                          {statusBadge(job.status)}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {roleLabel}: <span className="font-medium text-foreground/80">{otherParty?.full_name ?? "Unknown"}</span>
                        </p>
                        {(job.town || job.district) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[job.town, job.district].filter(Boolean).join(", ")}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">Updated {timeAgo(job.updated_at)}</p>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/20 px-4 py-3">
                      {job.status === "requested" && !isCustomer && (
                        <>
                          <button
                            onClick={() => {
                              if (job.is_direct_booking) {
                                apiClient.patch(`/direct-bookings/${job.id}`, { status: "accepted" })
                                  .then(() => {
                                    toast.success("Job accepted!");
                                    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "accepted" } : j));
                                  }).catch(err => toast.error(err.message || "Failed to accept job"));
                              } else {
                                apiClient.post(`/requests/${job.id}/responses`, {
                                  message: "I can help you with this.",
                                  price_estimate: job.price_total || 0,
                                }).then(() => {
                                  toast.success("Job accepted!");
                                  setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "accepted" } : j));
                                }).catch(err => toast.error(err.message || "Failed to accept job"));
                              }
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-green px-4 py-2 text-xs font-semibold text-white hover:bg-green/90 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Accept Job
                          </button>
                          
                          {job.is_direct_booking && (
                            <button
                              onClick={() => {
                                apiClient.patch(`/direct-bookings/${job.id}`, { status: "declined" })
                                  .then(() => {
                                    toast.success("Job rejected.");
                                    setJobs(prev => prev.filter(j => j.id !== job.id));
                                  }).catch(err => toast.error(err.message || "Failed to reject job"));
                              }}
                              className="flex items-center gap-1.5 rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-200 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject Job
                            </button>
                          )}
                        </>
                      )}
                      
                      {/* Message/Contact Button */}
                      {((!isCustomer && ["requested", "accepted", "in_progress"].includes(job.status)) ||
                        (isCustomer && ["accepted", "in_progress"].includes(job.status) && job.provider_id)) && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await apiClient.post("/messages/start", {
                                _customer_id: job.customer_id,
                                _provider_id: isCustomer ? job.provider_id : user.id,
                                _service_request_id: job.is_direct_booking ? undefined : job.id,
                                _direct_booking_id: job.is_direct_booking ? job.id : undefined,
                                _initial_message_body: `Hello! I have a service request: ${job.service_needed}`,
                              });
                              if (res.data) {
                                navigate({ to: `/messages/${res.data}` });
                              }
                            } catch (err) {
                              toast.error("Failed to start conversation");
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-navy/10 px-4 py-2 text-xs font-semibold text-navy hover:bg-navy/20 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {isCustomer ? "Contact" : "Message"}
                        </button>
                      )}

                      {/* Customer Actions */}
                      {isCustomer && job.status === "completed" && (
                        <button
                          onClick={() => {
                            setReviewDialog({
                              open: true,
                              providerId: otherParty?.id || "",
                              providerName: otherParty?.full_name || "Provider",
                              providerAvatar: otherParty?.avatar_url || null,
                              serviceTitle: job.title || job.service_needed || "Service",
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-xs font-semibold text-white hover:bg-orange/90 transition-colors"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Submit Review
                        </button>
                      )}

                      {/* Provider Actions */}
                      {!isCustomer && ["accepted", "in_progress"].includes(job.status) && (
                        <>
                          <button
                            onClick={() => handleMarkComplete(job)}
                            disabled={completing === job.id}
                            className="flex items-center gap-1.5 rounded-full bg-green/10 px-4 py-2 text-xs font-semibold text-green hover:bg-green/20 transition-colors disabled:opacity-50"
                          >
                            {completing === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Mark Complete
                          </button>
                          <button
                            onClick={() => setPostDialog({ open: true, jobTitle: job.title || job.service_needed, requestId: job.id })}
                            className="flex items-center gap-1.5 rounded-full bg-orange/10 px-4 py-2 text-xs font-semibold text-orange hover:bg-orange/20 transition-colors"
                          >
                            <ImagePlus className="h-3.5 w-3.5" />
                            Add to Timeline
                          </button>
                        </>
                      )}

                      <Link
                        to="/requests/$id"
                        params={{ id: job.id }}
                        className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-navy transition-colors"
                      >
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Timeline Post Dialog */}
      <AddTimelinePostDialog
        open={postDialog.open}
        onClose={() => setPostDialog({ open: false, jobTitle: "", requestId: "" })}
        jobTitle={postDialog.jobTitle}
        requestId={postDialog.requestId}
        onPosted={() => {
          toast.success("Your timeline post is live!");
        }}
      />
    </>
  );
}
