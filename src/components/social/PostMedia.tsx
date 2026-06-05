import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Displays post media (1+ images) while preserving the original aspect ratio.
 * - Single image: rendered at natural aspect ratio inside a clean letterboxed surface
 *   (no forced 16:9 cropping; portrait/square stays portrait/square).
 * - Multiple images: responsive grid; each image still preserves its own ratio via object-contain.
 * - Tap opens a full-screen lightbox with prev/next navigation.
 */
export function PostMedia({ urls, alt }: { urls: string[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!urls || urls.length === 0) return null;

  const open = (i: number) => setOpenIndex(i);
  const close = () => setOpenIndex(null);

  return (
    <>
      {urls.length === 1 ? (
        <button
          type="button"
          onClick={() => open(0)}
          className="block w-full overflow-hidden bg-muted/40 sm:rounded-xl"
          aria-label="Open image"
        >
          <img
            src={urls[0]}
            alt={alt}
            loading="lazy"
            className="mx-auto block max-h-[640px] w-full object-contain"
          />
        </button>
      ) : (
        <div className={`grid gap-1 overflow-hidden sm:rounded-xl ${urls.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
          {urls.slice(0, 4).map((u, i) => (
            <button
              key={i}
              type="button"
              onClick={() => open(i)}
              className="relative block aspect-square overflow-hidden bg-muted/40"
              aria-label={`Open image ${i + 1}`}
            >
              <img src={u} alt={alt} loading="lazy" className="h-full w-full object-cover" />
              {i === 3 && urls.length > 4 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
                  +{urls.length - 4}
                </span>
              )}
            </button>
          ))}
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
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange((index - 1 + urls.length) % urls.length); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange((index + 1) % urls.length); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <img
        src={urls[index]}
        alt={alt}
        className="max-h-[92vh] max-w-[96vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {urls.length > 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
          {index + 1} / {urls.length}
        </span>
      )}
    </div>
  );
}
