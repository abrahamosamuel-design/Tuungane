import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserLocation } from "@/hooks/use-user-location";
import { AreaAutocomplete } from "@/components/AreaAutocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

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
  const { updateLocation } = useUserLocation();
  const [open, setOpen] = useState(false);

  if (disabled) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="group flex h-9 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-muted-foreground shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-orange/50 hover:bg-orange/5 hover:text-navy">
            <MapPin className="h-4 w-4 text-orange/70 transition-colors group-hover:text-orange" />
            <span>Set location to filter by distance</span>
          </button>
        </PopoverTrigger>
          <PopoverContent className="w-[300px] p-2" align="start">
            <AreaAutocomplete
              placeholder="Search your town or district..."
              onSelect={async (place) => {
                await updateLocation({
                  latitude: place.latitude,
                  longitude: place.longitude,
                  country: place.country,
                  region: place.region,
                  district: place.district,
                  town: place.town,
                  area: place.area,
                });
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
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
