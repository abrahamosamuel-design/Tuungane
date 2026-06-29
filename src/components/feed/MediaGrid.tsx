import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Twitter/X-style image grid for 1–4 visible photos.
 * If more than 4 images are provided, the 4th tile shows a "+N" overlay.
 * Tapping any image opens an inline lightbox with prev/next navigation.
 */
export function MediaGrid({
  urls,
  alt = "Attached photo",
}: {
  urls?: string[] | null;
  alt?: string;
}) {
  const items = (urls ?? []).filter(Boolean) as string[];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (items.length === 0) return null;
  const visible = items.slice(0, 4);
  const extra = items.length - visible.length;

  // Grid template based on count for a balanced layout.
  const gridCls =
    visible.length === 1
      ? "grid-cols-1"
      : visible.length === 2
        ? "grid-cols-2"
        : visible.length === 3
          ? "grid-cols-2 grid-rows-2"
          : "grid-cols-2 grid-rows-2";

  return (
    <>
      <div
        className={`mt-2 grid gap-1 overflow-hidden rounded-xl border border-border ${gridCls}`}
        style={{ aspectRatio: visible.length === 1 ? "16/10" : "16/10" }}
      >
        {visible.map((u, i) => {
          // For 3-image layouts, make the first image span both rows.
          const span =
            visible.length === 3 && i === 0
              ? "row-span-2"
              : "";
          const isLastVisible = i === visible.length - 1 && extra > 0;
          return (
            <button
              key={u + i}
              type="button"
              onClick={() => setOpenIdx(i)}
              className={`relative block h-full w-full overflow-hidden bg-muted ${span}`}
              aria-label={`Open photo ${i + 1} of ${items.length}`}
            >
              <img
                src={u}
                alt={`${alt} ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              />
              {isLastVisible && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">
                  +{extra}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {openIdx !== null && (
        <Lightbox
          urls={items}
          startIndex={openIdx}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}

function Lightbox({
  urls,
  startIndex,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const next = useCallback(() => setI((v) => (v + 1) % urls.length), [urls.length]);
  const prev = useCallback(() => setI((v) => (v - 1 + urls.length) % urls.length), [urls.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, prev]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
            className="absolute left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
            className="absolute right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <img
        src={urls[i]}
        alt={`Photo ${i + 1} of ${urls.length}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
      />
      {urls.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
          {i + 1} / {urls.length}
        </p>
      )}
    </div>
  );
}
