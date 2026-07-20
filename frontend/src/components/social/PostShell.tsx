import { ReactNode } from "react";

/**
 * Unified post layout used by every post type on Tuungane
 * (official, personal, service provider, business, community, opportunity, etc.).
 *
 * Order — matches Facebook/LinkedIn social conventions:
 *  1. Author header
 *  2. Category / context badge (optional)
 *  3. Title (optional)
 *  4. Message / caption (above the image)
 *  5. Media (preserves aspect ratio; tappable to full-screen)
 *  6. Meta row (location, category, etc. — optional)
 *  7. Extras slot (CTAs, safety note, etc. — optional)
 *  8. Engagement actions row
 */
export interface PostShellProps {
  header: ReactNode;
  categoryBadge?: ReactNode;
  title?: ReactNode;
  message?: ReactNode;
  media?: ReactNode;
  meta?: ReactNode;
  extras?: ReactNode;
  actions: ReactNode;
  className?: string;
  /** Optional accent ring (e.g. for pinned official posts). */
  accent?: "default" | "official" | "pinned";
}

export function PostShell({
  header,
  categoryBadge,
  title,
  message,
  media,
  meta,
  extras,
  actions,
  className = "",
  accent = "default",
}: PostShellProps) {
  const accentClass =
    accent === "pinned"
      ? "border-orange ring-1 ring-orange/40"
      : accent === "official"
      ? "border-orange/30"
      : "border-border";

  return (
    <article
      className={`overflow-hidden border-y bg-card shadow-[var(--shadow-card)] sm:rounded-2xl sm:border ${accentClass} ${className}`}
    >
      {/* 1. Header */}
      <header className="px-3 pt-3 sm:px-4 sm:pt-4">{header}</header>

      {/* 2. Category badge */}
      {categoryBadge && <div className="mt-2 px-3 sm:mt-3 sm:px-4">{categoryBadge}</div>}

      {/* 3. Title */}
      {title && <div className="mt-2 px-3 sm:px-4">{title}</div>}

      {/* 4. Message (above media) */}
      {message && <div className="mt-2 px-3 sm:px-4">{message}</div>}

      {/* 5. Media — full-bleed on mobile */}
      {media && <div className="mt-3 sm:px-4">{media}</div>}

      {/* 6. Meta */}
      {meta && <div className="mt-3 px-3 text-xs text-muted-foreground sm:px-4">{meta}</div>}

      {/* 7. Extras */}
      {extras && <div className="mt-3 px-3 sm:px-4">{extras}</div>}

      {/* 8. Engagement actions */}
      <div className="mt-3 border-t border-border px-3 py-2 sm:px-4">{actions}</div>
    </article>
  );
}
