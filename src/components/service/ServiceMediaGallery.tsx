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

/**
 * Visual-first hero for a service profile.
 * - Auto-advances every 2s, loops. Pauses while a video is playing.
 * - Manual swipe / tap does not disable auto-scroll (only resets timing).
 * - Videos: generates a first-frame poster when no thumbnail; play starts with sound.
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

  const goTo = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    const target = ((i % items.length) + items.length) % items.length;
    el.scrollTo({ left: target * width, behavior: "smooth" });
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

  // Briefly delay auto-advance after user interaction so it doesn't fight them.
  const nudge = useCallback(() => {
    suspendUntil.current = Date.now() + AUTO_MS * 2;
  }, []);

  // If the user scrolls away from a playing video, stop it.
  useEffect(() => {
    if (!playingId) return;
    const idx = items.findIndex((m) => m.id === playingId);
    if (idx !== -1 && idx !== active) setPlayingId(null);
  }, [active, playingId, items]);

  // Generate first-frame posters for videos missing a thumbnail.
  const videoIds = useMemo(
    () => items.filter((m) => m.kind === "video" && !m.thumbnail_url).map((m) => `${m.id}|${m.url}`).join(","),
    [items],
  );
  useEffect(() => {
    if (!videoIds) return;
    let cancelled = false;
    for (const m of items) {
      if (m.kind !== "video" || m.thumbnail_url || posters[m.id]) continue;
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = m.url;
      const onLoaded = () => {
        try {
          video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        } catch {
          /* noop */
        }
      };
      const onSeeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const data = canvas.toDataURL("image/jpeg", 0.7);
          if (!cancelled) setPosters((p) => ({ ...p, [m.id]: data }));
        } catch {
          /* cross-origin — skip */
        } finally {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("seeked", onSeeked);
          video.src = "";
        }
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("seeked", onSeeked);
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
          const poster = m.thumbnail_url ?? posters[m.id] ?? fallbackAvatarUrl ?? undefined;
          const isPlaying = playingId === m.id;
          return (
            <div key={m.id} className="relative h-full w-full flex-none snap-center">
              {m.kind === "photo" ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : isPlaying ? (
                <video
                  src={m.url}
                  poster={poster}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full bg-black object-cover"
                  onEnded={() => setPlayingId(null)}
                  onPause={(e) => {
                    // Return to play overlay when user pauses at start/end.
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
                  className="group relative block h-full w-full"
                  aria-label="Play video"
                >
                  {poster ? (
                    <img src={poster} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-navy/10" />
                  )}
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/40">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-navy shadow-lg">
                      <Play className="h-7 w-7 translate-x-0.5 fill-navy" />
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
