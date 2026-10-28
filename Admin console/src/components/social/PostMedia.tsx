import { useEffect, useState, useRef } from "react";
import { X, Play, ChevronLeft, ChevronRight } from "lucide-react";

const isVideo = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);

interface PostMediaProps {
  urls: string[];
  alt: string;
  viewMode?: "slides" | "grid";
}

/**
 * Displays post media (1+ images or videos) while preserving natural aspect ratios:
 * - Single item: rendered in its natural aspect ratio without cropping, with rounded edges.
 * - Multiple items: in-feed swipeable carousel with tiny, subtle floating circle dots at the bottom.
 * - View mode (slides vs grid) is controlled by the top-of-page filter, not per-post buttons.
 * - Tap opens a full-screen lightbox.
 */
export function PostMedia({ urls, alt, viewMode = "slides" }: PostMediaProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const hasDragged = useRef<boolean>(false);

  if (!urls || urls.length === 0) return null;

  const open = (i: number) => setOpenIndex(i);
  const close = () => setOpenIndex(null);

  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + urls.length) % urls.length);
  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % urls.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      nextSlide();
    } else if (diff < -40) {
      prevSlide();
    }
    touchStartX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    hasDragged.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartX.current !== null && Math.abs(mouseStartX.current - e.clientX) > 8) {
      hasDragged.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current !== null) {
      const diff = mouseStartX.current - e.clientX;
      if (diff > 45) {
        nextSlide();
      } else if (diff < -45) {
        prevSlide();
      } else if (!hasDragged.current) {
        open(activeSlide);
      }
      mouseStartX.current = null;
    }
  };

  const renderMedia = (u: string, className: string, isSingle = false) =>
    isVideo(u) ? (
      <div className={`relative flex items-center justify-center ${isSingle ? "w-full" : "h-full w-full"}`}>
        <video
          src={u}
          preload="metadata"
          muted
          playsInline
          className={className}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm">
            <Play className="h-6 w-6 fill-white ml-0.5" />
          </span>
        </span>
      </div>
    ) : (
      <img src={u} alt={alt} loading="lazy" className={className} />
    );

  return (
    <>
      {urls.length === 1 ? (
        <div className="relative w-full overflow-hidden rounded-2xl bg-muted/20 border border-border/40 shadow-xs">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(0); }}
            className="block w-full focus:outline-none cursor-pointer group"
            aria-label={isVideo(urls[0]) ? "Play video" : "Open image"}
          >
            {renderMedia(
              urls[0],
              "w-full h-auto max-h-[580px] sm:max-h-[640px] object-contain rounded-2xl mx-auto block transition-transform duration-200 group-hover:scale-[1.005]",
              true
            )}
          </button>
        </div>
      ) : viewMode === "slides" ? (
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-muted/20 border border-border/40 shadow-xs select-none cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Subtle slide counter pill */}
          <span className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white shadow-xs backdrop-blur-xs">
            {activeSlide + 1} / {urls.length}
          </span>

          {/* Main uncropped slide image */}
          <div className="block w-full focus:outline-none">
            {renderMedia(
              urls[activeSlide],
              "w-full h-auto max-h-[560px] sm:max-h-[620px] object-contain rounded-2xl mx-auto block pointer-events-none",
              true
            )}
          </div>

          {/* Ultra-slim floating circle dots on the bottom of the image */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex flex-row items-center justify-center gap-1.5 rounded-full bg-black/35 px-2 h-3.5 backdrop-blur-[2px] shadow-xs pointer-events-auto">
            {urls.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveSlide(idx);
                }}
                className="m-0 p-0 border-0 bg-transparent appearance-none leading-none inline-flex items-center justify-center h-2.5 w-2.5 min-h-0 min-w-0 cursor-pointer focus:outline-none"
                aria-label={`Go to slide ${idx + 1}`}
              >
                <span
                  className={`block h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                    idx === activeSlide
                      ? "bg-white shadow-xs scale-110"
                      : "bg-white/40 hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl bg-muted/15 border border-border/40 p-2 shadow-xs">
          {/* Grid layout with rounded-xl tiles and uncropped object-contain view */}
          {urls.length === 2 ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {urls.map((u, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(i); }}
                  className="relative block aspect-[4/5] sm:aspect-square overflow-hidden rounded-xl bg-muted/30 border border-border/30 group"
                  aria-label={`Open item ${i + 1}`}
                >
                  {renderMedia(u, "h-full w-full object-contain p-1 rounded-xl transition-transform duration-300 group-hover:scale-105")}
                </button>
              ))}
            </div>
          ) : urls.length === 3 ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(0); }}
                className="row-span-2 relative block aspect-[4/5] overflow-hidden rounded-xl bg-muted/30 border border-border/30 group"
                aria-label="Open item 1"
              >
                {renderMedia(urls[0], "h-full w-full object-contain p-1 rounded-xl transition-transform duration-300 group-hover:scale-105")}
              </button>
              <div className="flex flex-col gap-2">
                {urls.slice(1, 3).map((u, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(i + 1); }}
                    className="relative block aspect-square overflow-hidden rounded-xl bg-muted/30 border border-border/30 group flex-1"
                    aria-label={`Open item ${i + 2}`}
                  >
                    {renderMedia(u, "h-full w-full object-contain p-1 rounded-xl transition-transform duration-300 group-hover:scale-105")}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {urls.slice(0, 4).map((u, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(i); }}
                  className="relative block aspect-square overflow-hidden rounded-xl bg-muted/30 border border-border/30 group"
                  aria-label={`Open item ${i + 1}`}
                >
                  {renderMedia(u, "h-full w-full object-contain p-1 rounded-xl transition-transform duration-300 group-hover:scale-105")}
                  {i === 3 && urls.length > 4 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-white rounded-xl backdrop-blur-sm">
                      +{urls.length - 4}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {openIndex !== null && (
        <Lightbox urls={urls} index={openIndex} onClose={close} onChange={setOpenIndex} alt={alt} />
      )}
    </>
  );
}

function Lightbox({
  urls,
  index,
  onClose,
  onChange,
  alt,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
  alt: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % urls.length);
      if (e.key === "ArrowLeft") onChange((index - 1 + urls.length) % urls.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, urls.length, onClose, onChange]);

  const current = urls[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange((index - 1 + urls.length) % urls.length); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange((index + 1) % urls.length); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      {isVideo(current) ? (
        <video
          src={current}
          controls
          autoPlay
          playsInline
          className="max-h-[92vh] max-w-[96vw] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={current}
          alt={alt}
          className="max-h-[92vh] max-w-[96vw] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {urls.length > 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
          {index + 1} / {urls.length}
        </span>
      )}
    </div>
  );
}
