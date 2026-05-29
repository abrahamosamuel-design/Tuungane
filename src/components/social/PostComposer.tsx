import { useState } from "react";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { categories } from "@/data/categories";
import { toast } from "sonner";

export function PostComposer({ defaultCategory, onPosted }: { defaultCategory?: string | null; onPosted?: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

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
      provider_user_id: user.id, text: text.trim(), category_slug: category || null, location: location.trim() || null, media_urls: media,
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
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Share your work — a completed job, available service, or update from the field..." className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange" />
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
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
          <option value="">Category…</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Entebbe)" className="rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-orange" />
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
