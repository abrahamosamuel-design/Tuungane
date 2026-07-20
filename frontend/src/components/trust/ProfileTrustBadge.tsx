// Self-fetching trust badge for a single profile. Use for one-off cards.
// For lists, prefer batching via useTrustBadges to reduce queries.
import { TrustBadge, type TrustLevel } from "./TrustBadge";
import { useTrustBadge, type ProfileKind } from "@/hooks/use-trust-badges";

export function ProfileTrustBadge({
  kind,
  id,
  size,
  descriptive,
  className,
  prefetchedLevel,
}: {
  kind: ProfileKind;
  id: string | null | undefined;
  size?: "sm" | "md";
  descriptive?: boolean;
  className?: string;
  prefetchedLevel?: TrustLevel | null;
}) {
  const { level } = useTrustBadge(kind, prefetchedLevel ? null : id);
  const finalLevel = prefetchedLevel ?? level;
  if (!id || !finalLevel) return null;
  return <TrustBadge level={finalLevel} size={size} descriptive={descriptive} className={className} />;
}
