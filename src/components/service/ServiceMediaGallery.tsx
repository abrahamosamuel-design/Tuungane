import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Play, Video } from "lucide-react";
import { Avatar } from "@/components/social/Avatar";

export type ServiceMediaItem = {
  id: string;
  kind: "photo" | "video";
  url: string;
  thumbnail_url: string | null;
};

type Props = {
  items: ServiceMediaItem[];
  fallbackName: string;
  fallbackAvatarUrl: string | null;
  fallbackCategorySlug: string | null;
};

const AUTO_MS = 2000;
// Timestamps (seconds) to try when capturing a poster frame. We skip 0 because
// many videos start on a black/blank frame.
const POSTER_SAMPLE_TIMES = [1.2, 2.0, 3.0, 0.5];
// A frame is considered "black" (unusable) if its average luminance is below
// this threshold on a 0-255 scale.
const BLACK_LUMA_THRESHOLD = 12;

/**
 * Visual-first hero for a service profile.
 * - Auto-advances every 2s, loops. Pauses while a video is playing.
 * - Manual swipe / tap does not disable auto-scroll (only resets timing).
 * - Videos: generates a poster from ~1-2s in (skipping black frames); falls
 *   back to service imagery + play overlay if capture fails.
 */
export function ServiceMediaGallery({
  items,
  fallbackName,
  fallbackAvatarUrl,
  fallbackCategorySlug,
}: Props) {
  const [active, setActive] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [posters, setPosters] = useState<Record<string, string>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const suspendUntil = useRef(0);
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Track active slide from scroll position.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const width = el.clientWidth || 1;
      setActive(Math.round(el.scrollLeft / width));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  // Auto-advance loop.
  useEffect(() => {
    if (items.length <= 1) return;
    if (playingId) return;
    if (reduceMotion.current) return;
    const t = setInterval(() => {
      if (Date.now() < suspendUntil.current) return;
      const el = scrollerRef.current;
      if (!el) return;
      const width = el.clientWidth || 1;
      const currentIndex = Math.round(el.scrollLeft / width);
      const next = (currentIndex + 1) % items.length;
      el.scrollTo({ left: next * width, behavior: "smooth" });
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [items.length, playingId]);

  const nudge = useCallback(() => {
    suspendUntil.current = Date.now() + AUTO_MS * 2;
  }, []);

  // If the user scrolls away from a playing video, stop it.
  useEffect(() => {
    if (!playingId) return;
    const idx = items.findIndex((m) => m.id === playingId);
    if (idx !== -1 && idx !== active) setPlayingId(null);
  }, [active, playingId, items]);

  // Generate posters for videos missing a thumbnail.
  const videoIds = useMemo(
    () =>
      items
        .filter((m) => m.kind === "video" && !m.thumbnail_url)
        .map((m) => `${m.id}|${m.url}`)
        .join(","),
    [items],
  );
  useEffect(() => {
    if (!videoIds) return;
    let cancelled = false;

    const capture = (item: ServiceMediaItem) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      // @ts-expect-error - non-standard but widely supported
      video.setAttribute("webkit-playsinline", "true");
      video.src = item.url;

      let attempt = 0;
      let settled = false;

      const cleanup = () => {
        video.removeAttribute("src");
        try {
          video.load();
        } catch {
          /* noop */
        }
      };

      const tryNext = () => {
        if (settled || cancelled) return;
        if (attempt >= POSTER_SAMPLE_TIMES.length) {
          settled = true;
          cleanup();
          return;
        }
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const t = POSTER_SAMPLE_TIMES[attempt++];
        const target = duration > 0 ? Math.min(t, Math.max(0, duration - 0.05)) : t;
        try {
          video.currentTime = target;
        } catch {
          tryNext();
        }
      };

      const onSeeked = () => {
        if (settled || cancelled) return;
        try {
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 360;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            settled = true;
            cleanup();
            return;
          }
          ctx.drawImage(video, 0, 0, w, h);

          // Luminance check — skip mostly-black frames.
          let luma = 0;
          try {
            const sampleW = Math.min(64, w);
            const sampleH = Math.min(64, h);
            const sample = ctx.getImageData(0, 0, sampleW, sampleH).data;
            let sum = 0;
            for (let i = 0; i < sample.length; i += 4) {
              sum += 0.299 * sample[i] + 0.587 * sample[i + 1] + 0.114 * sample[i + 2];
            }
            luma = sum / (sample.length / 4);
          } catch {
            // getImageData throws on tainted canvas — accept the frame as-is.
            luma = 255;
          }

          if (luma < BLACK_LUMA_THRESHOLD && attempt < POSTER_SAMPLE_TIMES.length) {
            tryNext();
            return;
          }

          const data = canvas.toDataURL("image/jpeg", 0.72);
          if (!cancelled) setPosters((p) => ({ ...p, [item.id]: data }));
          settled = true;
          cleanup();
        } catch {
          settled = true;
          cleanup();
        }
      };

      video.addEventListener("loadeddata", tryNext, { once: false });
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", () => {
        settled = true;
        cleanup();
      });
    };

    for (const m of items) {
      if (m.kind !== "video" || m.thumbnail_url || posters[m.id]) continue;
      capture(m);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoIds]);

  if (items.length === 0) {
    return (
      <div className="relative w-full bg-muted">
        <div className="mx-auto aspect-[4/3] w-full max-w-2xl sm:aspect-[16/9]">
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-40 w-40 overflow-hidden rounded-3xl border-4 border-background bg-card shadow-md">
              <Avatar
                name={fallbackName}
                url={fallbackAvatarUrl}
                categorySlug={fallbackCategorySlug}
                size={152}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const total = items.length;
  const videoCount = items.filter((m) => m.kind === "video").length;
  const IconChip = videoCount > 0 && videoCount === total ? Video : Camera;

  // First photo in the reel — used as a nice fallback poster for videos when
  // capture fails.
  const firstPhotoUrl = items.find((m) => m.kind === "photo")?.url ?? null;

  return (
    <div className="relative w-full bg-navy/[0.03]">
      <div
        ref={scrollerRef}
        onTouchStart={nudge}
        onPointerDown={nudge}
        className="mx-auto flex aspect-[4/3] w-full max-w-2xl snap-x snap-mandatory overflow-x-auto scroll-smooth sm:aspect-[16/9]"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((m) => {
          const capturedPoster = posters[m.id];
          const posterImage =
            m.thumbnail_url ?? capturedPoster ?? firstPhotoUrl ?? fallbackAvatarUrl ?? null;
          const isPlaying = playingId === m.id;
          const hasRealPoster = Boolean(m.thumbnail_url || capturedPoster);

          return (
            <div key={m.id} className="relative h-full w-full flex-none snap-center">
              {m.kind === "photo" ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : isPlaying ? (
                <video
                  src={m.url}
                  poster={posterImage ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full bg-black object-cover"
                  onEnded={() => setPlayingId(null)}
                  onPause={(e) => {
                    const v = e.currentTarget;
                    if (v.ended || v.currentTime === 0) setPlayingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    nudge();
                    setPlayingId(m.id);
                  }}
                  className="group relative block h-full w-full bg-navy/10"
                  aria-label="Play video"
                >
                  {posterImage ? (
                    <img
                      src={posterImage}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-navy/10">
                      <Avatar
                        name={fallbackName}
                        url={fallbackAvatarUrl}
                        categorySlug={fallbackCategorySlug}
                        size={140}
                      />
                    </div>
                  )}
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 transition group-hover:bg-black/45">
                    <span className="flex flex-col items-center gap-2">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-navy shadow-lg">
                        <Play className="h-7 w-7 translate-x-0.5 fill-navy" />
                      </span>
                      {!hasRealPoster && (
                        <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-medium text-white">
                          Video preview
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Count chip */}
      <div className="pointer-events-none absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
        <IconChip className="h-3.5 w-3.5" />
        {active + 1}/{total}
      </div>

      {/* Dot pager */}
      {total > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {items.map((m, i) => (
            <span
              key={m.id}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-white" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
