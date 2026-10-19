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

// [minLat, maxLat, minLon, maxLon]
export type Bounds = [number, number, number, number];

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
  bounds?: Bounds;
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

function parseBbox(bbox?: [string, string, string, string]): Bounds | undefined {
  if (!bbox) return undefined;
  const n = bbox.map(Number) as Bounds;
  if (n.some((v) => Number.isNaN(v))) return undefined;
  return n;
}

/**
 * Approximate metres between two lat/lon points using the haversine formula.
 */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function boundsRadiusM(b: Bounds): number {
  const [minLat, maxLat, minLon, maxLon] = b;
  const h = haversineM(minLat, minLon, minLat, maxLon);
  const v = haversineM(minLat, minLon, maxLat, minLon);
  return Math.sqrt(h * h + v * v) / 2;
}

function pointInBounds(lat: number, lon: number, b: Bounds): boolean {
  const [minLat, maxLat, minLon, maxLon] = b;
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}

function labelFor(radius: number): string {
  if (radius < 1000) return `~${Math.max(50, Math.round(radius / 10) * 10)} m`;
  return `~${Math.round(radius / 100) / 10} km`;
}

function computePrecision(
  bbox?: [string, string, string, string],
  osmType?: string,
  districtBounds?: Bounds,
  lat?: number,
  lon?: number,
): PrecisionInfo | undefined {
  let radius: number | undefined;
  if (bbox) {
    const parsed = parseBbox(bbox)!;
    radius = boundsRadiusM(parsed);
    // If Nominatim returned a bbox larger than the district, clamp to district radius.
    if (districtBounds) {
      const dRadius = boundsRadiusM(districtBounds);
      if (radius > dRadius) radius = dRadius;
    }
  } else {
    const fine = new Set(["house", "building", "residential", "suburb", "neighbourhood", "quarter"]);
    const medium = new Set(["village", "hamlet", "town", "municipality", "city_district"]);
    const coarse = new Set(["city", "county", "state_district", "district"]);
    if (fine.has(osmType ?? "")) radius = 500;
    else if (medium.has(osmType ?? "")) radius = 3000;
    else if (coarse.has(osmType ?? "")) radius = 25000;
  }
  if (radius == null) return undefined;

  // Confidence: tighter if inside known district bounds.
  const inside = districtBounds && lat != null && lon != null
    ? pointInBounds(lat, lon, districtBounds)
    : true;
  let confidence: PrecisionInfo["confidence"];
  if (radius < 1500 && inside) confidence = "high";
  else if (radius < 8000 && inside) confidence = "medium";
  else if (radius < 30000) confidence = inside ? "medium" : "low";
  else confidence = "low";

  return { radiusMeters: Math.round(radius), label: labelFor(radius), confidence };
}

export type ReverseGeocodeOptions = {
  /** When supplied, refines the estimated radius and confidence using the
   *  selected district bounds (e.g. when the user picked a district first). */
  bounds?: Bounds;
};

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  options?: ReverseGeocodeOptions,
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
    return {
      ...mapAddress(json.address),
      display_name: json.display_name,
      bounds: parseBbox(json.boundingbox),
      precision: computePrecision(json.boundingbox, json.type, options?.bounds, latitude, longitude),
    };
  } catch {
    return null;
  }
}

export type PlaceSuggestion = ReverseGeocodeResult & {
  display_name: string;
  latitude: number;
  longitude: number;
  place_id: string;
  bounds?: Bounds;
};

type NominatimSearchItem = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
  boundingbox?: [string, string, string, string];
};

export type SearchPlacesOptions = {
  /** Restrict results to within these bounds (e.g. the user's selected district). */
  bounds?: Bounds;
  /** When true with `bounds`, hard-restrict (Nominatim `bounded=1`). */
  strict?: boolean;
};

/**
 * Forward geocoding via Nominatim. Returns up to 5 suggestions, biased to Uganda.
 * Caller is responsible for debouncing — Nominatim's fair-use is ~1 req/sec.
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  options?: SearchPlacesOptions,
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
    if (options?.bounds) {
      const [minLat, maxLat, minLon, maxLon] = options.bounds;
      // Nominatim viewbox order: left,top,right,bottom (lon,lat,lon,lat)
      url.searchParams.set("viewbox", `${minLon},${maxLat},${maxLon},${minLat}`);
      if (options.strict) url.searchParams.set("bounded", "1");
    }
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
      bounds: parseBbox(it.boundingbox),
    }));
  } catch {
    return [];
  }
}

// In-memory cache of district name → bounds to avoid hammering Nominatim.
const districtBoundsCache = new Map<string, Bounds | null>();

/**
 * Look up the bounding box of a Uganda district by name. Cached.
 * Returns null when the district can't be resolved.
 */
export async function findDistrictBounds(
  districtName: string,
  signal?: AbortSignal,
): Promise<Bounds | null> {
  const key = districtName.trim().toLowerCase();
  if (!key) return null;
  if (districtBoundsCache.has(key)) return districtBoundsCache.get(key) ?? null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", `${districtName}, Uganda`);
    url.searchParams.set("countrycodes", "ug");
    url.searchParams.set("limit", "1");
    url.searchParams.set("featuretype", "settlement");
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
    if (!res.ok) {
      districtBoundsCache.set(key, null);
      return null;
    }
    const items = (await res.json()) as NominatimSearchItem[];
    const bounds = parseBbox(items[0]?.boundingbox) ?? null;
    districtBoundsCache.set(key, bounds);
    return bounds;
  } catch {
    return null;
  }
}
