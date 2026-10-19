import { Link } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";

export type OpportunityType = "need_service" | "job_request" | "hiring";

export interface OpportunityItem {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  location: string;
  date: string;
  author: {
     name: string;
     avatar_url?: string;
     type: "Individual" | "Business";
  };
  originalData: any;
}

export function OpportunityCard({ item }: { item: OpportunityItem }) {
  let link = `/opportunities/${item.id}`;
  if (item.type === "need_service") link = `/service/${item.id}`;

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
      return `Posted ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) return `Posted ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Posted ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const tags = [];
  if (item.type === "need_service") tags.push("Need a Service");
  if (item.type === "hiring") tags.push("Hiring");
  if (item.type === "job_request") tags.push("Looking for a Job");
  
  if (item.originalData?.category_slug) {
    const cat = String(item.originalData.category_slug);
    tags.push(cat.charAt(0).toUpperCase() + cat.slice(1));
  }
  if (item.location) tags.push(item.location);

  let priceValue = "";
  let priceLabel = "";
  let ctaText = "";

  if (item.type === "need_service") {
    ctaText = "Offer Service";
    if (item.originalData?.budget) {
      const b = item.originalData.budget;
      priceValue = isNaN(Number(b)) ? b : `UGX ${Number(b).toLocaleString()}`;
      priceLabel = "Budget";
    }
  } else if (item.type === "hiring") {
    ctaText = "Apply now";
    if (item.originalData?.salary) {
      const s = item.originalData.salary;
      priceValue = isNaN(Number(s)) ? s : `UGX ${Number(s).toLocaleString()}`;
      priceLabel = "Salary";
    }
  } else if (item.type === "job_request") {
    ctaText = "Hire Me";
    if (item.originalData?.expectations || item.originalData?.salary_expectation) {
      const e = item.originalData.expectations || item.originalData.salary_expectation;
      priceValue = isNaN(Number(e)) ? e : `UGX ${Number(e).toLocaleString()}`;
      priceLabel = "Expectation";
    }
  }

  return (
    <Link to={link} className="block w-full overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow relative">
      {/* Top Section (White) */}
      <div className="p-5 sm:p-6 pb-6">
        {/* Header: Author & Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 overflow-hidden rounded-full bg-muted shrink-0 shadow-sm border border-border/50">
              {item.author.avatar_url ? (
                <img src={item.author.avatar_url} alt={item.author.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-navy text-white font-bold text-lg">
                  {item.author.name?.charAt(0).toUpperCase() || "A"}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-[15px] sm:text-[17px] font-bold text-navy leading-none">
                {item.author.name || "Anonymous"}
              </h4>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-1.5">
                {timeAgo(item.date)}
              </p>
            </div>
          </div>
          <button className="p-2 text-muted-foreground hover:text-navy transition-colors rounded-full hover:bg-muted/50 -mr-2" onClick={(e) => { e.preventDefault(); }}>
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Tags */}
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <span key={idx} className="rounded-full bg-green/10 px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-green tracking-wide">
              {tag}
            </span>
          ))}
        </div>

        {/* Title & Description */}
        <div className="mt-5">
          <h3 className="font-display text-lg sm:text-[22px] font-bold leading-tight text-navy">
            {item.title}
          </h3>
          <p className="mt-2.5 text-[13px] sm:text-[15px] font-medium text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Bottom Section (Light Gray) */}
      <div className="bg-muted/40 p-5 sm:p-6 border-t border-border/50">
        {/* Pricing Info (if available) */}
        {priceValue && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] sm:text-[26px] font-display font-black text-orange tracking-tight">{priceValue}</span>
            </div>
            {priceLabel && (
              <span className="rounded-full bg-card px-4 py-1.5 text-[12px] sm:text-[13px] font-bold text-navy shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-border/50">
                {priceLabel}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className={`flex w-full items-center justify-center rounded-[1rem] bg-navy py-4 text-[14px] sm:text-[15px] font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-sm ${!priceValue ? 'mt-1' : ''}`}>
          {ctaText}
        </div>
      </div>
    </Link>
  );
}
