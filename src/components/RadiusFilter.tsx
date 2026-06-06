import { MapPin } from "lucide-react";

export const RADIUS_OPTIONS: { km: number | null; label: string }[] = [
  { km: null, label: "Any distance" },
  { km: 2, label: "2 km" },
  { km: 5, label: "5 km" },
  { km: 10, label: "10 km" },
  { km: 20, label: "20 km" },
  { km: 50, label: "50 km" },
];

export function RadiusFilter({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (km: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" /> Within
      </span>
      <select
        disabled={disabled}
        value={value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-60"
      >
        {RADIUS_OPTIONS.map((o) => (
          <option key={o.label} value={o.km === null ? "" : String(o.km)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
