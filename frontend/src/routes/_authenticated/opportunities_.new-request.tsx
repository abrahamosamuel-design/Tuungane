import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ImagePlus, UserCircle, Briefcase, MapPin, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { uploadMedia } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/opportunities_/new-request")({
  head: () => ({ meta: [{ title: "Post Job Request — Tuungane" }] }),
  component: NewJobRequestPage,
});

function NewJobRequestPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  const [formData, setFormData] = useState({
    job_title: "",
    experience_years: "",
    location: "",
    resume_summary: "",
    full_name: "",
    age: "",
    gender: "",
    address: "",
    contact_info: "",
    academic_qualifications: "",
    working_experience: "",
    skills: "",
    hobbies: "",
    referees: ""
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.job_title || !formData.resume_summary || !formData.location || !formData.full_name || !formData.age || !formData.gender || !formData.address || !formData.contact_info || !formData.academic_qualifications) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    let cover_image_url = "";

    try {
      if (file) {
        toast.info("Uploading profile picture...", { id: "upload" });
        const url = await uploadMedia(user?.id || "me", file, "post_media");
        if (url) {
          cover_image_url = url;
          toast.success("Picture uploaded successfully", { id: "upload" });
        }
      }

      await apiClient("/opportunities/job-requests", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          cover_image_url,
        }),
      });

      toast.success("Job request posted successfully!");
      nav({ to: "/opportunities" });
    } catch (err: any) {
      toast.error(err.message || "Failed to post job request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-8 sm:px-12 py-6 pb-24">
      <Link to="/opportunities" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      
      <div className="pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Looking for a Job?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Post a job request to let employers know you're open to opportunities.
          </p>
        </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Profile Picture Upload */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-navy">Profile Picture (Optional)</label>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., John Doe"
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.full_name}
              onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="e.g., 28"
                className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                value={formData.age}
                onChange={(e) => setFormData(p => ({ ...p, age: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all focus:border-orange focus:ring-1 focus:ring-orange"
                value={formData.gender}
                onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
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
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Current Address / Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                placeholder="e.g., Kampala, Uganda"
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
                value={formData.address}
                onChange={(e) => {
                  setFormData(p => ({ ...p, address: e.target.value, location: e.target.value }))
                }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Contact Number / Email <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., +256 700 000000"
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.contact_info}
              onChange={(e) => setFormData(p => ({ ...p, contact_info: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy">
            Desired Job Title <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              required
              placeholder="e.g., Senior Plumber, React Developer"
              className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.job_title}
              onChange={(e) => setFormData(p => ({ ...p, job_title: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy">
            Academic Qualifications <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="e.g., BSc in Computer Science, Makerere University"
            className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
            value={formData.academic_qualifications}
            onChange={(e) => setFormData(p => ({ ...p, academic_qualifications: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Working Experience
            </label>
            <textarea
              rows={3}
              placeholder="List your previous jobs and responsibilities..."
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.working_experience}
              onChange={(e) => setFormData(p => ({ ...p, working_experience: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Key Skills
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Plumbing, Pipe fitting, Customer service..."
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.skills}
              onChange={(e) => setFormData(p => ({ ...p, skills: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Hobbies & Interests
            </label>
            <input
              type="text"
              placeholder="e.g., Reading, Travelling"
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.hobbies}
              onChange={(e) => setFormData(p => ({ ...p, hobbies: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Years of Experience
            </label>
            <input
              type="text"
              placeholder="e.g., 5 years"
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.experience_years}
              onChange={(e) => setFormData(p => ({ ...p, experience_years: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy">
            Referees
          </label>
          <textarea
            rows={2}
            placeholder="Names and contacts of references (optional)"
            className="w-full rounded-xl border border-border bg-background py-3 px-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
            value={formData.referees}
            onChange={(e) => setFormData(p => ({ ...p, referees: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy">
            Resume / Professional Summary <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
            <textarea
              required
              rows={4}
              placeholder="A brief bio summarizing your qualifications and what you are looking for..."
              className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-1 focus:ring-orange"
              value={formData.resume_summary}
              onChange={(e) => setFormData(p => ({ ...p, resume_summary: e.target.value }))}
            />
          </div>
        </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Post Job Request"}
          </button>
        </form>
      </div>
    </section>
  );
}
