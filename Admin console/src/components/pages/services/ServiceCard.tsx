import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Navigation, Check, BadgeCheck, Star, MapPin } from "lucide-react";
import { Avatar } from "@/components/social/Avatar";

export type ServiceCardProps = {
  id: string; // The service ID or profile ID depending on what's clicked
  profileSlug: string;
  coverUrl?: string | null;
  category: string;
  distanceKm?: number | null;
  avatarUrl?: string | null;
  providerName: string;
  isVerified: boolean;
  providerSubtitle?: string; // e.g., "EPRA Certified Tech • Westlands"
  title: string;
  rating: number;
  reviewCount: number;
  locationName: string;
  priceLabel?: string; // e.g. "Pricing", "Package", "Base Freight"
  priceAmount?: number | null;
  priceCurrency?: string | null;
  priceUnit?: string | null; // e.g., "/ setup", "/ hr"
  statusText?: string;
  statusDotColor?: string; // "bg-tertiary-fixed-dim" or similar
};

export function ServiceCard({
  id,
  profileSlug,
  coverUrl,
  category,
  distanceKm,
  avatarUrl,
  providerName,
  isVerified,
  providerSubtitle,
  title,
  rating,
  reviewCount,
  locationName,
  priceLabel = "Pricing",
  priceAmount,
  priceCurrency = "UGX",
  priceUnit,
  statusText = "Available today",
  statusDotColor = "bg-green-500",
}: ServiceCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group">
      <Link to="/p/$slug" params={{ slug: profileSlug }} className="relative h-44 w-full overflow-hidden bg-muted flex items-center justify-center">
        {coverUrl && !imgError ? (
          <img 
            src={coverUrl} 
            alt={title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex flex-col items-center justify-center text-muted-foreground group-hover:scale-105 transition-transform duration-300">
            <span className="text-4xl font-black opacity-20">{category ? category.charAt(0).toUpperCase() : "S"}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-50 text-center px-4">{category || "Service"}</span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-navy border border-border/50 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold shadow-sm tracking-wider">
          {category}
        </span>
        {distanceKm != null && (
          <span className="absolute top-3 right-3 bg-green-50 text-green-800 border border-green-200 text-[9px] uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold shadow-sm">
            <Navigation className="w-3 h-3" />
            {distanceKm.toFixed(1)} km
          </span>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Provider Meta Row */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="relative shrink-0">
              <Avatar name={providerName} url={avatarUrl} size={40} className="ring-2 ring-green-100" />
              {isVerified && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Link to="/p/$slug" params={{ slug: profileSlug }} className="font-semibold text-sm text-navy hover:underline truncate">
                  {providerName}
                </Link>
                {isVerified && <BadgeCheck className="w-4 h-4 text-green-500 shrink-0" title="Verified Provider" />}
              </div>
              {providerSubtitle && (
                <p className="text-xs text-muted-foreground truncate">{providerSubtitle}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <Link to="/service/$id" params={{ id: id }} className="block">
            <h4 className="font-bold text-navy leading-snug line-clamp-2 group-hover:text-orange transition-colors mb-2 text-[15px]">
              {title}
            </h4>
          </Link>

          {/* Reviews & Location */}
          <div className="flex items-center gap-2 text-xs mb-3 flex-wrap">
            <div className="flex items-center gap-0.5 text-orange font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground font-medium">({reviewCount} reviews)</span>
            <span className="text-border">•</span>
            <span className="text-muted-foreground font-medium flex items-center gap-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {locationName}
            </span>
          </div>
        </div>

        {/* Price & CTA Block */}
        <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">{priceLabel}</span>
            {priceAmount != null ? (
              <span className="font-extrabold text-navy text-sm">
                {priceCurrency} {priceAmount.toLocaleString()}
              </span>
            ) : (
              <span className="font-extrabold text-navy text-sm">Contact for price</span>
            )}
            {priceUnit && <span className="text-xs text-muted-foreground"> {priceUnit}</span>}
          </div>
          <Link 
            to="/service/$id" 
            params={{ id: id }}
            className="px-3.5 py-1.5 bg-orange hover:bg-orange/90 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1"
          >
            Request Service
          </Link>
        </div>
      </div>

      {/* Bottom Shelf Status */}
      <div className="bg-muted/30 px-4 py-2.5 border-t border-border flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
          <span className={`w-2 h-2 rounded-full ${statusDotColor} animate-pulse`}></span>
          {statusText}
        </span>
        <Link to="/service/$id" params={{ id: id }} className="text-orange font-semibold hover:underline">
          View details &rarr;
        </Link>
      </div>
    </article>
  );
}
