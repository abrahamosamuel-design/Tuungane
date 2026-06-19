// Trust badge. Two display variants:
// - "public" (default): collapses 9 internal levels into 4 user-facing tiers
//   (New, Active, Reviewed, Verified) with a subtype icon for the verified kind.
//   `under_review` shows for owner/admin only; `suspended` should be filtered
//   out of public lists upstream — we still render it defensively as a red pill.
// - "internal": full 9-label set for admin/moderator surfaces.

import { User, Briefcase, Building2 } from "lucide-react";

export type TrustLevel =
  | "new"
  | "phone_verified"
  | "profile_complete"
  | "reviewed_provider"
  | "verified_provider"
  | "verified_business"
  | "verified_organization"
  | "under_review"
  | "suspended";

export const TRUST_LABEL: Record<TrustLevel, string> = {
  new: "New Profile",
  phone_verified: "Phone Verified",
  profile_complete: "Profile Complete",
  reviewed_provider: "Reviewed Provider",
  verified_provider: "Verified Provider",
  verified_business: "Verified Business",
  verified_organization: "Verified Organization",
  under_review: "Under Review",
  suspended: "Suspended",
};

type PublicTier = "new" | "active" | "reviewed" | "verified" | "under_review" | "suspended";

function toPublicTier(level: TrustLevel): PublicTier {
  if (level === "suspended" || level === "under_review") return level;
  if (level === "verified_provider" || level === "verified_business" || level === "verified_organization") return "verified";
  if (level === "reviewed_provider") return "reviewed";
  if (level === "profile_complete") return "active";
  return "new"; // new + phone_verified
}

const PUBLIC_LABEL: Record<PublicTier, string> = {
  new: "New",
  active: "Active",
  reviewed: "Reviewed",
  verified: "Verified",
  under_review: "Under Review",
  suspended: "Suspended",
};

function publicTone(tier: PublicTier) {
  switch (tier) {
    case "suspended": return "bg-destructive/10 text-destructive border-destructive/20";
    case "under_review": return "bg-orange/10 text-orange border-orange/20";
    case "verified": return "bg-green/10 text-green border-green/30";
    case "reviewed": return "bg-green/5 text-green border-green/20";
    case "active": return "bg-navy/10 text-navy border-navy/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function internalTone(level: TrustLevel) {
  if (level === "suspended") return "bg-destructive/10 text-destructive border-destructive/20";
  if (level === "under_review") return "bg-orange/10 text-orange border-orange/20";
  if (level === "verified_provider" || level === "verified_business" || level === "verified_organization")
    return "bg-green/10 text-green border-green/30";
  if (level === "reviewed_provider") return "bg-green/5 text-green border-green/20";
  if (level === "profile_complete") return "bg-navy/10 text-navy border-navy/20";
  if (level === "phone_verified") return "bg-navy/5 text-navy border-navy/15";
  return "bg-muted text-muted-foreground border-border";
}

function verifiedIcon(level: TrustLevel) {
  if (level === "verified_business") return Briefcase;
  if (level === "verified_organization") return Building2;
  if (level === "verified_provider") return User;
  return null;
}

export function TrustBadge({
  level,
  prefix,
  variant = "public",
  className = "",
}: {
  level: TrustLevel | null | undefined;
  prefix?: string;
  variant?: "public" | "internal";
  className?: string;
}) {
  const l: TrustLevel = level ?? "new";
  if (variant === "internal") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${internalTone(l)} ${className}`}
      >
        {prefix ? <span className="opacity-70">{prefix}·</span> : null}
        {TRUST_LABEL[l]}
      </span>
    );
  }
  const tier = toPublicTier(l);
  const Icon = tier === "verified" ? verifiedIcon(l) : null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${publicTone(tier)} ${className}`}
    >
      {prefix ? <span className="opacity-70">{prefix}·</span> : null}
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {PUBLIC_LABEL[tier]}
    </span>
  );
}
