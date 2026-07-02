import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Wallet, BadgeCheck, MessageSquare, Send, Sparkles, MoreHorizontal, Pencil } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { useCategory } from "@/hooks/use-categories";
import { requestStatusMap, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { NearYouBadge } from "@/components/NearYouBadge";
import type { UserLocation } from "@/lib/location";
import { formatSubcategory } from "@/lib/format-category";
import { FeedAvatar } from "@/components/feed/FeedAvatar";
import { ExpandableText } from "@/components/feed/ExpandableText";
import { MediaGrid } from "@/components/feed/MediaGrid";

export interface RequestRowLite extends ServiceRequestRow {
  response_count?: number;
  customer_name?: string | null;
  customer_avatar_url?: string | null;
  customer_verified?: boolean;
  posted_as_type?: string | null;
  posted_as_name?: string | null;
  posted_as_avatar_url?: string | null;
  posted_as_ref_type?: string | null;
  posted_as_ref_id?: string | null;
}


const urgencyLabel: Record<string, { label: string; tone: string }> = {
  emergency: { label: "Today", tone: "bg-orange/15 text-orange" },
  urgent: { label: "This week", tone: "bg-amber-100 text-amber-700" },
  normal: { label: "Flexible", tone: "bg-green/15 text-green" },
};

function tidy(text?: string | null): string {
  if (!text) return "";
  let t = text.trim().replace(/[ \t]+/g, " ");
  t = t.replace(/\bAd soon as possible\b/gi, "As soon as possible");
  if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

/**
 * Feed-style service request card.
 *
 * Layout follows a modern social-feed pattern:
 *   - Avatar + name + meta on top
 *   - Title + expandable description
 *   - Chip row with category / budget / preferred time
 *   - 1–4 photo grid when attachments exist
 *   - Action row: primary "Respond / Send quote", secondary message + view
 */
export function RequestCard({
  r,
  userLoc,
  currentUserId,
  onRespond,
  onEdit,
}: {
  r: RequestRowLite;
  userLoc?: UserLocation | null;
  currentUserId?: string | null;
  onRespond?: () => void;
  onEdit?: () => void;
}) {
  const cat = useCategory(r.category_slug ?? undefined);
  const status = requestStatusMap[r.status];
  const urgency = urgencyLabel[r.urgency] ?? urgencyLabel.normal;
  const title = tidy(r.title) || tidy(r.service_needed) || cat?.name || "Request";
  const description = tidy(r.description);
  const isOwner = !!currentUserId && currentUserId === r.customer_id;
  const isBusinessPost = r.posted_as_type === "business" && !!r.posted_as_name;
  const requesterName = isBusinessPost
    ? (r.posted_as_name as string)
    : (r.customer_name?.trim() || "A neighbour");
  const requesterAvatar = isBusinessPost
    ? (r.posted_as_avatar_url ?? null)
    : (r.customer_avatar_url ?? null);
  const loc = r.area || r.town || r.district || r.location || "Uganda";
  const media = Array.isArray(r.media_urls) && r.media_urls.length > 0
    ? r.media_urls
    : r.attachment_url
      ? [r.attachment_url]
      : [];


  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:border-orange/60">
      {/* Header row — avatar / name / meta */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Link to="/requests/$id" params={{ id: r.id }} className="shrink-0">
          <FeedAvatar src={requesterAvatar} name={requesterName} size={44} ring={!!r.customer_verified && !isBusinessPost} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate text-[14px] font-semibold text-navy">{requesterName}</span>
            {r.customer_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-green" aria-label="Verified" />}
            <span className="text-muted-foreground">·</span>
            <span className="text-[12px] text-muted-foreground">{timeAgo(r.created_at)}</span>
          </div>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {loc}
            <NearYouBadge user={userLoc} target={r} />
          </p>
        </div>
        {!isOwner && (
          <button
            type="button"
            aria-label="More options"
            className="hidden shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-navy sm:inline-flex"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status / urgency chips */}
      <div className="flex flex-wrap items-center gap-1.5 px-4">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${urgency.tone}`}>
          {urgency.label}
        </span>
        {r.urgent_flag && (
          <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange">
            Urgent
          </span>
        )}
        {status && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.color}`}>
            {status.label}
          </span>
        )}
        {isOwner && (
          <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
            Your request
          </span>
        )}
      </div>

      {/* Title + body */}
      <Link to="/requests/$id" params={{ id: r.id }} className="block px-4 pt-2">
        <h3 className="font-display text-base font-bold leading-snug text-navy">{title}</h3>
        {cat && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {cat.name}{r.subcategory ? ` · ${formatSubcategory(tidy(r.subcategory))}` : ""}
          </p>
        )}
        {description && <ExpandableText text={description} clampLines={3} maxLines={8} className="mt-2" />}
      </Link>

      {/* Media grid */}
      {media.length > 0 && (
        <div className="px-4">
          <MediaGrid urls={media} alt={title} />
        </div>
      )}

      {/* Meta chip row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 text-xs text-muted-foreground">
        {r.budget_range && (
          <span className="inline-flex items-center gap-1 font-bold text-orange">
            <Wallet className="h-3 w-3" /> {r.budget_range}
          </span>
        )}
        {(r.preferred_date || r.preferred_time) && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {r.preferred_date || ""}{r.preferred_date && r.preferred_time ? " · " : ""}{r.preferred_time || ""}
          </span>
        )}
        {typeof r.response_count === "number" && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {r.response_count} response{r.response_count === 1 ? "" : "s"}
          </span>
        )}
        {(r.response_count ?? 0) === 0 && !isOwner && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
            <Sparkles className="h-3 w-3" /> Be among the first to respond
          </span>
        )}
      </div>

      {/* Action row */}
      <div className={`mt-3 grid ${isOwner ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_auto]"} items-stretch gap-2 border-t border-border bg-surface px-3 py-2.5 sm:px-4`}>
        {isOwner ? (
          <>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-navy px-4 text-sm font-semibold text-navy-foreground hover:brightness-110"
            >
              <span>Manage request</span>
              {typeof r.response_count === "number" && r.response_count > 0 && (
                <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold text-orange-foreground">
                  {r.response_count}
                </span>
              )}
            </Link>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-xs font-semibold text-navy hover:border-navy"
              >
                Edit
              </button>
            )}
          </>

        ) : (
          <>
            {onRespond ? (
              <button
                type="button"
                onClick={onRespond}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-orange px-4 text-sm font-semibold text-orange-foreground hover:brightness-110"
              >
                <Send className="h-4 w-4" /> Send quote
              </button>
            ) : (
              <Link
                to="/requests/$id"
                params={{ id: r.id }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-orange px-4 text-sm font-semibold text-orange-foreground hover:brightness-110"
              >
                <Send className="h-4 w-4" /> Send quote
              </Link>
            )}
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-navy hover:border-navy"
              aria-label="Message requester"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Message</span>
            </Link>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-navy hover:border-navy"
            >
              View
            </Link>
          </>
        )}

      </div>
    </article>
  );
}
