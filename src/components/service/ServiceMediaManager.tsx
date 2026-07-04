import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, ArrowUp, ArrowDown, Star, StarOff, Video as VideoIcon, ImageIcon, RefreshCw } from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SECONDS = 120;

export type MediaRow = {
  id: string;
  service_user_id: string;
  kind: "photo" | "video";
  url: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_cover: boolean;
  duration_seconds: number | null;
};

/**
 * Owner-only media manager for a service_profile.
 * Uses the existing public `tuungane-media` bucket (service-media/{userId}/...).
 */
export function ServiceMediaManager({ ownerId, profileId }: { ownerId: string; profileId: string }) {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<MediaRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_media")
      .select("id,service_user_id,kind,url,thumbnail_url,sort_order,is_cover,duration_seconds")
      .eq("public_profile_id" as never, profileId)
      .order("is_cover", { ascending: false })
      .order("sort_order");
    if (error) toast.error("Couldn't load media");
    setItems((data ?? []) as MediaRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, profileId]);

  const nextSortOrder = () =>
    (items.reduce((max, i) => Math.max(max, i.sort_order), -1) + 1) | 0;

  const handleFiles = async (fs: FileList | null) => {
    if (!fs || fs.length === 0) return;
    setBusy(true);
    let baseOrder = nextSortOrder();
    let inserted = 0;
    for (const file of Array.from(fs)) {
      try {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) {
          toast.error(`Skipped ${file.name}: not a photo or video`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is over 25 MB — please compress and retry`);
          continue;
        }
        let duration: number | null = null;
        let thumbUrl: string | null = null;
        if (isVideo) {
          const meta = await probeVideo(file);
          if (meta.duration > MAX_VIDEO_SECONDS) {
            toast.error(`${file.name} is longer than ${MAX_VIDEO_SECONDS}s — please trim it`);
            continue;
          }
          duration = Math.round(meta.duration);
          if (meta.thumbnailBlob) {
            const thumbFile = new File(
              [meta.thumbnailBlob],
              `${crypto.randomUUID()}.jpg`,
              { type: "image/jpeg" },
            );
            try {
              thumbUrl = await uploadMedia(ownerId, thumbFile, "service-media/thumbs");
            } catch {
              /* thumbnail failure isn't fatal */
            }
          }
        }
        const url = await uploadMedia(ownerId, file, "service-media");
        const { error } = await supabase.from("service_media").insert({
          service_user_id: ownerId,
          public_profile_id: profileId,
          kind: isVideo ? "video" : "photo",
          url,
          thumbnail_url: thumbUrl,
          sort_order: baseOrder++,
          duration_seconds: duration,
          is_cover: items.length === 0 && inserted === 0,
        } as never);
        if (error) {
          toast.error(error.message);
          continue;
        }
        inserted++;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed";
        toast.error(message);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
    if (inserted > 0) {
      toast.success(`Added ${inserted} item${inserted === 1 ? "" : "s"}`);
      load();
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm("Remove this media item?")) return;
    const target = items.find((m) => m.id === id);
    const { error } = await supabase.from("service_media").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (target) {
      await removeStorageObjects([target.url, target.thumbnail_url]);
    }
    load();
  };

  const moveItem = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    // Swap sort_order
    await Promise.all([
      supabase.from("service_media").update({ sort_order: b.sort_order } as never).eq("id", a.id),
      supabase.from("service_media").update({ sort_order: a.sort_order } as never).eq("id", b.id),
    ]);
    load();
  };

  const setCover = async (id: string, current: boolean) => {
    if (current) {
      await supabase.from("service_media").update({ is_cover: false } as never).eq("id", id);
    } else {
      // Clear existing cover first (partial unique index requires only one)
      await supabase
        .from("service_media")
        .update({ is_cover: false } as never)
        .eq("public_profile_id" as never, profileId)
        .eq("is_cover", true);
      await supabase.from("service_media").update({ is_cover: true } as never).eq("id", id);
      // Mirror photo covers into service_profiles.cover_url so existing service cards pick them up
      const target = items.find((m) => m.id === id);
      if (target && target.kind === "photo") {
        await supabase
          .from("service_profiles")
          .update({ cover_url: target.url } as never)
          .eq("user_id", ownerId);
      } else if (target && target.kind === "video" && target.thumbnail_url) {
        await supabase
          .from("service_profiles")
          .update({ cover_url: target.thumbnail_url } as never)
          .eq("user_id", ownerId);
      }
    }
    load();
  };

  const beginReplace = (item: MediaRow) => {
    setReplaceTarget(item);
    replaceRef.current?.click();
  };

  const handleReplaceFile = async (fs: FileList | null) => {
    const file = fs?.[0];
    const target = replaceTarget;
    if (replaceRef.current) replaceRef.current.value = "";
    setReplaceTarget(null);
    if (!file || !target) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return toast.error("Please pick a photo or video");
    if (file.size > MAX_BYTES) return toast.error("File is over 50 MB");
    setBusy(true);
    try {
      let duration: number | null = null;
      let thumbUrl: string | null = target.thumbnail_url;
      if (isVideo) {
        const meta = await probeVideo(file);
        if (meta.duration > MAX_VIDEO_SECONDS) {
          toast.error(`Video is longer than ${MAX_VIDEO_SECONDS}s — please trim it`);
          setBusy(false);
          return;
        }
        duration = Math.round(meta.duration);
        if (meta.thumbnailBlob) {
          const thumbFile = new File(
            [meta.thumbnailBlob],
            `${crypto.randomUUID()}.jpg`,
            { type: "image/jpeg" },
          );
          try {
            thumbUrl = await uploadMedia(ownerId, thumbFile, "service-media/thumbs");
          } catch {
            /* non-fatal */
          }
        }
      } else {
        thumbUrl = null;
      }
      const url = await uploadMedia(ownerId, file, "service-media");
      const { error } = await supabase
        .from("service_media")
        .update({
          kind: isVideo ? "video" : "photo",
          url,
          thumbnail_url: thumbUrl,
          duration_seconds: duration,
        } as never)
        .eq("id", target.id);
      if (error) throw new Error(error.message);
      // Old file(s) are now orphaned — clean them up. Skip an old thumbnail we're reusing.
      await removeStorageObjects([
        target.url,
        target.thumbnail_url && target.thumbnail_url !== thumbUrl ? target.thumbnail_url : null,
      ]);
      if (target.is_cover) {
        const coverUrl = isVideo ? thumbUrl : url;
        if (coverUrl) {
          await supabase
            .from("service_profiles")
            .update({ cover_url: coverUrl } as never)
            .eq("user_id", ownerId);
        }
      }
      toast.success("Media updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">Service photos &amp; videos</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add photos or short videos of your work so customers can trust your service. Max 50&nbsp;MB, videos up to 2&nbsp;minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {busy ? "Uploading…" : "Add media"}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={replaceRef}
          type="file"
          hidden
          accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
          onChange={(e) => handleReplaceFile(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="mt-4 flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No photos or videos yet. Tap <span className="font-semibold text-navy">Add media</span> to upload — the first item becomes your cover.
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m, i) => (
            <li key={m.id} className="group relative overflow-hidden rounded-xl border border-border bg-muted">
              <div className="relative aspect-square w-full">
                {m.kind === "photo" ? (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    {m.thumbnail_url ? (
                      <img src={m.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    )}
                    <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/25">
                      <VideoIcon className="h-6 w-6 text-white" />
                    </span>
                  </>
                )}
                {m.is_cover && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-foreground">
                    Cover
                  </span>
                )}
                <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {m.kind === "photo" ? <ImageIcon className="h-3 w-3" /> : <VideoIcon className="h-3 w-3" />}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    className="rounded-md border border-border p-1 text-navy/70 disabled:opacity-30"
                    aria-label="Move earlier"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(i, 1)}
                    disabled={i === items.length - 1}
                    className="rounded-md border border-border p-1 text-navy/70 disabled:opacity-30"
                    aria-label="Move later"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCover(m.id, m.is_cover)}
                    className="rounded-md border border-border p-1 text-orange"
                    aria-label={m.is_cover ? "Unset cover" : "Set as cover"}
                  >
                    {m.is_cover ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => beginReplace(m)}
                    className="rounded-md border border-border p-1 text-navy/70"
                    aria-label="Replace with a new photo or video"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(m.id)}
                    className="rounded-md border border-border p-1 text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Load metadata + grab a poster frame from a video File without leaving the page.
async function probeVideo(
  file: File,
): Promise<{ duration: number; thumbnailBlob: Blob | null }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("video metadata timed out")), 8000);
      video.onloadedmetadata = () => {
        clearTimeout(t);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(t);
        reject(new Error("Couldn't read video"));
      };
    });

    const duration = video.duration || 0;

    // Seek to ~0.5s (or 10% for very short clips) to grab a representative frame.
    const seekTo = Math.min(Math.max(0.5, duration * 0.1), Math.max(0.1, duration - 0.1));
    const thumbnailBlob = await new Promise<Blob | null>((resolve) => {
      const done = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 360;
          const scale = Math.min(1, 720 / Math.max(w, h));
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
        } catch {
          resolve(null);
        }
      };
      video.onseeked = done;
      try {
        video.currentTime = seekTo;
      } catch {
        resolve(null);
      }
      setTimeout(() => resolve(null), 6000);
    });

    return { duration, thumbnailBlob };
  } finally {
    URL.revokeObjectURL(url);
  }
}
