import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2, Target } from "lucide-react";
import { reverseGeocode, type ReverseGeocodeResult, type PrecisionInfo } from "@/lib/geocoding";

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number, lng: number, place: ReverseGeocodeResult | null) => void;
  className?: string;
};

// Default to Kampala when nothing is selected yet.
const FALLBACK: [number, number] = [0.3476, 32.5825];

/**
 * Small Leaflet map with a single draggable pin. On drag-end (or click)
 * we reverse-geocode the new position and bubble the result up.
 * Rendered client-side only — Leaflet touches `window`.
 */
export function MapPicker({
  latitude,
  longitude,
  onChange,
  className,
  collapsedHeight = 120,
  expandedHeight = 320,
}: Props & { collapsedHeight?: number; expandedHeight?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [precision, setPrecision] = useState<PrecisionInfo | null>(null);

  // Initialise Leaflet on mount (client-only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      LRef.current = L;

      // Fix the default marker icon URLs (Vite breaks the bundled paths).
      const icon = L.icon({
        iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const start: [number, number] =
        latitude != null && longitude != null ? [latitude, longitude] : FALLBACK;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(start, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(start, { draggable: true, icon }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;

      const handlePosition = async (lat: number, lng: number) => {
        marker.setLatLng([lat, lng]);
        const place = await reverseGeocode(lat, lng);
        onChange(lat, lng, place);
      };

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        handlePosition(lat, lng);
      });
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        handlePosition(e.latlng.lat, e.latlng.lng);
      });

      setMounted(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external coordinate changes (e.g. autocomplete pick or GPS) into the map.
  useEffect(() => {
    if (!mounted || latitude == null || longitude == null) return;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - latitude) < 1e-6 && Math.abs(current.lng - longitude) < 1e-6) return;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 14));
  }, [latitude, longitude, mounted]);

  // After height changes, Leaflet needs invalidateSize() to re-render tiles
  // and recenter on the pin so the user keeps context.
  useEffect(() => {
    if (!mounted) return;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map) return;
    const t = setTimeout(() => {
      map.invalidateSize();
      if (marker) map.setView(marker.getLatLng(), expanded ? Math.max(map.getZoom(), 15) : map.getZoom());
    }, 160);
    return () => clearTimeout(t);
  }, [expanded, mounted]);

  const height = expanded ? expandedHeight : collapsedHeight;

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height }}
          className="w-full overflow-hidden rounded-xl border border-border transition-[height] duration-200"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="absolute right-2 top-2 z-[400] inline-flex items-center gap-1 rounded-full border border-border bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-navy shadow hover:bg-background"
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {expanded ? "Collapse" : "Expand map"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {expanded
          ? "Drag the pin or tap the map to fine-tune your exact spot."
          : "Tap “Expand map” to drag the pin and fine-tune your spot."}
      </p>
    </div>
  );
}
