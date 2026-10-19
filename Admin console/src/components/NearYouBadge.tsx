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
      className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-green/10 px-1.5 py-0 text-[10px] font-medium leading-4 text-green ${className}`}
    >
      <MapPin className="h-2.5 w-2.5" /> {label}
    </span>
  );
}
