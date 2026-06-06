import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { UserLocation } from "@/lib/location";

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
      const next: UserLocation = { ...(location ?? {}), ...patch };
      setLocation(next);
      writeLocal(next);
      if (user) {
        await supabase
          .from("profiles")
          .update({ ...patch, location_updated_at: new Date().toISOString() })
          .eq("id", user.id);
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
          const next = await updateLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
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
  }, [updateLocation]);

  return { location, loading, requestingGeo, updateLocation, requestBrowserLocation };
}
