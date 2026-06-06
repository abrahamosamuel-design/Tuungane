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
    // Base score from raw distance.
    let base: number;
    if (km < 1) base = 100;
    else if (km < 3) base = 92;
    else if (km < 5) base = 85;
    else if (km < 10) base = 75;
    else if (km < 20) base = 65;
    else if (km < 50) base = 50;
    else if (km < 150) base = 35;
    else if (km < 500) base = 22;
    else base = 10;

    // Service-radius boost: if the user falls within the provider's declared
    // service radius, treat them as effectively "reachable" and lift the score
    // proportionally to how comfortably they're inside that radius.
    const reach = target.service_radius_km;
    if (reach != null && reach > 0 && km <= reach) {
      // Deep inside radius (≤50% of reach) → strong boost; near edge → mild boost.
      const ratio = km / reach; // 0 (center) → 1 (edge)
      const boost = Math.round(20 * (1 - ratio)); // up to +20
      base = Math.min(100, base + boost);
      // Ensure providers who explicitly serve this distance never score below
      // "same district" tier — they've opted in to cover this user.
      base = Math.max(base, 60);
    }
    return base;
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

/**
 * Filter items to those within `radiusKm` of the user.
 * Items without coordinates fall back to the text hierarchy:
 *  - radius <= 5km  → only same area or town counts as nearby
 *  - radius <= 20km → also accepts same town
 *  - radius > 20km  → also accepts same district
 * Returns the original list unchanged when no radius or no user location.
 */
export function filterByRadius<T>(
  items: T[],
  user: UserLocation | null | undefined,
  getLocation: (item: T) => TargetLocation | null | undefined,
  radiusKm: number | null,
): T[] {
  if (!user || radiusKm == null) return items;
  return items.filter((item) => {
    const t = getLocation(item);
    if (!t) return false;
    const km = haversineKm(user, t);
    if (km != null) {
      const reach = (t.service_radius_km ?? 0) > 0 ? Math.max(radiusKm, t.service_radius_km!) : radiusKm;
      return km <= reach;
    }
    // Text hierarchy fallback
    const u = {
      district: norm(user.district),
      town: norm(user.town || user.city),
      area: norm(user.area),
    };
    const tt = {
      district: norm(t.district),
      town: norm(t.town),
      area: norm(t.area),
    };
    const served = (t.areas_served ?? []).map(norm).filter(Boolean);
    if (u.area && (tt.area === u.area || served.includes(u.area))) return true;
    if (radiusKm <= 5) return false;
    if (u.town && (tt.town === u.town || served.includes(u.town))) return true;
    if (radiusKm <= 20) return false;
    if (u.district && tt.district === u.district) return true;
    return false;
  });
}

