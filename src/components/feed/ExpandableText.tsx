import { useLayoutEffect, useRef, useState } from "react";

/**
 * Renders post-style body text that preserves line breaks and offers a
 * "Show more / Show less" toggle when the content exceeds `clampLines`.
 *
 * When expanded, content is still clamped to `maxLines` (default 10) so
 * very long bios/descriptions don't blow out card heights.
 *
 * Overflow detection uses the actual rendered DOM, so it stays accurate
 * across font sizes, viewport widths, and emoji.
 */
export function ExpandableText({
  text,
  clampLines = 3,
  maxLines = 7,
  className = "",
}: {
  text?: string | null;
  clampLines?: number;
  maxLines?: number;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setOverflows(el.scrollHeight - 1 > el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, clampLines, expanded, maxLines]);

  if (!text) return null;

  const activeLines = expanded ? maxLines : clampLines;

  return (
    <div className={className}>
      <p
        ref={ref}
        className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground/85"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: activeLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </p>
      {(overflows || expanded) && (
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
