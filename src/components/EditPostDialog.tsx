import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { postTypes, type PostTypeValue } from "@/data/postTypes";
import { categories } from "@/data/categories";
import type { PostRow } from "@/components/social/PostCard";

type Props = {
  open: boolean;
  onClose: () => void;
  post: PostRow;
  onSaved?: () => void;
};

export function EditPostDialog({ open, onClose, post, onSaved }: Props) {
  const [text, setText] = useState(post.text);
  const [title, setTitle] = useState(post.title ?? "");
  const [postType, setPostType] = useState<PostTypeValue>((post.post_type ?? "work_update") as PostTypeValue);
  const [categorySlug, setCategorySlug] = useState(post.category_slug ?? "");
  const [location, setLocation] = useState(post.location ?? "");
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.media_urls ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(post.text);
    setTitle(post.title ?? "");
    setPostType((post.post_type ?? "work_update") as PostTypeValue);
    setCategorySlug(post.category_slug ?? "");
    setLocation(post.location ?? "");
    setMediaUrls(post.media_urls ?? []);
  }, [open, post]);

  const removeImage = (url: string) => setMediaUrls((arr) => arr.filter((u) => u !== url));

  const save = async () => {
    if (!text.trim()) { toast.error("Post text can't be empty"); return; }
    setBusy(true);
    const payload: Record<string, unknown> = {
      text: text.trim(),
      title: title.trim() || null,
      post_type: postType,
      category_slug: categorySlug || null,
      location: location.trim() || null,
      media_urls: mediaUrls,
    };
    const { error } = await (supabase.from("timeline_posts") as unknown as { update: (v: unknown) => { eq: (c: string, id: string) => Promise<{ error: { message: string } | null }> } }).update(payload).eq("id", post.id);
    setBusy(false);
    if (error) { toast.error(error.message || "Could not save changes. Please try again."); return; }
    toast.success("Post updated");
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Short headline" />
          </div>
          <div>
            <Label>Post text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Post type</Label>
              <select value={postType} onChange={(e) => setPostType(e.target.value as PostTypeValue)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {postTypes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">— None —</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Location (optional)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kampala" />
          </div>
          {mediaUrls.length > 0 && (
            <div>
              <Label>Photos</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {mediaUrls.map((u) => (
                  <div key={u} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(u)}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Photos removed here are permanently detached from this post when you save.</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !text.trim()}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
