import { MapPin } from "lucide-react";
import { proximityLabel, type TargetLocation, type UserLocation } from "@/lib/location";

export function NearYouBadge({
  user,
  target,
  className = "",
}: {
  user: UserLocation | null | undefined;
  target: TargetLocation | null | undefined;
  className?: string;
}) {
  const label = proximityLabel(user ?? null, target ?? null);
  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green ${className}`}
    >
      <MapPin className="h-3 w-3" /> {label}
    </span>
  );
}
