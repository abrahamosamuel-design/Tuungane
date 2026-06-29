import { useLayoutEffect, useRef, useState } from "react";

/**
 * Renders post-style body text that preserves line breaks and offers a
 * "Show more / Show less" toggle when the content exceeds `clampLines`.
 *
 * The overflow check uses the actual rendered DOM, so it stays accurate
 * across font sizes, viewport widths, and emoji.
 */
export function ExpandableText({
  text,
  clampLines = 5,
  className = "",
}: {
  text?: string | null;
  clampLines?: number;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // When clamped, scrollHeight is greater than clientHeight if overflow exists.
      setOverflows(el.scrollHeight - 1 > el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, clampLines]);

  if (!text) return null;

  return (
    <div className={className}>
      <p
        ref={ref}
        className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground/85"
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-1 text-xs font-semibold text-orange hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
