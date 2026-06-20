import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Wallet, BadgeCheck, MessageSquare, Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { useCategory } from "@/hooks/use-categories";
import { requestStatusMap, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { NearYouBadge } from "@/components/NearYouBadge";
import type { UserLocation } from "@/lib/location";
import { formatSubcategory } from "@/lib/format-category";


export interface RequestRowLite extends ServiceRequestRow {
  response_count?: number;
  customer_name?: string | null;
  customer_verified?: boolean;
}

const urgencyLabel: Record<string, { label: string; tone: string }> = {
  emergency: { label: "Today", tone: "bg-orange/10 text-orange" },
  urgent: { label: "This week", tone: "bg-amber-100 text-amber-700" },
  normal: { label: "Flexible", tone: "bg-muted text-muted-foreground" },
};

function tidy(text?: string | null): string {
  if (!text) return "";
  let t = text.trim().replace(/\s+/g, " ");
  // common typo fix
  t = t.replace(/\bAd soon as possible\b/gi, "As soon as possible");
  // capitalize first letter
  if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

export function RequestCard({
  r,
  userLoc,
  currentUserId,
}: {
  r: RequestRowLite;
  userLoc?: UserLocation | null;
  currentUserId?: string | null;
}) {
  const cat = useCategory(r.category_slug ?? undefined);
  const status = requestStatusMap[r.status];
  const urgency = urgencyLabel[r.urgency] ?? urgencyLabel.normal;
  const title = tidy(r.title) || tidy(r.service_needed) || cat?.name || "Request";
  const description = tidy(r.description);
  const noResponses = (r.response_count ?? 0) === 0;
  const isOwner = !!currentUserId && currentUserId === r.customer_id;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition hover:border-orange hover:shadow-[var(--shadow-card)]">
      <Link to="/requests/$id" params={{ id: r.id }} className="block">
        <div className="flex flex-wrap items-center gap-1.5">
          {r.urgent_flag && (
            <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange">
              Urgent
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${urgency.tone}`}>
            {urgency.label}
          </span>
          {status && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.color}`}>
              {status.label}
            </span>
          )}
          {r.customer_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
              <BadgeCheck className="h-3 w-3" /> Verified
            </span>
          )}
          <NearYouBadge user={userLoc} target={r} />
          {isOwner && (
            <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
              Your request
            </span>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 font-display text-base font-bold text-navy">{title}</h3>
        {cat && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {cat.name}{r.subcategory ? ` · ${formatSubcategory(tidy(r.subcategory))}` : ""}
          </p>
        )}

        {description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-foreground/80">{description}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(r.town || r.district || r.location) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {r.town || r.district || r.location}
            </span>
          )}
          {r.budget_range && (
            <span className="inline-flex items-center gap-1 font-bold text-orange">
              <Wallet className="h-3 w-3" /> {r.budget_range}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {timeAgo(r.created_at)}
          </span>
          {typeof r.response_count === "number" && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {r.response_count} response{r.response_count === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {r.customer_name && !isOwner && (
            <p className="text-xs text-muted-foreground">Posted by {r.customer_name}</p>
          )}
          {noResponses && !isOwner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
              <Sparkles className="h-3 w-3" /> Be among the first to respond
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 flex gap-2">
        {isOwner ? (
          <>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="flex-1 rounded-full bg-navy px-4 py-2 text-center text-sm font-semibold text-navy-foreground hover:brightness-110"
            >
              Manage request
            </Link>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="rounded-full border border-border px-4 py-2 text-center text-sm font-semibold text-navy hover:border-navy"
            >
              View responses
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="flex-1 rounded-full bg-orange px-4 py-2 text-center text-sm font-semibold text-orange-foreground hover:brightness-110"
            >
              Respond
            </Link>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="rounded-full border border-border px-4 py-2 text-center text-sm font-semibold text-navy hover:border-navy"
            >
              View details
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
