import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { useCategories } from "@/hooks/use-categories";
import { officialPostTypes, type OfficialPostTypeValue, type OfficialPostRow } from "@/data/officialPostTypes";

export function OfficialPostForm({ accountId, editing, onSaved }: { accountId: string; editing?: OfficialPostRow | null; onSaved: () => void }) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [form, setForm] = useState({
    post_type: (editing?.post_type ?? "announcement") as OfficialPostTypeValue,
    title: editing?.title ?? "",
    content: editing?.content ?? "",
    category_slug: editing?.category_slug ?? "",
    subcategory: editing?.subcategory ?? "",
    location: editing?.location ?? "",
    image_url: editing?.image_url ?? "",
    linked_provider_id: editing?.linked_provider_id ?? "",
    linked_opportunity_id: editing?.linked_opportunity_id ?? "",
    contact_info: editing?.contact_info ?? "",
    safety_note: editing?.safety_note ?? "",
    source_verified: editing?.source_verified ?? false,
    is_featured: editing?.is_featured ?? false,
    is_pinned: editing?.is_pinned ?? false,
    is_homepage: editing?.is_homepage ?? false,
    status: editing?.status ?? "published",
    expires_at: editing?.expires_at ? editing.expires_at.slice(0, 10) : "",
  });
  const [busy, setBusy] = useState(false);
  const cat = categories.find((c) => c.slug === form.category_slug);

  const upload = async (f: File | null) => {
    if (!f || !user) return;
    setBusy(true);
    try {
      const url = await uploadMedia(user.id, f, "official-posts");
      setForm((s) => ({ ...s, image_url: url }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    setBusy(true);
    const payload = {
      official_account_id: accountId,
      post_type: form.post_type,
      title: form.title.trim(),
      content: form.content.trim(),
      category_slug: form.category_slug || null,
      subcategory: form.subcategory || null,
      location: form.location || null,
      image_url: form.image_url || null,
      linked_provider_id: form.linked_provider_id || null,
      linked_opportunity_id: form.linked_opportunity_id || null,
      contact_info: form.contact_info || null,
      safety_note: form.safety_note || null,
      source_verified: form.source_verified,
      is_featured: form.is_featured,
      is_pinned: form.is_pinned,
      is_homepage: form.is_homepage,
      status: form.status,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const { error } = editing
      ? await supabase.from("official_posts").update(payload).eq("id", editing.id)
      : await supabase.from("official_posts").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Posted");
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold text-navy">{editing ? "Edit official post" : "Create official post"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Post type">
          <select value={form.post_type} onChange={(e) => setForm({ ...form, post_type: e.target.value as OfficialPostTypeValue })} className={input}>
            {officialPostTypes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </F>
        <F label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}>
            <option value="published">Published</option><option value="draft">Draft</option>
          </select>
        </F>
      </div>
      <F label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} /></F>
      <F label="Content"><textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={input} /></F>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Service category">
          <select value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value, subcategory: "" })} className={input}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </F>
        <F label="Subcategory">
          {cat ? (
            <select value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className={input}>
              <option value="">—</option>
              {cat.subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className={input} disabled />
          )}
        </F>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={input} /></F>
        <F label="Expires at"><input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={input} /></F>
      </div>
      <F label="Image / flyer">
        {form.image_url && <img src={form.image_url} alt="" className="mb-2 max-h-32 rounded-lg border border-border" />}
        <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0] ?? null)} className="text-xs" />
      </F>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Linked provider user ID"><input placeholder="uuid (optional)" value={form.linked_provider_id} onChange={(e) => setForm({ ...form, linked_provider_id: e.target.value })} className={input} /></F>
        <F label="Linked request ID"><input placeholder="uuid (optional)" value={form.linked_opportunity_id} onChange={(e) => setForm({ ...form, linked_opportunity_id: e.target.value })} className={input} /></F>
      </div>
      <F label="Contact info"><input placeholder="e.g. +256 700 000 000" value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} className={input} /></F>
      <F label="Safety note (optional)"><textarea rows={2} value={form.safety_note} onChange={(e) => setForm({ ...form, safety_note: e.target.value })} className={input} /></F>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pinned</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_homepage} onChange={(e) => setForm({ ...form, is_homepage: e.target.checked })} /> Show on homepage</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.source_verified} onChange={(e) => setForm({ ...form, source_verified: e.target.checked })} /> Source verified</label>
      </div>
      <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save" : "Publish post"}
      </button>
    </div>
  );
}

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-semibold text-navy">{label}</label>{children}</div>;
}
