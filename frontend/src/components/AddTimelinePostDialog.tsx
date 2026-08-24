import { useState, useRef } from "react";
import { X, ImagePlus, Loader2, Video, Play } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  requestId: string;
  serviceId?: string;
  onPosted?: () => void;
};

type MediaItem = { url: string; type: "image" | "video" };

export function AddTimelinePostDialog({ open, onClose, jobTitle, requestId, serviceId, onPosted }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open || !user) return null;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const newItems: MediaItem[] = [];
      for (const f of Array.from(files).slice(0, 6 - media.length)) {
        const isVideo = f.type.startsWith("video/");
        if (isVideo && f.size > 30 * 1024 * 1024) {
          toast.error(`${f.name} exceeds 30 MB limit`);
          continue;
        }
        const url = await uploadMedia(user.id, f, "timeline");
        newItems.push({ url, type: isVideo ? "video" : "image" });
      }
      setMedia((m) => [...m, ...newItems].slice(0, 6));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (idx: number) => setMedia((m) => m.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!text.trim() && media.length === 0) {
      toast.error("Add some text or media to post");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/social/posts", {
        text: text.trim(),
        media_urls: media.map((m) => m.url),
        post_type: "work_update",
        service_id: serviceId || null,
      });
      toast.success("Timeline post added!");
      setText("");
      setMedia([]);
      onPosted?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-navy">Add Timeline Post</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">For: {jobTitle}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Text Input */}
          <div>
            <textarea
              id="timeline-post-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the work you completed, share a milestone, or update your client..."
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/20 transition-all"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{text.length}/500</p>
          </div>

          {/* Media Grid */}
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl bg-muted border border-border">
                  {item.type === "image" ? (
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="relative h-full w-full bg-black flex items-center justify-center">
                      <video src={item.url} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white/80 fill-white/80" />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Media Button */}
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || media.length >= 6}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-orange hover:text-orange transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              Add Photos
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || media.length >= 6}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-orange hover:text-orange transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              Add Video
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          <p className="text-[11px] text-muted-foreground">
            Up to 6 files. Images (JPG, PNG, WebP) and short videos (MP4, max 30 MB).
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4">
          <button
            onClick={submit}
            disabled={submitting || (!text.trim() && media.length === 0)}
            className="w-full rounded-full bg-orange py-3 text-center font-bold text-white shadow-md hover:bg-orange/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Post to Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
