import { Building2, User, Sparkles, ClipboardList, BadgeCheck } from "lucide-react";
import type { IdentityStatus } from "@/lib/profile-badges";
import { identityLabel } from "@/lib/profile-badges";
import { organisationTypeLabel } from "@/data/organisationTypes";

interface Props {
  status: IdentityStatus | null;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Renders identity + activity badges. Nothing renders while status is null
 * so header layout stays stable on first paint.
 */
export function IdentityBadges({ status, className, size = "sm" }: Props) {
  if (!status) return null;
  const isInstitution = status.identity === "institution";
  const base =
    size === "md"
      ? "text-xs px-2.5 py-1"
      : "text-[11px] px-2 py-0.5";
  const chip = `inline-flex items-center gap-1 rounded-full font-medium ${base}`;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <span className={`${chip} bg-navy/10 text-navy`}>
        {isInstitution ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
        {identityLabel(status.identity)}
      </span>

      {isInstitution && status.organisationType && (
        <span className={`${chip} bg-muted text-muted-foreground`}>
          {organisationTypeLabel(status.organisationType)}
        </span>
      )}

      {status.offersServices && (
        <span className={`${chip} bg-green/10 text-green`}>
          <Sparkles className="h-3 w-3" />
          {isInstitution ? "Offers Services" : "Offers Services"}
        </span>
      )}

      {status.requester && (
        <span className={`${chip} bg-orange/10 text-orange`}>
          <ClipboardList className="h-3 w-3" />
          Requester
        </span>
      )}

      {status.verified && (
        <span className={`${chip} bg-green/10 text-green`}>
          <BadgeCheck className="h-3 w-3" />
          Verified
        </span>
      )}
    </div>
  );
}
