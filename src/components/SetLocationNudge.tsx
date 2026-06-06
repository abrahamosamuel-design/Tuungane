import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserLocation } from "@/hooks/use-user-location";

const dismissKey = (uid: string) => `tuungane_loc_nudge_dismissed:${uid}`;

export function SetLocationNudge() {
  const { user } = useAuth();
  const { location, loading } = useUserLocation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(localStorage.getItem(dismissKey(user.id)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [user]);

  if (!user || loading || dismissed) return null;

  const hasLocation = !!(
    location &&
    (location.district || location.town || location.area || (location.latitude && location.longitude))
  );
  if (hasLocation) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(user.id), "1");
    } catch {}
  };

  return (
    <div className="mx-auto mt-3 max-w-5xl px-4 sm:px-6">
      <div className="flex items-center gap-3 rounded-2xl border border-orange/30 bg-orange/10 p-3 sm:p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/20 text-orange">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Set your location</p>
          <p className="text-xs text-muted-foreground">
            Get matched with providers and requests near you.
          </p>
        </div>
        <Link
          to="/settings"
          className="shrink-0 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground shadow-sm transition hover:brightness-110"
        >
          Set now
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
