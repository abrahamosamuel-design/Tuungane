import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const RADIUS_OPTIONS: { km: number | null; label: string }[] = [
  { km: null, label: "Any distance" },
  { km: 2, label: "2 km" },
  { km: 5, label: "5 km" },
  { km: 10, label: "10 km" },
  { km: 20, label: "20 km" },
  { km: 50, label: "50 km" },
];

const ANY = "__any__";

export function RadiusFilter({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (km: number | null) => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> Within
        </span>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 rounded-full border border-orange/40 bg-orange/5 px-3 py-1.5 text-xs font-semibold text-orange hover:bg-orange/10"
        >
          <MapPin className="h-3 w-3" />
          Add your location to filter by distance
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" /> Within
      </span>
      <Select
        value={value === null ? ANY : String(value)}
        onValueChange={(v) => onChange(v === ANY ? null : Number(v))}
      >
        <SelectTrigger className="h-8 w-auto rounded-full border-border bg-card px-3 py-1.5 text-xs font-semibold text-navy">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RADIUS_OPTIONS.map((o) => (
            <SelectItem
              key={o.label}
              value={o.km === null ? ANY : String(o.km)}
              className="text-xs font-semibold"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
