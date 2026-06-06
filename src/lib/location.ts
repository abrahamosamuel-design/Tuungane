// Proximity ranking helpers. Phase 1: text-hierarchy first, lat/lng when both sides have it.

export type UserLocation = {
  country?: string | null;
  region?: string | null;
  district?: string | null;
  city?: string | null;
  town?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_visibility?: "area" | "town" | "district" | "hidden" | null;
};

export type TargetLocation = {
  country?: string | null;
  region?: string | null;
  district?: string | null;
  town?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Optional provider service radius — boosts the score if user is within reach.
  service_radius_km?: number | null;
  // Optional: places this target also serves (e.g. provider areas_served).
  areas_served?: string[] | null;
};

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export function haversineKm(
  a: { latitude?: number | null; longitude?: number | null },
  b: { latitude?: number | null; longitude?: number | null },
): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Returns a proximity score 0–100 (higher = closer). Returns 0 when nothing matches.
 */
export function proximityScore(user: UserLocation | null | undefined, target: TargetLocation | null | undefined): number {
  if (!user || !target) return 0;
  const km = haversineKm(user, target);
  if (km != null) {
    if (km < 1) return 100;
    if (km < 3) return 92;
    if (km < 5) return 85;
    if (km < 10) return 75;
    if (km < 20) return 65;
    if (km < 50) return 50;
    if (km < 150) return 35;
    if (km < 500) return 22;
    return 10;
  }
  const u = {
    country: norm(user.country),
    region: norm(user.region),
    district: norm(user.district),
    town: norm(user.town || user.city),
    area: norm(user.area),
  };
  const t = {
    country: norm(target.country),
    region: norm(target.region),
    district: norm(target.district),
    town: norm(target.town),
    area: norm(target.area),
  };

  // Provider-style "areas served" coverage of user's town/area.
  const served = (target.areas_served ?? []).map(norm).filter(Boolean);
  if (u.town && served.includes(u.town)) return 80;
  if (u.area && served.includes(u.area)) return 80;

  if (u.area && t.area && u.area === t.area) return 95;
  if (u.town && t.town && u.town === t.town) return 80;
  if (u.district && t.district && u.district === t.district) return 55;
  if (u.region && t.region && u.region === t.region) return 35;
  if (u.country && t.country && u.country === t.country) return 20;
  return 0;
}

export function proximityLabel(user: UserLocation | null | undefined, target: TargetLocation | null | undefined): string | null {
  if (!user || !target) return null;
  const km = haversineKm(user, target);
  if (km != null) {
    if (km < 1) return "In your area";
    if (km < 10) return `${km.toFixed(1)} km away`;
    if (km < 100) return `${Math.round(km)} km away`;
    return null;
  }
  const u = {
    district: norm(user.district),
    town: norm(user.town || user.city),
    area: norm(user.area),
  };
  const t = {
    district: norm(target.district),
    town: norm(target.town),
    area: norm(target.area),
  };
  if (u.area && t.area && u.area === t.area) return "In your area";
  if (u.town && t.town && u.town === t.town) return "Near you";
  if ((target.areas_served ?? []).some((a) => norm(a) === u.town || norm(a) === u.area)) return "Serves your area";
  if (u.district && t.district && u.district === t.district) return "Same district";
  return null;
}

/**
 * Sort an array of items in-place-style (returns a new array) by proximity to user,
 * preserving original order as a stable secondary key.
 */
export function sortByProximity<T>(
  items: T[],
  user: UserLocation | null | undefined,
  getLocation: (item: T) => TargetLocation | null | undefined,
): T[] {
  if (!user) return items;
  return items
    .map((item, idx) => ({ item, idx, score: proximityScore(user, getLocation(item)) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .map((x) => x.item);
}
