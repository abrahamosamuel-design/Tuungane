import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  StarOff,
  Video as VideoIcon,
  ImageIcon,
  RefreshCw,
} from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SECONDS = 120;
const STORAGE_BUCKET = "tuungane-media";

// Turn a stored public URL back into the object path inside the bucket so we can
// delete it. Handles both `/object/public/<bucket>/...` and `/object/<bucket>/...`
// (signed) URL shapes. Returns null when the URL doesn't belong to the bucket.
function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const marker = `/${STORAGE_BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const path = u.pathname.slice(idx + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

async function removeStorageObjects(urls: (string | null | undefined)[]) {
  const paths = Array.from(
    new Set(urls.map(pathFromPublicUrl).filter((p): p is string => Boolean(p))),
  );
  if (paths.length === 0) return;
  // Use the dedicated upload route DELETE /api/upload/storage for tuungane-media bucket
  try {
    await apiClient.delete('/upload/storage', {
      data: { bucket: STORAGE_BUCKET, paths }
    });
  } catch (error) {
    console.warn("Failed to remove storage objects", paths, error);
  }
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<MediaRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/services/media/${profileId}`);
      setItems(res.data || []);
    } catch (error) {
      toast.error("Couldn't load media");
      setItems([]);
    }
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
        await apiClient.post("/services/media", {
          service_user_id: ownerId,
          public_profile_id: profileId,
          kind: isVideo ? "video" : "photo",
          url,
          thumbnail_url: thumbUrl,
          sort_order: baseOrder++,
          duration_seconds: duration,
          is_cover: items.length === 0 && inserted === 0,
        });
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

  const askRemove = (item: MediaRow) => {
    setDeleteTarget(item);
  };

  const cancelRemove = () => {
    setDeleteTarget(null);
    setDeletingId(null);
  };

  const removeItem = async (id: string) => {
    const target = items.find((m) => m.id === id);
    if (!target) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/services/media/${id}`);
      await removeStorageObjects([target.url, target.thumbnail_url]);
    } catch (error: any) {
      setDeletingId(null);
      setDeleteTarget(null);
      return toast.error(error.response?.data?.error || "Failed to delete");
    }
    setDeletingId(null);
    setDeleteTarget(null);
    load();
  };

  const moveItem = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    // Swap sort_order
    try {
      await Promise.all([
        apiClient.patch(`/services/media/${a.id}`, { sort_order: b.sort_order }),
        apiClient.patch(`/services/media/${b.id}`, { sort_order: a.sort_order }),
      ]);
      load();
    } catch (e) {
      toast.error("Failed to move");
    }
  };

  const setCover = async (id: string, current: boolean) => {
    try {
      if (current) {
        await apiClient.patch(`/services/media/${id}`, { is_cover: false });
      } else {
        // Clear existing cover first
        await apiClient.post(`/services/media/unset-cover/${profileId}`);
        await apiClient.patch(`/services/media/${id}`, { is_cover: true });
        
        // Mirror photo covers into service_profiles.cover_url
        const target = items.find((m) => m.id === id);
        if (target && target.kind === "photo") {
          await apiClient.put('/profiles/me/full', { service_profile: { cover_url: target.url } });
        } else if (target && target.kind === "video" && target.thumbnail_url) {
          await apiClient.put('/profiles/me/full', { service_profile: { cover_url: target.thumbnail_url } });
        }
      }
      load();
    } catch (e) {
      toast.error("Failed to set cover");
    }
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
      await apiClient.patch(`/services/media/${target.id}`, {
        kind: isVideo ? "video" : "photo",
        url,
        thumbnail_url: thumbUrl,
        duration_seconds: duration,
      });
      // Old file(s) are now orphaned — clean them up. Skip an old thumbnail we're reusing.
      await removeStorageObjects([
        target.url,
        target.thumbnail_url && target.thumbnail_url !== thumbUrl ? target.thumbnail_url : null,
      ]);
      if (target.is_cover) {
        const coverUrl = isVideo ? thumbUrl : url;
        if (coverUrl) {
          await apiClient.put('/profiles/me/full', { service_profile: { cover_url: coverUrl } });
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
          <h3 className="text-sm font-semibold text-navy">Upload photos &amp; videos</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Services with real photos and short videos get far more contacts. Show your work, your team, and your space — customers trust what they can see. Max 50&nbsp;MB, videos up to 2&nbsp;minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {busy ? "Uploading…" : "Upload"}
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
          No photos or videos yet. Tap <span className="font-semibold text-navy">Upload</span> to share your work — the first item becomes your cover and helps customers trust your service.
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
              <div className="flex flex-wrap items-center justify-between gap-1 p-1.5">
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
                <div className="flex flex-wrap justify-end gap-1">
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
                    onClick={() => askRemove(m)}
                    disabled={deletingId === m.id}
                    className="rounded-md border border-destructive/40 bg-destructive/10 p-1 text-destructive disabled:opacity-50"
                    aria-label="Delete"
                    title="Delete"
                  >
                    {deletingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && cancelRemove()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.kind === "video" ? "video" : "photo"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the {deleteTarget?.kind === "video" ? "video" : "photo"} from your gallery and storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRemove} disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && removeItem(deleteTarget.id)}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
