import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TargetLocation } from "@/lib/location";

export type FeaturedLocation = {
  id: string;
  country: string;
  region: string | null;
  district: string | null;
  town: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  category_slug: string | null;
  priority: number;
  note: string | null;
  active: boolean;
};

let _cache: FeaturedLocation[] | null = null;
let _cacheAt = 0;
const TTL = 5 * 60 * 1000;

// Subscribers are notified when the cache is invalidated so live
// `useFeaturedLocations` consumers refetch instead of holding stale rows.
type Listener = () => void;
const _listeners = new Set<Listener>();
function _notify() {
  for (const l of _listeners) {
    try {
      l();
    } catch {}
  }
}

export async function fetchFeaturedLocations(force = false): Promise<FeaturedLocation[]> {
  if (!force && _cache && Date.now() - _cacheAt < TTL) return _cache;
  const { data } = await supabase
    .from("featured_locations")
    .select("id,country,region,district,town,area,category_slug,priority,note,active")
    .eq("active", true)
    .order("priority", { ascending: false });
  const base = (data ?? []) as Omit<FeaturedLocation, "latitude" | "longitude">[];
  // Coordinates are gated at the DB level — fetch through the security-definer
  // RPC and merge them back in for map/distance features.
  const ids = base.map((r) => r.id);
  let coordMap = new Map<string, { latitude: number | null; longitude: number | null }>();
  if (ids.length) {
    const { data: coords } = await supabase.rpc("get_featured_location_coords", { _ids: ids });
    coordMap = new Map((coords ?? []).map((c: { id: string; latitude: number | null; longitude: number | null }) => [c.id, { latitude: c.latitude, longitude: c.longitude }]));
  }
  _cache = base.map((r) => ({ ...r, latitude: coordMap.get(r.id)?.latitude ?? null, longitude: coordMap.get(r.id)?.longitude ?? null })) as FeaturedLocation[];
  _cacheAt = Date.now();
  return _cache;
}


export function invalidateFeaturedLocationsCache() {
  _cache = null;
  _cacheAt = 0;
  _notify();
}

// Invalidate cache on sign-in / sign-out so a different user never sees the
// previous session's featured rows (defense-in-depth; rows are public today
// but may become role-scoped later).
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      invalidateFeaturedLocationsCache();
    }
  });
}

export function useFeaturedLocations() {
  const [locations, setLocations] = useState<FeaturedLocation[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetchFeaturedLocations().then((rows) => {
        if (!cancelled) {
          setLocations(rows);
          setLoading(false);
        }
      });
    };
    refresh();
    // Re-fetch whenever the module cache is invalidated (admin edits, auth changes).
    const listener: Listener = () => {
      if (!cancelled) refresh();
    };
    _listeners.add(listener);
    return () => {
      cancelled = true;
      _listeners.delete(listener);
    };
  }, []);
  return { locations, loading };
}

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

/**
 * Returns true when the target falls inside one of the active featured locations.
 * Used to apply a ranking bonus and surface a "Featured in your area" badge.
 */
export function isFeaturedTarget(
  target: TargetLocation | null | undefined,
  featured: FeaturedLocation[],
  categorySlug?: string | null,
): FeaturedLocation | null {
  if (!target) return null;
  const t = {
    country: norm(target.country),
    region: norm(target.region),
    district: norm(target.district),
    town: norm(target.town),
    area: norm(target.area),
  };
  for (const f of featured) {
    if (f.category_slug && categorySlug && f.category_slug !== categorySlug) continue;
    const match =
      (f.area && norm(f.area) === t.area) ||
      (f.town && norm(f.town) === t.town) ||
      (f.district && norm(f.district) === t.district) ||
      (f.region && norm(f.region) === t.region) ||
      (f.country && norm(f.country) === t.country && !f.region && !f.district && !f.town && !f.area);
    if (match) return f;
  }
  return null;
}
