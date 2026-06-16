// Public-facing trust badge. Maps trust_level enum to label + color tokens.

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

function tone(level: TrustLevel) {
  if (level === "suspended") return "bg-destructive/10 text-destructive border-destructive/20";
  if (level === "under_review") return "bg-orange/10 text-orange border-orange/20";
  if (level === "verified_provider" || level === "verified_business" || level === "verified_organization")
    return "bg-green/10 text-green border-green/30";
  if (level === "reviewed_provider") return "bg-green/5 text-green border-green/20";
  if (level === "profile_complete") return "bg-navy/10 text-navy border-navy/20";
  if (level === "phone_verified") return "bg-navy/5 text-navy border-navy/15";
  return "bg-muted text-muted-foreground border-border";
}

export function TrustBadge({
  level,
  prefix,
  className = "",
}: {
  level: TrustLevel | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const l: TrustLevel = level ?? "new";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone(l)} ${className}`}
    >
      {prefix ? <span className="opacity-70">{prefix}·</span> : null}
      {TRUST_LABEL[l]}
    </span>
  );
}
