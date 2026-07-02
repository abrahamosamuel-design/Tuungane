import { useEffect, useState } from "react";
import { Image as ImageIcon, X, Loader2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { useCategories } from "@/hooks/use-categories";
import { postTypes, type PostTypeValue } from "@/data/postTypes";
import { toast } from "sonner";

export function PostComposer({ defaultCategory, defaultPostType, businessPageId, publicProfileId, onPosted }: { defaultCategory?: string | null; defaultPostType?: PostTypeValue; businessPageId?: string | null; publicProfileId?: string | null; onPosted?: () => void }) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [text, setText] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [location, setLocation] = useState("");
  const [postType, setPostType] = useState<PostTypeValue>(defaultPostType ?? "work_update");
  const [media, setMedia] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("service_profiles").select("suspended").eq("user_id", user.id).maybeSingle();
      setSuspended(!!data?.suspended);
    })();
  }, [user]);

  if (!user) return null;

  if (suspended) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <Ban className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Posting is disabled</p>
          <p className="text-xs opacity-90">Your service profile has been suspended by a moderator.</p>
        </div>
      </div>
    );
  }

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).slice(0, 4 - media.length).map((f) => uploadMedia(user.id, f, "posts")));
      setMedia((m) => [...m, ...urls].slice(0, 4));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!text.trim() && media.length === 0) { toast.error("Add some text or a photo"); return; }
    setBusy(true);
    const { error } = await supabase.from("timeline_posts").insert({
      provider_user_id: user.id,
      business_page_id: businessPageId ?? null,
      public_profile_id: publicProfileId ?? null,
      text: text.trim(),
      category_slug: category || null,
      location: location.trim() || null,
      media_urls: media,
      post_type: postType,
    });

    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setText(""); setMedia([]); setLocation("");
      toast.success("Posted to your timeline");
      onPosted?.();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Share your work, skill, service update, or opportunity..." className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange" />
      {media.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {media.map((u, i) => (
            <div key={i} className="relative">
              <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <button onClick={() => setMedia((m) => m.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={postType} onChange={(e) => setPostType(e.target.value as PostTypeValue)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium">
          {postTypes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
          <option value="">Category…</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-28 rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-orange" />
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-orange">
          <ImageIcon className="h-3.5 w-3.5" /> Photo
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} disabled={busy || media.length >= 4} />
        </label>
        <button onClick={submit} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-orange-foreground disabled:opacity-50">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Post
        </button>
      </div>
    </div>
  );
}
