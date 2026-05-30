import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Calendar, Briefcase } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { getCategory } from "@/data/categories";

export interface OpportunityRow {
  id: string;
  title: string;
  opportunity_type: string;
  category_slug: string;
  subcategory: string | null;
  location: string;
  description: string;
  compensation: string | null;
  deadline: string | null;
  status: string;
  is_featured: boolean;
  poster_type: string;
  created_at: string;
  poster_id: string;
  author?: { full_name: string; avatar_url: string | null } | null;
}

const typeColor: Record<string, string> = {
  gig: "bg-orange/10 text-orange",
  job: "bg-navy/10 text-navy",
  internship: "bg-green/10 text-green",
  volunteer: "bg-purple-100 text-purple-700",
  apprenticeship: "bg-blue-100 text-blue-700",
};

export function OpportunityCard({ o }: { o: OpportunityRow }) {
  const cat = getCategory(o.category_slug);
  return (
    <Link
      to="/opportunities/$id"
      params={{ id: o.id }}
      className="block rounded-2xl border border-border bg-card p-5 transition hover:border-orange hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeColor[o.opportunity_type] ?? "bg-muted text-foreground"}`}>{o.opportunity_type}</span>
            {o.is_featured && <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange"><BadgeCheck className="h-3 w-3" /> Featured</span>}
          </div>
          <h3 className="mt-2 line-clamp-2 font-display text-base font-bold text-navy">{o.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            <Briefcase className="mr-1 inline h-3 w-3" />{cat?.name ?? o.category_slug}{o.subcategory ? ` · ${o.subcategory}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{o.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.location || "—"}</span>
        {o.deadline && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> by {new Date(o.deadline).toLocaleDateString()}</span>}
        <span>{timeAgo(o.created_at)}</span>
        {o.compensation && <span className="font-semibold text-navy">{o.compensation}</span>}
      </div>
    </Link>
  );
}
