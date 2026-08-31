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
      className={`bg-card shadow-none sm:shadow-sm sm:rounded-3xl ${accent !== "default" ? accentClass : ""} ${className}`}
    >
      {/* 1. Header */}
      <header className="px-4 pt-4 sm:px-5 sm:pt-5">{header}</header>

      {/* 2. Category badge */}
      {categoryBadge && <div className="mt-3 px-4 sm:px-5">{categoryBadge}</div>}

      {/* 3. Title */}
      {title && <div className="mt-3 px-4 sm:px-5">{title}</div>}

      {/* 4. Message (above media) */}
      {message && <div className="mt-3 px-4 sm:px-5">{message}</div>}

      {/* 5. Media — full-bleed on mobile */}
      {media && <div className="mt-4 sm:px-5">{media}</div>}

      {/* 6. Meta */}
      {meta && <div className="mt-4 px-4 text-xs text-muted-foreground sm:px-5">{meta}</div>}

      {/* 7. Extras */}
      {extras && <div className="mt-4 px-4 sm:px-5">{extras}</div>}

      {/* 8. Engagement actions */}
      <div className="mt-4 px-4 pb-4 sm:px-5 sm:pb-5">{actions}</div>
    </article>
  );
}
