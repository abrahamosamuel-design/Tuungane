import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { UserLocation } from "@/lib/location";
import { reverseGeocode } from "@/lib/geocoding";

const STORAGE_KEY = "tuungane_user_location";

function readLocal(): UserLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
}

function writeLocal(loc: UserLocation) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {}
}

export function useUserLocation() {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>(() => readLocal());
  const [loading, setLoading] = useState(false);
  const [requestingGeo, setRequestingGeo] = useState(false);

  // Load from profile when signed in.
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("country,region,district,city,town,area,latitude,longitude,location_visibility")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const next = data as UserLocation;
        setLocation(next);
        writeLocal(next);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const updateLocation = useCallback(
    async (patch: Partial<UserLocation>) => {
      // Trim free-text fields so admin queries / group-bys aren't polluted by
      // trailing whitespace (e.g. "Wakiso " vs "Wakiso").
      const TEXT_KEYS: (keyof UserLocation)[] = ["country", "region", "district", "city", "town", "area"];
      const cleanPatch: Partial<UserLocation> = { ...patch };
      for (const k of TEXT_KEYS) {
        if (k in cleanPatch) {
          const v = cleanPatch[k];
          if (typeof v === "string") {
            const trimmed = v.trim();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (cleanPatch as any)[k] = trimmed.length ? trimmed : null;
          }
        }
      }
      const next: UserLocation = { ...(location ?? {}), ...cleanPatch };
      setLocation(next);
      writeLocal(next);
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbPatch: any = { ...cleanPatch, location_updated_at: new Date().toISOString() };
        if (dbPatch.location_visibility === null) delete dbPatch.location_visibility;
        await supabase.from("profiles").update(dbPatch).eq("id", user.id);
      }
      return next;
    },
    [user?.id, location],
  );

  const requestBrowserLocation = useCallback(async (): Promise<UserLocation | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    setRequestingGeo(true);
    return new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Reverse-geocode so text-hierarchy ranking also works,
          // not just lat/lng. Failure here is non-fatal — we still save coords.
          const geo = await reverseGeocode(lat, lng);
          const patch: Partial<UserLocation> = { latitude: lat, longitude: lng };
          if (geo) {
            // Only overwrite empty fields, so user-typed values aren't clobbered.
            const cur = location ?? {};
            if (!cur.country && geo.country) patch.country = geo.country;
            if (!cur.region && geo.region) patch.region = geo.region;
            if (!cur.district && geo.district) patch.district = geo.district;
            if (!cur.city && geo.city) patch.city = geo.city;
            if (!cur.town && geo.town) patch.town = geo.town;
            if (!cur.area && geo.area) patch.area = geo.area;
          }
          const next = await updateLocation(patch);
          setRequestingGeo(false);
          resolve(next);
        },
        () => {
          setRequestingGeo(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    });
  }, [updateLocation, location]);

  return { location, loading, requestingGeo, updateLocation, requestBrowserLocation };
}
