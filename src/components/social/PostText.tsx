import { useState } from "react";

/**
 * Post caption/message with mobile-first "Read more" expansion.
 * Shows ~3-5 lines (CSS line-clamp ~5) by default; expands on click when text is long.
 */
export function PostText({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  // Heuristic: only show Read more for longer content.
  const isLong = text.length > 220 || text.split("\n").length > 5;

  return (
    <div className={className}>
      <p
        className={`whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 ${
          !open && isLong ? "line-clamp-5" : ""
        }`}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-xs font-semibold text-orange hover:underline"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
