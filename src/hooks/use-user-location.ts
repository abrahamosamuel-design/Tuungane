import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { UserLocation } from "@/lib/location";
import { reverseGeocode } from "@/lib/geocoding";
import { toast } from "sonner";

const LEGACY_KEY = "tuungane_user_location";
const ANON_KEY = "tuungane_user_location:anon";
const userKey = (uid?: string | null) => (uid ? `tuungane_user_location:${uid}` : ANON_KEY);

function readLocalFor(uid?: string | null): UserLocation | null {
  try {
    const raw = localStorage.getItem(userKey(uid));
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
}

function writeLocalFor(uid: string | null | undefined, loc: UserLocation) {
  try {
    localStorage.setItem(userKey(uid), JSON.stringify(loc));
  } catch {}
}

function clearLegacy() {
  // The legacy non-scoped key leaked between users on shared devices.
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

export function useUserLocation() {
  const { user } = useAuth();
  // On first mount auth may not be resolved yet — start from anon cache.
  // The effect below swaps to the user-scoped cache once auth resolves.
  const [location, setLocation] = useState<UserLocation | null>(() => readLocalFor(null));
  const [loading, setLoading] = useState(false);
  const [requestingGeo, setRequestingGeo] = useState(false);

  // Swap cache + load from profile when signed-in user changes.
  useEffect(() => {
    clearLegacy();

    // Re-seed from the cache that belongs to THIS user (or anon on sign-out).
    setLocation(readLocalFor(user?.id ?? null));

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
        writeLocalFor(user.id, next);
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
      writeLocalFor(user?.id ?? null, next);
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
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location not supported", {
        description: "Your browser doesn't support geolocation. Enter your area manually.",
      });
      return null;
    }
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
          toast.success("Location updated");
          resolve(next);
        },
        (err) => {
          setRequestingGeo(false);
          // err.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
          if (err.code === 1) {
            toast.error("Location permission denied", {
              description: "Allow location access in your browser settings, or enter your area manually.",
            });
          } else if (err.code === 2) {
            toast.error("Location unavailable", {
              description: "We couldn't determine your location. Enter your area manually.",
            });
          } else if (err.code === 3) {
            toast.error("Location request timed out", {
              description: "Try again or enter your area manually.",
            });
          } else {
            toast.error("Couldn't get your location", {
              description: "Enter your area manually instead.",
            });
          }
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    });
  }, [updateLocation, location]);

  return { location, loading, requestingGeo, updateLocation, requestBrowserLocation };
}
