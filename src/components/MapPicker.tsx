import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { reverseGeocode, type ReverseGeocodeResult } from "@/lib/geocoding";

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number, lng: number, place: ReverseGeocodeResult | null) => void;
  className?: string;
  height?: number;
};

// Default to Kampala when nothing is selected yet.
const FALLBACK: [number, number] = [0.3476, 32.5825];

/**
 * Small Leaflet map with a single draggable pin. On drag-end (or click)
 * we reverse-geocode the new position and bubble the result up.
 * Rendered client-side only — Leaflet touches `window`.
 */
export function MapPicker({ latitude, longitude, onChange, className, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const [mounted, setMounted] = useState(false);

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
    // We only want to initialise once.
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

  return (
    <div className={className}>
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-xl border border-border"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Drag the pin or tap the map to fine-tune your exact spot.
      </p>
    </div>
  );
}
