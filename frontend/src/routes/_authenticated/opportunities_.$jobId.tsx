import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Loader2, MapPin, Building, Banknote, Calendar, CheckCircle, Phone, X, Send, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/opportunities_/$jobId")({
  head: () => ({ meta: [{ title: "Opportunity Details — Tuungane" }] }),
  staticData: { hideBottomNav: true },
  component: JobDetailsPage,
});

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3.5">
      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{label}</p>
      <div className="text-sm font-medium text-navy">{value}</div>
    </div>
  );
}

function JobDetailsPage() {
  const { jobId } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  
  // Hiring Modal State
  const [showHireModal, setShowHireModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient<{ data: any }>(`/opportunities/jobs/${jobId}`);
      setJob(data);
    } catch (err) {
      toast.error("Failed to load opportunity details");
      nav({ to: "/opportunities" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    // Simulate application process for now
    setTimeout(() => {
      setApplied(true);
      setApplying(false);
      toast.success("Application submitted successfully!");
    }, 1500);
  };

  const submitHireRequest = async () => {
    if (!initialMessage.trim()) return;
    setApplying(true);
    try {
      const res = await apiClient<{ data: string }>(`/messages/hire-contact`, {
        method: 'POST',
        body: JSON.stringify({
          _provider_id: job.provider_user_id,
          initial_message: initialMessage.trim()
        })
      });
      const convId = res.data;
      toast.success("Contact request sent!");
      setShowHireModal(false);
      nav({ to: `/messages/${convId}` });
    } catch (err) {
      toast.error("Failed to start chat. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </div>
    );
  }

  if (!job) return null;

  const isJobRequest = job.type === 'job_request';
  const isOwner = user?.id === job.provider_user_id;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <Link to="/opportunities" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>
      
      <div className="overflow-hidden">
        {job.media_urls && job.media_urls.length > 0 && (
          <div className="h-56 md:h-72 w-full bg-muted rounded-2xl md:rounded-3xl overflow-hidden mb-6">
            <img src={job.media_urls[0]} alt={job.job_title || job.title} className="h-full w-full object-cover" />
          </div>
        )}
        
        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-navy">{job.job_title || job.title}</h1>
              {job.company_name && (
                <p className="mt-2 flex items-center gap-2 text-lg font-medium text-muted-foreground">
                  <Building className="h-5 w-5" />
                  {job.company_name}
                </p>
              )}
            </div>
            
            {(!job.media_urls || job.media_urls.length === 0) && (
              <div className="hidden md:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange/10 text-orange">
                <Briefcase className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-border/50 py-5">
            {job.location && (
              <div className="flex items-center gap-3 text-sm font-medium text-navy">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p>{job.location}</p>
                </div>
              </div>
            )}
            
            {(job.salary || job.expectations || job.salary_expectation) && (
              <div className="flex items-center gap-3 text-sm font-medium text-navy">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 text-green">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isJobRequest ? 'Expectation' : 'Salary / Budget'}</p>
                  <p>{job.salary || job.expectations || job.salary_expectation}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-sm font-medium text-navy">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Posted Date</p>
                <p>{new Date(job.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Hiring Details */}
          {!isJobRequest && job.qualification && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold text-navy mb-4">Description & Qualifications</h2>
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
                {job.qualification}
              </div>
            </div>
          )}

          {/* Job Request Details */}
          {isJobRequest && (
            <div className="mt-8 space-y-8">
              <h2 className="font-display text-xl font-bold text-navy">Applicant Details</h2>
              
              <div className="grid grid-cols-2 gap-4">
                {job.full_name && <DetailItem label="Full Name" value={job.full_name} />}
                {job.age && <DetailItem label="Age" value={`${job.age} years`} />}
                {job.gender && <DetailItem label="Gender" value={job.gender} />}
                {job.experience_years && <DetailItem label="Experience" value={`${job.experience_years} Years`} />}
                
                {job.contact_info && (
                  <div className="rounded-xl bg-muted/30 p-3.5 flex items-center justify-between col-span-2 sm:col-span-1">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Contact</p>
                      <div className="text-sm font-medium text-navy">{job.contact_info}</div>
                    </div>
                    <a href={`tel:${job.contact_info}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green/10 text-green hover:bg-green/20 transition-colors">
                      <Phone className="h-5 w-5" />
                    </a>
                  </div>
                )}
                
                {job.address && <DetailItem label="Address" value={job.address} />}
              </div>

              {job.resume_summary && (
                <div>
                  <h3 className="font-bold text-navy mb-2 text-lg">Professional Summary</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.resume_summary}</p>
                </div>
              )}
              
              {job.skills && (
                <div>
                  <h3 className="font-bold text-navy mb-2 text-lg">Skills</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.skills}</p>
                </div>
              )}

              {job.academic_qualifications && (
                <div>
                  <h3 className="font-bold text-navy mb-2 text-lg">Academic Qualifications</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.academic_qualifications}</p>
                </div>
              )}

              {job.working_experience && (
                <div>
                  <h3 className="font-bold text-navy mb-2 text-lg">Working Experience</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.working_experience}</p>
                </div>
              )}
              
              {job.hobbies && (
                <div>
                  <h3 className="font-bold text-navy mb-2 text-lg">Hobbies</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.hobbies}</p>
                </div>
              )}

              {job.referees && (
                <div>
                  <h3 className="font-bold text-navy mb-2 text-lg">Referees</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.referees}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-10">
            {isOwner ? (
              <button
                onClick={() => toast.info("Edit functionality coming soon!")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-4 font-bold text-[15px] text-navy transition-transform hover:scale-[1.02] active:scale-95 shadow-sm border border-border"
              >
                <Pencil className="h-4 w-4" />
                {isJobRequest ? 'Edit Request' : 'Edit Job'}
              </button>
            ) : isJobRequest ? (
               <button
                 onClick={() => setShowHireModal(true)}
                 className="flex w-full items-center justify-center rounded-2xl bg-navy px-4 py-4 font-bold text-[15px] text-white transition-transform hover:scale-[1.02] active:scale-95 shadow-sm"
               >
                 Hire this Professional
               </button>
            ) : applied ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-full bg-green/10 px-4 py-4 font-semibold text-green">
                <CheckCircle className="h-5 w-5" />
                Application Submitted Successfully
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex w-full items-center justify-center rounded-2xl bg-navy px-4 py-4 font-bold text-[15px] text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-70 shadow-sm"
              >
                {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Apply for this Job"}
              </button>
            )}
            
            {!isOwner && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {isJobRequest ? 'Send an initial message to start a direct hiring conversation.' : 'By applying, your profile details will be shared with the employer.'}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Hire Professional Modal */}
      {showHireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy">Hire Professional</h2>
              <button onClick={() => setShowHireModal(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="mb-4 text-sm text-muted-foreground">
              Send an initial message to start a direct chat with {job.full_name || "this professional"}. They will be notified immediately.
            </p>
            
            <textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Hi! I am interested in hiring you based on your Tuungane profile..."
              className="w-full rounded-2xl border border-border bg-muted/30 p-4 text-[15px] outline-none focus:border-navy focus:bg-background min-h-[120px] resize-none mb-6 transition-colors"
            />
            
            <button
              onClick={submitHireRequest}
              disabled={applying || !initialMessage.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy px-4 py-4 font-bold text-[15px] text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-70 shadow-sm"
            >
              {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <Send className="h-4 w-4" /> Send Request
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
