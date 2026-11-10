import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";

export function ClaimProfileDialog({ serviceProfileUserId, open, onClose, onSubmitted }: { serviceProfileUserId: string; open: boolean; onClose: () => void; onSubmitted?: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    whatsapp_number: "",
    email: "",
    relationship_to_profile: "Owner of this business",
    explanation: "",
    supporting_file_url: "",
  });

  if (!open) return null;

  const upload = async (f: File | null) => {
    if (!f || !user) return;
    setBusy(true);
    try {
      const url = await uploadMedia(user.id, f, "claims");
      setForm((s) => ({ ...s, supporting_file_url: url }));
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!user) return toast.error("Sign in to claim a profile");
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.relationship_to_profile.trim()) {
      return toast.error("Name, phone and relationship are required");
    }
    try {
      await apiClient.post("/profiles/claim", {
        service_profile_user_id: serviceProfileUserId,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        whatsapp_number: form.whatsapp_number.trim() || null,
        email: form.email.trim() || null,
        relationship_to_profile: form.relationship_to_profile.trim(),
        explanation: form.explanation.trim(),
        supporting_file_url: form.supporting_file_url || null,
      });
      toast.success("Claim submitted. We'll review it shortly.");
      onSubmitted?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit claim request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-navy">Claim this profile</h2>
            <p className="mt-1 text-xs text-muted-foreground">This profile was added by Tuungane Official. Provide your details so we can verify and assign it to you.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 rounded-xl border border-orange/30 bg-orange/5 p-3 text-[11px] text-foreground/80">
          <p className="font-semibold text-navy">What admins look for</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>Your name and a phone we can call to verify</li>
            <li>Your relationship to the business or service</li>
            <li>Optional proof: ID, business card, trade licence, utility bill, social link</li>
          </ul>
        </div>
        <div className="mt-4 space-y-2">
          <Input label="Full name *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Input label="Phone number *" value={form.phone_number} onChange={(v) => setForm({ ...form, phone_number: v })} />
          
          <Input label="Email (optional)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div>
            <label className="text-xs font-medium text-navy">Relationship to the service/business *</label>
            <select value={form.relationship_to_profile} onChange={(e) => setForm({ ...form, relationship_to_profile: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option>Owner of this business</option>
              <option>Manager / Employee</option>
              <option>I am this service provider</option>
              <option>Family member (with permission)</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-navy">Proof or explanation</label>
            <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Briefly explain how this profile relates to you" />
          </div>
          <div>
            <label className="text-xs font-medium text-navy">Supporting document/photo (optional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => upload(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" />
            {form.supporting_file_url && <p className="mt-1 text-[10px] text-green">Uploaded ✓</p>}
          </div>
        </div>
        <button onClick={submit} disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit claim
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
