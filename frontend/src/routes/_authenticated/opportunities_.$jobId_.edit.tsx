import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, UserCircle, Briefcase, MapPin, FileText, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { uploadMedia } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/opportunities_/$jobId_/edit")({
  head: () => ({ meta: [{ title: "Edit Job — Tuungane" }] }),
  staticData: { hideBottomNav: true },
  component: EditJobPage,
});

function EditJobPage() {
  const { jobId } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobType, setJobType] = useState<"job_opportunity" | "job_request" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const { data } = await apiClient<{ data: any }>(`/opportunities/jobs/${jobId}`);
      if (data.provider_user_id !== user?.id) {
        toast.error("You don't have permission to edit this post.");
        nav({ to: `/opportunities/${jobId}` });
        return;
      }
      setJobType(data.type);
      setFormData(data);
      if (data.media_urls && data.media_urls.length > 0) {
        setPreviewUrl(data.media_urls[0]);
      }
    } catch (err) {
      toast.error("Failed to load details for editing");
      nav({ to: "/opportunities" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const removeImage = () => {
    setFile(null);
    setPreviewUrl("");
    setFormData((prev: any) => ({ ...prev, cover_image_url: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let cover_image_url = formData.cover_image_url || (previewUrl && !file ? previewUrl : "");

    try {
      if (file) {
        toast.info("Uploading image...", { id: "upload" });
        const url = await uploadMedia(user?.id || "me", file, "post_media");
        if (url) {
          cover_image_url = url;
          toast.success("Image uploaded successfully", { id: "upload" });
        }
      }

      if (jobType === "job_opportunity") {
        await apiClient(`/opportunities/jobs/${jobId}`, {
          method: "PUT",
          body: JSON.stringify({ ...formData, cover_image_url }),
        });
      } else {
        await apiClient(`/opportunities/job-requests/${jobId}`, {
          method: "PUT",
          body: JSON.stringify({ ...formData, cover_image_url }),
        });
      }

      toast.success("Updated successfully!");
      nav({ to: `/opportunities/${jobId}` });
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </div>
    );
  }

  if (!jobType) return null;

  return (
    <section className="mx-auto max-w-2xl px-4 sm:px-12 py-6 pb-24">
      <Link to="/opportunities/$jobId" params={{ jobId }} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to details
      </Link>
      
      <div className="pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            {jobType === "job_opportunity" ? "Edit Job Opportunity" : "Edit Job Request"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {jobType === "job_request" ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy">Profile Picture</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted hover:border-orange transition-colors"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-10 w-10 text-muted-foreground group-hover:text-orange" />
                  )}
                  {!previewUrl && <span className="mt-2 text-xs font-medium text-muted-foreground group-hover:text-orange">Upload</span>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {previewUrl && (
                  <button type="button" onClick={removeImage} className="mt-2 text-sm text-red-500 hover:underline">
                    Remove Picture
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.full_name || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, full_name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy">Age *</label>
                    <input
                      type="number"
                      required
                      className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                      value={formData.age || ""}
                      onChange={(e) => setFormData((p: any) => ({ ...p, age: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy">Gender *</label>
                    <select
                      required
                      className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all focus:border-orange focus:ring-1 focus:ring-orange"
                      value={formData.gender || ""}
                      onChange={(e) => setFormData((p: any) => ({ ...p, gender: e.target.value }))}
                    >
                      <option value="" disabled>Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">Location *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                      value={formData.location || ""}
                      onChange={(e) => setFormData((p: any) => ({ ...p, address: e.target.value, location: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">Contact Number *</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.contact_info || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, contact_info: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">Desired Job Title *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.job_title || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, job_title: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">Academic Qualifications *</label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                  value={formData.academic_qualifications || ""}
                  onChange={(e) => setFormData((p: any) => ({ ...p, academic_qualifications: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">Working Experience</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.working_experience || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, working_experience: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">Key Skills</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.skills || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, skills: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">Hobbies</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.hobbies || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, hobbies: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">Years of Experience</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.experience_years || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, experience_years: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">Referees</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                  value={formData.referees || ""}
                  onChange={(e) => setFormData((p: any) => ({ ...p, referees: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">Resume / Summary *</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                  <textarea
                    required
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                    value={formData.resume_summary || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, resume_summary: e.target.value }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-navy">Job Title *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
                  value={formData.job_title || ""}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-navy">Company / Employer Name *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
                  value={formData.company_name || ""}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-navy">Location *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-navy">Salary / Budget Range</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
                  value={formData.salary || ""}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-navy">Qualifications / Description</label>
                <textarea
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
                  value={formData.qualification || ""}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-navy">Cover Image (Optional)</label>
                <div className="flex flex-col gap-3">
                  {previewUrl ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border">
                      <img src={previewUrl} alt="Cover" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background transition-colors hover:border-navy">
                      <>
                        <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Upload Image</span>
                      </>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    </label>
                  )}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
          </button>
        </form>
      </div>
    </section>
  );
}
