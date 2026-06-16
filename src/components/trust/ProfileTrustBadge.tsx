// Self-fetching trust badge for a single profile. Use for one-off cards.
// For lists, prefer batching via useTrustBadges to reduce queries.
import { TrustBadge } from "./TrustBadge";
import { useTrustBadge, type ProfileKind } from "@/hooks/use-trust-badges";

export function ProfileTrustBadge({
  kind,
  id,
  className,
}: {
  kind: ProfileKind;
  id: string | null | undefined;
  className?: string;
}) {
  const { level } = useTrustBadge(kind, id);
  if (!id || !level) return null;
  return <TrustBadge level={level} className={className} />;
}
