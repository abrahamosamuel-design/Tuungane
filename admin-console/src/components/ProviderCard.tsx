import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Star, Sparkles } from "lucide-react";
import type { Provider } from "@/data/providers";
import { formatSubcategory } from "@/lib/format-category";
import { Avatar } from "@/components/social/Avatar";
import { ExpandableText } from "@/components/feed/ExpandableText";

export function ProviderCard({ p }: { p: Provider }) {
  return (
    <Link
      to="/providers/$id"
      params={{ id: p.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-start gap-4 p-5">
        <Avatar
          name={p.businessName ?? p.name}
          categorySlug={p.categorySlug}
          size={56}
          verifiedRing={p.verified === "verified" || p.verified === "featured"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-semibold text-navy">
              {p.businessName ?? p.name}
            </h3>
            {p.verified === "verified" && <BadgeCheck className="h-4 w-4 shrink-0 text-green" />}
            {p.verified === "featured" && <Sparkles className="h-4 w-4 shrink-0 text-orange" />}
          </div>
          <p className="text-sm text-muted-foreground">{formatSubcategory(p.subcategory)}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.town}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-orange text-orange" />{p.rating} ({p.reviewsCount})</span>
          </div>
        </div>
      </div>
      {p.bio && <ExpandableText text={p.bio} clampLines={3} maxLines={8} className="px-5 text-foreground/70" />}
      <div className="mt-4 flex items-center justify-between border-t border-border bg-surface px-5 py-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${p.availability === "Available now" ? "text-green" : "text-muted-foreground"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${p.availability === "Available now" ? "bg-green" : "bg-muted-foreground"}`} />
          {p.availability}
        </span>
        <span className="text-xs font-semibold text-orange transition group-hover:underline">View profile →</span>
      </div>
    </Link>
  );
}
