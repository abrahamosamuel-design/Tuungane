import { useState, useRef, useEffect } from "react";
import { X, ImagePlus, Loader2, Video, Play, Briefcase } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { postTypes, type PostTypeValue } from "@/data/postTypes";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onClose: () => void;
  jobTitle?: string;
  requestId?: string;
  serviceId?: string;
  onPosted?: () => void;
};

type MediaItem = { url: string; type: "image" | "video" };

const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Invalid video file"));
    };
    video.src = URL.createObjectURL(file);
  });
};

export function AddTimelinePostDialog({ open, onClose, jobTitle, requestId, serviceId, onPosted }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [postType, setPostType] = useState<PostTypeValue>("work_update");
  const [selectedServiceId, setSelectedServiceId] = useState<string>(serviceId || "");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch the logged-in user's own services
  const { data: myServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["my-services-list", user?.id],
    queryFn: async () => {
      const res = await apiClient<{ data: any[] }>("/services/me");
      return res.data || [];
    },
    enabled: open && !!user,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (serviceId) {
      setSelectedServiceId(serviceId);
    }
  }, [serviceId, open]);

  if (!open || !user) return null;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    setProgressMsg("Preparing upload...");
    try {
      const newItems: MediaItem[] = [];
      for (const f of Array.from(files).slice(0, 6 - media.length)) {
        const isVideo = f.type.startsWith("video/");
        if (isVideo) {
          if (f.size > 30 * 1024 * 1024) {
            toast.error(`${f.name} exceeds 30 MB limit`);
            continue;
          }
          try {
            const duration = await getVideoDuration(f);
            if (duration > 60) {
              toast.error(`${f.name} is longer than 60 seconds.`);
              continue;
            }
          } catch (err) {
            toast.error(`Could not read video metadata for ${f.name}`);
            continue;
          }
        }
        
        const url = await uploadMedia(user.id, f, "timeline", (msg) => {
          setProgressMsg(msg);
        });
        newItems.push({ url, type: isVideo ? "video" : "image" });
      }
      setMedia((m) => [...m, ...newItems].slice(0, 6));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgressMsg("");
    }
  };

  const removeMedia = (idx: number) => setMedia((m) => m.filter((_, i) => i !== idx));

  const activeServiceId = selectedServiceId || serviceId || null;
  const activeService = myServices.find((s: any) => s.id === activeServiceId);

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
        post_type: postType || "work_update",
        service_id: activeServiceId,
        category_slug: activeService?.category_slug || null,
      });

      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["home-feed"] });
      if (activeServiceId) {
        queryClient.invalidateQueries({ queryKey: ["service", activeServiceId] });
      }

      toast.success(
        activeService
          ? `Posted to community feed & ${activeService.title} timeline!`
          : jobTitle
          ? "Timeline post added!"
          : "Post published to community feed!"
      );
      setText("");
      setMedia([]);
      setSelectedServiceId(serviceId || "");
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
            <h2 className="text-base font-bold text-navy">
              {jobTitle ? "Add Timeline Post" : "Post on Community Feed"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
              {jobTitle ? `For: ${jobTitle}` : "Share updates, advertise, or connect"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Post Type & Service Selectors for Community Feed */}
          {!jobTitle && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as PostTypeValue)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-navy outline-none focus:border-navy"
                >
                  {postTypes.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <select
                  id="select-service-dropdown"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-navy outline-none focus:border-navy max-w-[250px] truncate"
                >
                  <option value="">Select a service (optional)…</option>
                  {servicesLoading ? (
                    <option value="" disabled>Loading your services…</option>
                  ) : myServices.length === 0 ? (
                    <option value="" disabled>No services listed yet</option>
                  ) : (
                    myServices.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.title}{s.profile?.name && s.profile.name !== s.title ? ` (${s.profile.name})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {activeService && (
                <div className="flex items-center gap-1.5 text-[11px] text-orange font-medium bg-orange/5 border border-orange/20 px-3 py-1.5 rounded-xl">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Will appear on community feed & under <strong>{activeService.title}</strong> timeline</span>
                </div>
              )}
            </div>
          )}

          {/* Text Input */}
          <div>
            <textarea
              id="timeline-post-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                jobTitle
                  ? "Describe the work you completed, share a milestone, or update your client..."
                  : "Share updates, advertise, or connect with the Tuungane community..."
              }
              rows={4}
              className={`w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground outline-none transition-all ${
                jobTitle
                  ? "focus:border-orange focus:ring-2 focus:ring-orange/20"
                  : "focus:border-navy focus:ring-2 focus:ring-navy/20"
              }`}
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
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading || media.length >= 6}
                className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Add Photos
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading || media.length >= 6}
                className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                Add Video
              </button>
            </div>
            {uploading && progressMsg && (
              <p className="text-xs font-medium text-navy animate-pulse">
                {progressMsg}
              </p>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
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
            className={`w-full rounded-full py-3 text-center font-bold text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              jobTitle ? "bg-orange hover:bg-orange/90" : "bg-navy hover:bg-navy/90"
            }`}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {jobTitle ? "Post to Timeline" : "Post on Community Feed"}
          </button>
        </div>
      </div>
    </div>
  );
}
