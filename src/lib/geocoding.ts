// Reverse geocoding via OpenStreetMap Nominatim.
// Free, no API key. Subject to ~1 req/sec fair-use; we only call on user gesture.
import type { UserLocation } from "@/lib/location";

type NominatimAddress = {
  country?: string;
  country_code?: string;
  state?: string;
  region?: string;
  state_district?: string;
  county?: string;
  municipality?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
};

type NominatimResponse = {
  address?: NominatimAddress;
  display_name?: string;
  boundingbox?: [string, string, string, string]; // [min_lat, max_lat, min_lon, max_lon]
  class?: string;
  type?: string;
};

export type PrecisionInfo = {
  radiusMeters: number;
  label: string;
  confidence: "high" | "medium" | "low";
};

export type ReverseGeocodeResult = Pick<
  UserLocation,
  "country" | "region" | "district" | "city" | "town" | "area"
> & {
  display_name?: string;
  precision?: PrecisionInfo;
};


const cleanText = (s?: string | null) => (s ?? "").trim() || null;

function mapAddress(addr: NominatimAddress): ReverseGeocodeResult {
  // Uganda admin hierarchy in OSM: country → state (region) → county (district) → town/village → suburb (area)
  const district = cleanText(addr.county ?? addr.state_district ?? addr.city_district);
  const town = cleanText(addr.city ?? addr.town ?? addr.municipality ?? addr.village ?? addr.hamlet);
  const area = cleanText(addr.suburb ?? addr.neighbourhood ?? addr.quarter);
  return {
    country: cleanText(addr.country),
    region: cleanText(addr.state ?? addr.region),
    district,
    city: cleanText(addr.city),
    town,
    area,
  };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "16"); // suburb-level
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as NominatimResponse;
    if (!json.address) return null;
    return { ...mapAddress(json.address), display_name: json.display_name };
  } catch {
    return null;
  }
}

export type PlaceSuggestion = ReverseGeocodeResult & {
  display_name: string;
  latitude: number;
  longitude: number;
  place_id: string;
};

type NominatimSearchItem = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
};

/**
 * Forward geocoding via Nominatim. Returns up to 5 suggestions, biased to Uganda.
 * Caller is responsible for debouncing — Nominatim's fair-use is ~1 req/sec.
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", q);
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "ug");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) return [];
    const items = (await res.json()) as NominatimSearchItem[];
    return items.map((it) => ({
      ...mapAddress(it.address ?? {}),
      display_name: it.display_name,
      latitude: parseFloat(it.lat),
      longitude: parseFloat(it.lon),
      place_id: String(it.place_id),
    }));
  } catch {
    return [];
  }
}
