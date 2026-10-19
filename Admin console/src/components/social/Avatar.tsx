import { useState } from "react";
import {
  Wrench,
  Sparkles,
  Building2,
  Scissors,
  Truck,
  Car,
  GraduationCap,
  Camera,
  ChefHat,
  Laptop,
  HeartPulse,
  Sprout,
  MoreHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";
import { initials } from "@/lib/format";

const ICONS: Record<string, LucideIcon> = {
  "home-repair": Wrench,
  cleaning: Sparkles,
  "real-estate": Building2,
  beauty: Scissors,
  transport: Truck,
  automotive: Car,
  education: GraduationCap,
  events: Camera,
  food: ChefHat,
  digital: Laptop,
  health: HeartPulse,
  agriculture: Sprout,
  other: MoreHorizontal,
};

type Props = {
  name: string;
  url?: string | null;
  size?: number;
  /** Service category slug — used to pick a skill-based fallback icon when no photo. */
  categorySlug?: string | null;
  /** Optional business logo URL — used in fallback if no avatar photo. */
  businessLogoUrl?: string | null;
  /** Show a subtle green trust ring when a real photo is present. */
  verifiedRing?: boolean;
  className?: string;
};

/**
 * SmartAvatar — friendly, on-brand avatar with a polished fallback system.
 * Order of precedence: photo URL → business logo → skill icon → initials.
 * Designed so empty photo spaces never look plain or sad.
 */
export function Avatar({
  name,
  url,
  size = 40,
  categorySlug,
  businessLogoUrl,
  verifiedRing = false,
  className = "",
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const s = `${size}px`;
  const showPhoto = !!url && !imgFailed;

  if (showPhoto) {
    return (
      <img
        src={url!}
        alt={name}
        style={{ width: s, height: s }}
        onError={() => setImgFailed(true)}
        className={`rounded-full object-cover ${verifiedRing ? "ring-2 ring-green/60 ring-offset-1 ring-offset-background" : ""} ${className}`}
        loading="lazy"
      />
    );
  }

  if (businessLogoUrl) {
    return (
      <div
        style={{ width: s, height: s }}
        className={`flex items-center justify-center overflow-hidden rounded-full bg-card border border-border ${className}`}
      >
        <img src={businessLogoUrl} alt={name} className="h-full w-full object-contain p-1" loading="lazy" />
      </div>
    );
  }

  const Icon = (categorySlug && ICONS[categorySlug]) || null;
  const iconSize = Math.max(14, Math.round(size * 0.42));

  return (
    <div
      style={{ width: s, height: s }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy via-navy to-orange text-white font-semibold ${className}`}
      aria-label={name}
    >
      {Icon ? (
        <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={2.25} />
      ) : name ? (
        <span style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}>{initials(name)}</span>
      ) : (
        <User style={{ width: iconSize, height: iconSize }} />
      )}
    </div>
  );
}
