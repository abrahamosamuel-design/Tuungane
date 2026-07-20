import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

function getOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function useOnlineStatus() {
  // Always start as `true` to match SSR output; correct on mount.
  const [online, setOnline] = useState<boolean>(true);
  useEffect(() => {
    setOnline(getOnline());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You are offline. Showing saved results — new updates will load when you reconnect.
    </div>
  );
}
