import { useEffect, useRef, useState } from "react";
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

/**
 * Visual-first hero for a service profile.
 *
 * - 4:3 on mobile, 16:9 from sm up, snap-swipe horizontal on mobile.
 * - Video items render a poster + play overlay; tapping unmutes controls on-page.
 * - Never autoplays with sound; videos are muted+inline when playing.
 * - Falls back to the service logo/avatar if no media has been uploaded.
 */
export function ServiceMediaGallery({
  items,
  fallbackName,
  fallbackAvatarUrl,
  fallbackCategorySlug,
}: Props) {
  const [active, setActive] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

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
        className="mx-auto flex aspect-[4/3] w-full max-w-2xl snap-x snap-mandatory overflow-x-auto scroll-smooth sm:aspect-[16/9]"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((m) => (
          <div key={m.id} className="relative h-full w-full flex-none snap-center">
            {m.kind === "photo" ? (
              <img
                src={m.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : playingId === m.id ? (
              <video
                src={m.url}
                poster={m.thumbnail_url ?? undefined}
                controls
                autoPlay
                muted
                playsInline
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlayingId(m.id)}
                className="group relative block h-full w-full"
                aria-label="Play video"
              >
                {m.thumbnail_url ? (
                  <img src={m.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video
                    src={m.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full bg-black object-cover"
                  />
                )}
                <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/25 transition group-hover:bg-black/35">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-navy shadow-lg">
                    <Play className="h-6 w-6 translate-x-0.5 fill-navy" />
                  </span>
                </span>
              </button>
            )}
          </div>
        ))}
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
