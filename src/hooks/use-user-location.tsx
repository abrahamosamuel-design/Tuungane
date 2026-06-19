import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type UserLocationContextValue = {
  location: UserLocation | null;
  loading: boolean;
  requestingGeo: boolean;
  updateLocation: (patch: Partial<UserLocation>) => Promise<UserLocation>;
  requestBrowserLocation: () => Promise<UserLocation | null>;
};

const UserLocationContext = createContext<UserLocationContextValue | null>(null);

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // On first mount auth may not be resolved yet — start from anon cache.
  // The effect below swaps to the user-scoped cache once auth resolves.
  const [location, setLocation] = useState<UserLocation | null>(() => readLocalFor(null));
  const [loading, setLoading] = useState(false);
  const [requestingGeo, setRequestingGeo] = useState(false);

  // Refs mirror state so callbacks can read latest values without depending on them.
  // This keeps `updateLocation`/`requestBrowserLocation` referentially stable across
  // renders, so consumer effects that depend on them don't re-run unnecessarily.
  const locationRef = useRef(location);
  const userIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

  // Swap cache + load from profile when signed-in user changes.
  useEffect(() => {
    clearLegacy();
    setLocation(readLocalFor(user?.id ?? null));
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("country,region,district,city,town,area,latitude,longitude,location_visibility")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const next = data as UserLocation;
        setLocation(next);
        writeLocalFor(user.id, next);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateLocation = useCallback(async (patch: Partial<UserLocation>) => {
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
    const uid = userIdRef.current;
    const next: UserLocation = { ...(locationRef.current ?? {}), ...cleanPatch };
    locationRef.current = next;
    setLocation(next);
    writeLocalFor(uid, next);
    if (uid) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbPatch: any = { ...cleanPatch, location_updated_at: new Date().toISOString() };
      if (dbPatch.location_visibility === null) delete dbPatch.location_visibility;
      await supabase.from("profiles").update(dbPatch).eq("id", uid);
    }
    return next;
  }, []);

  const requestBrowserLocation = useCallback(async (): Promise<UserLocation | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location not supported", {
        description: "Your browser doesn't support geolocation. Enter your area manually.",
      });
      return null;
    }
    // Geolocation is blocked in cross-origin iframes without an explicit
    // allow="geolocation" attribute (e.g. the Lovable in-app preview). Detect
    // this so we show a useful message instead of a confusing "permission denied".
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (inIframe) {
      try {
        const fp = (document as unknown as { featurePolicy?: { allowsFeature?: (f: string) => boolean } }).featurePolicy;
        const allowed = fp?.allowsFeature ? fp.allowsFeature("geolocation") : true;
        if (!allowed) {
          toast.error("Location blocked in preview", {
            description: "Open the published site in your browser to use current location, or enter your area manually.",
          });
          return null;
        }
      } catch {
        // ignore detection failures and fall through to the actual request
      }
    }
    setRequestingGeo(true);
    return new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geo = await reverseGeocode(lat, lng);
          const patch: Partial<UserLocation> = { latitude: lat, longitude: lng };
          if (geo) {
            const cur = locationRef.current ?? {};
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
  }, [updateLocation]);

  // Memoize context value so identity only changes when state actually changes.
  const value = useMemo<UserLocationContextValue>(
    () => ({ location, loading, requestingGeo, updateLocation, requestBrowserLocation }),
    [location, loading, requestingGeo, updateLocation, requestBrowserLocation],
  );

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

export function useUserLocation(): UserLocationContextValue {
  const ctx = useContext(UserLocationContext);
  if (!ctx) {
    throw new Error("useUserLocation must be used within a UserLocationProvider");
  }
  return ctx;
}
