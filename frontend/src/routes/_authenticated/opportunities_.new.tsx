import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { uploadMedia } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/opportunities_/new")({
  head: () => ({ meta: [{ title: "Post a Job Opportunity — Tuungane" }] }),
  component: NewJobOpportunityPage,
});

function NewJobOpportunityPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    job_title: "",
    company_name: "",
    location: "",
    qualification: "",
    salary: "",
    cover_image_url: "",
  });

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadMedia("me", file, "opportunities");
      if (url) {
        setFormData({ ...formData, cover_image_url: url });
        toast.success("Image uploaded!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.job_title || !formData.company_name || !formData.location) {
      return toast.error("Please fill in the required fields.");
    }

    setLoading(true);
    try {
      await apiClient("/opportunities/jobs", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      toast.success("Job opportunity posted successfully!");
      nav({ to: "/opportunities" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post job.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <Link to="/opportunities" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>
      
      <h1 className="font-display text-3xl font-bold text-navy">Post a Job Opportunity</h1>
      <p className="mt-1 text-sm text-muted-foreground">Share an open role with the Tuungane community.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-8">
        
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy">Job Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Senior Plumber, Fullstack Developer"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy">Company / Employer Name *</label>
          <input
            type="text"
            required
            placeholder="Name of your company or business"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy">Location *</label>
          <input
            type="text"
            required
            placeholder="e.g. Kampala, Gulu, Remote"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy">Salary / Budget Range</label>
          <input
            type="text"
            placeholder="e.g. UGX 500k - 800k / month"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy">Qualifications / Description</label>
          <textarea
            rows={4}
            placeholder="Briefly describe the role, requirements, and qualifications..."
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy"
            value={formData.qualification}
            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy">Cover Image (Optional)</label>
          <div className="flex flex-col gap-3">
            {formData.cover_image_url ? (
              <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border">
                <img src={formData.cover_image_url} alt="Cover" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, cover_image_url: "" })}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background transition-colors hover:border-navy">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Upload Image</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-full bg-navy px-4 py-3 font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Post Job Opportunity"}
          </button>
        </div>
      </form>
    </section>
  );
}
