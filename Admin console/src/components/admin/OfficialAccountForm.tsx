import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import type { OfficialAccountRow } from "@/data/officialPostTypes";

export function OfficialAccountForm({ account, onSaved }: { account: OfficialAccountRow | null; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "Tuungane Official",
    bio: "Tuungane Official shares trusted services, skills-based opportunities, featured providers, safety tips, and platform updates to help people connect, grow, and prosper together.",
    tagline: "Tuungane – Connect to Opportunity",
    profile_image_url: "",
    cover_image_url: "",
    is_official: true,
    is_verified: true,
    is_active: false,
    posting_enabled: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name,
        bio: account.bio,
        tagline: account.tagline,
        profile_image_url: account.profile_image_url ?? "",
        cover_image_url: account.cover_image_url ?? "",
        is_official: account.is_official,
        is_verified: account.is_verified,
        is_active: account.is_active,
        posting_enabled: account.posting_enabled,
      });
    }
  }, [account]);

  const upload = async (f: File | null, key: "profile_image_url" | "cover_image_url") => {
    if (!f || !user) return;
    setBusy(true);
    try {
      const url = await uploadMedia(user.id, f, "official");
      setForm((s) => ({ ...s, [key]: url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const payload = {
      ...form,
      profile_image_url: form.profile_image_url || null,
      cover_image_url: form.cover_image_url || null,
    };
    const { error } = account
      ? await supabase.from("official_accounts").update(payload).eq("id", account.id)
      : await supabase.from("official_accounts").insert({ ...payload, created_by_admin_id: user.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold text-navy">Official Account Setup</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Account name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></Field>
        <Field label="Tagline"><input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={input} /></Field>
      </div>
      <Field label="Bio"><textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={input} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Profile image">
          {form.profile_image_url && <img src={form.profile_image_url} alt="" className="mb-2 h-16 w-16 rounded-full border border-border object-cover" />}
          <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0] ?? null, "profile_image_url")} className="text-xs" />
        </Field>
        <Field label="Cover image">
          {form.cover_image_url && <img src={form.cover_image_url} alt="" className="mb-2 h-16 w-full rounded-lg border border-border object-cover" />}
          <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0] ?? null, "cover_image_url")} className="text-xs" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_official} onChange={(e) => setForm({ ...form, is_official: e.target.checked })} /> Official</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_verified} onChange={(e) => setForm({ ...form, is_verified: e.target.checked })} /> Verified</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.posting_enabled} onChange={(e) => setForm({ ...form, posting_enabled: e.target.checked })} /> Posting enabled</label>
      </div>
      <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {account ? "Save changes" : "Create official account"}
      </button>
    </div>
  );
}

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-semibold text-navy">{label}</label>{children}</div>;
}
