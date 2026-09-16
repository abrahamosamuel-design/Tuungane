import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Briefcase, CheckCircle2, Loader2, Clock, ImagePlus, ArrowRight, X, Star, ShieldCheck } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/social/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { AddTimelinePostDialog } from "@/components/AddTimelinePostDialog";
import { SubmitReviewDialog } from "@/components/SubmitReviewDialog";
import { toast } from "sonner";
import { useMessagesContext } from "./messages";

export const Route = createFileRoute("/_authenticated/messages/")({
  component: MessagesIndex,
});

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
  price_total?: number;
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
  const { tab, setTab, isRoot } = useMessagesContext();

  // Booked jobs state
  const [jobs, setJobs] = useState<BookedJob[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Dialogs
  const [postDialog, setPostDialog] = useState<{ open: boolean; jobTitle: string; requestId: string }>({ open: false, jobTitle: "", requestId: "" });
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; providerId: string; providerName: string; providerAvatar: string | null; serviceTitle: string } | null>(null);

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
        
        listReqs = listReqs.map((j: any) => ({ ...j, is_direct_booking: false }));
        listDbs = listDbs.map((j: any) => ({ ...j, is_direct_booking: true }));

        let list = [...listReqs, ...listDbs];
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  if (tab === "messages") {
    // Desktop placeholder when no chat is selected
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full text-center p-8 bg-surface-container-lowest flex-1 h-[calc(100vh-64px)] lg:flex-1 lg:min-h-0">
        <div className="h-16 w-16 bg-surface-alt rounded-full flex items-center justify-center text-outline mb-4">
          <MessageSquare className="h-8 w-8 opacity-50" />
        </div>
        <h3 className="text-lg font-bold text-navy-dark">Select a conversation</h3>
        <p className="text-sm text-on-surface-variant max-w-sm mt-2">
          Choose an existing conversation from the list or start a new one from a service listing.
        </p>
      </div>
    );
  }

  // Booked Jobs tab
  const activeContracts = jobs.filter(j => j.status === "accepted" || j.status === "in_progress").length;
  const completedJobs = jobs.filter(j => j.status === "completed");
  const totalEscrow = completedJobs.reduce((sum, j) => sum + (Number(j.price_total) || 0), 0);
  const completedCount = completedJobs.length;

  return (
    <div className="w-full h-full lg:h-[calc(100vh-140px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

      {/* ─── INFO BANNER ─── */}
      <div className="mb-6 bg-orange/10 border border-orange/20 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
        <div className="p-2 bg-orange/10 rounded-xl text-orange shrink-0 mt-0.5">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm text-on-surface leading-relaxed">
          <strong className="font-semibold text-navy-dark">Booked Jobs Hub:</strong> All contracts here are backed by <span className="font-semibold text-orange">Tuungane SafeEscrow™</span>. Mark milestones complete to trigger verification, post visual updates directly to client timelines, or leave mutual verified reviews.
        </div>
      </div>

      {/* ─── SUMMARY METRICS BAR ─── */}
      <section className="space-y-4 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest border border-border-hairline rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center text-navy-dark shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-outline block">Active Contracts</span>
              <span className="text-2xl font-bold text-navy-dark">{activeContracts}</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest border border-border-hairline rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center text-green shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-outline block">Total Escrow Value</span>
              <span className="text-2xl font-bold text-navy-dark">KES {totalEscrow.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest border border-border-hairline rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center text-navy-dark shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-outline block">Completed Jobs</span>
              <span className="text-2xl font-bold text-navy-dark">{completedCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {!jobsLoaded && (
          <div className="col-span-full flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading booked jobs…
          </div>
        )}
        {jobsLoaded && jobs.length === 0 && (
          <div className="col-span-full py-4 w-full">
            <EmptyState
              icon={Briefcase}
              title="No booked jobs yet"
              description="When a service request is accepted or in progress, it will appear here."
              action={{ label: "Browse requests", to: "/requests/browse" }}
            />
          </div>
        )}
        {jobs.map((job) => {
          const isProvider = job.provider_id === user.id;
          const isCustomer = job.customer_id === user.id && !isProvider;
          const otherParty = isCustomer ? job.provider : job.customer;
          const roleLabel = isCustomer ? "Provider" : "Customer";

          return (
            <div key={job.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-orange/50 transition-colors flex flex-col shadow-sm">
              <div className="flex items-start gap-3 p-4 flex-1">
                <Avatar name={otherParty?.full_name ?? "User"} url={otherParty?.avatar_url ?? null} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-navy-dark">{job.title || job.service_needed}</p>
                    {statusBadge(job.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {roleLabel}: <span className="font-medium text-navy-dark">{otherParty?.full_name ?? "Unknown"}</span>
                  </p>
                  {(job.town || job.district) && (
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {[job.town, job.district].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-on-surface-variant line-clamp-2">{job.description}</p>
                  <p className="mt-1.5 text-[11px] text-outline">Updated {timeAgo(job.updated_at)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border-hairline bg-surface-container-lowest px-4 py-3">
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
                      className="flex items-center gap-1.5 rounded-xl bg-green px-4 py-2 text-xs font-semibold text-white hover:bg-green/90 transition-colors shadow-sm"
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
                        className="flex items-center gap-1.5 rounded-xl bg-red-100 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-200 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject Job
                      </button>
                    )}
                  </>
                )}
                
                {((!isCustomer && ["requested", "accepted", "in_progress"].includes(job.status)) ||
                  (isCustomer && ["requested", "accepted", "in_progress"].includes(job.status) && job.provider_id)) && (
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
                          setTab("messages");
                          navigate({ to: `/messages/${res.data}` });
                        }
                      } catch (err: any) {
                        console.error(err);
                        toast.error("Failed to start conversation: " + (err?.message || ""));
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-surface-alt px-4 py-2 text-xs font-semibold text-navy-dark hover:bg-surface-variant transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {isCustomer ? "Contact" : "Message"}
                  </button>
                )}

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
                    className="flex items-center gap-1.5 rounded-xl bg-orange px-4 py-2 text-xs font-semibold text-white hover:bg-orange/90 transition-colors shadow-sm"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Submit Review
                  </button>
                )}

                {!isCustomer && ["accepted", "in_progress"].includes(job.status) && (
                  <>
                    <button
                      onClick={() => handleMarkComplete(job)}
                      disabled={completing === job.id}
                      className="flex items-center gap-1.5 rounded-xl bg-green/10 px-4 py-2 text-xs font-semibold text-green hover:bg-green/20 transition-colors disabled:opacity-50"
                    >
                      {completing === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Mark Complete
                    </button>
                    <button
                      onClick={() => setPostDialog({ open: true, jobTitle: job.title || job.service_needed, requestId: job.id })}
                      className="flex items-center gap-1.5 rounded-xl bg-orange/10 px-4 py-2 text-xs font-semibold text-orange hover:bg-orange/20 transition-colors"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Add to Timeline
                    </button>
                  </>
                )}

                <Link
                  to={job.is_direct_booking ? "/direct-bookings/$id" : "/requests/$id"}
                  params={{ id: job.id }}
                  className="ml-auto flex items-center gap-1 text-xs font-medium text-outline hover:text-navy-dark transition-colors"
                >
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <AddTimelinePostDialog
        open={postDialog.open}
        onClose={() => setPostDialog({ open: false, jobTitle: "", requestId: "" })}
        jobTitle={postDialog.jobTitle}
        requestId={postDialog.requestId}
        onPosted={() => {
          toast.success("Your timeline post is live!");
        }}
      />
    </div>
  );
}
