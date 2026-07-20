import { useState } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

type Kind = "service_profile" | "business_page";
type ReqType = "verified_provider" | "verified_business" | "verified_organization";

export function RequestVerificationDialog({
  open,
  onClose,
  profileKind,
  profileId,
  ownerUserId,
  defaultType,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  profileKind: Kind;
  profileId: string;
  ownerUserId: string;
  defaultType: ReqType;
  onSubmitted?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    contact_person: "",
    business_name: "",
    phone: "",
    location: "",
    experience_summary: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  if (!open) return null;

  const isIndividual = defaultType === "verified_provider";
  const isBusiness = defaultType === "verified_business";
  const isOrg = defaultType === "verified_organization";

  const submit = async () => {
    setBusy(true);
    try {
      const res = await apiClient.post("/trust/verify-request", {
        profile_kind: profileKind,
        profile_id: profileId,
        requested_type: defaultType,
        full_name: form.full_name || null,
        contact_person: form.contact_person || null,
        business_name: form.business_name || null,
        phone: form.phone || null,
        location: form.location || null,
        experience_summary: form.experience_summary || null,
      });
      const requestId = res.data.data.id;

      for (const f of files) {
        const path = `${ownerUserId}/${requestId}/${Date.now()}-${f.name}`;
        const up = await supabase.storage.from("verification-evidence").upload(path, f);
        if (up.error) {
          toast.error(`Upload failed: ${f.name}`);
          continue;
        }
        await apiClient.post("/trust/verify-evidence", {
          request_id: requestId,
          doc_type: f.type || "file",
          storage_path: path,
        });
      }
      toast.success("Verification request submitted");
      onSubmitted?.();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold text-navy">Request verification</h2>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-navy">Close</button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Submit accurate information so our team can verify your profile. Documents are optional but speed up the review.
        </p>

        <div className="space-y-3">
          {isIndividual && (
            <>
              <Input label="Full name" v={form.full_name} on={(v) => setForm({ ...form, full_name: v })} />
              <Input label="Phone number" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
              <Input label="Location served" v={form.location} on={(v) => setForm({ ...form, location: v })} />
              <Textarea label="Short summary of your service experience" v={form.experience_summary} on={(v) => setForm({ ...form, experience_summary: v })} />
            </>
          )}
          {isBusiness && (
            <>
              <Input label="Business name" v={form.business_name} on={(v) => setForm({ ...form, business_name: v })} />
              <Input label="Owner / manager name" v={form.contact_person} on={(v) => setForm({ ...form, contact_person: v })} />
              <Input label="Phone number" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
              <Input label="Business location" v={form.location} on={(v) => setForm({ ...form, location: v })} />
              <Textarea label="Service activity notes" v={form.experience_summary} on={(v) => setForm({ ...form, experience_summary: v })} />
            </>
          )}
          {isOrg && (
            <>
              <Input label="Organization name" v={form.business_name} on={(v) => setForm({ ...form, business_name: v })} />
              <Input label="Contact person" v={form.contact_person} on={(v) => setForm({ ...form, contact_person: v })} />
              <Input label="Phone number" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
              <Input label="Location" v={form.location} on={(v) => setForm({ ...form, location: v })} />
              <Textarea label="About the organization" v={form.experience_summary} on={(v) => setForm({ ...form, experience_summary: v })} />
            </>
          )}

          <div>
            <label className="text-xs font-medium text-navy">Supporting documents (optional)</label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-1 block w-full text-xs"
            />
            {files.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">{files.length} file(s) selected</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-md bg-orange px-4 py-1.5 text-xs font-semibold text-orange-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
function Textarea({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <textarea value={v} onChange={(e) => on(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
