import { useState, useEffect } from "react";
import { X, BellRing } from "lucide-react";
import { isPushSupported, enablePush, hasUserOptedOutOfPush, setPushOptOut } from "@/lib/push";
import { useAuth } from "@/hooks/use-auth";

export function PushPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only prompt logged-in users, if push is supported, and if they haven't opted out.
    if (!user || !isPushSupported() || typeof Notification === "undefined") return;

    if (Notification.permission === "default" && !hasUserOptedOutOfPush()) {
      // Delay prompt slightly so it doesn't interrupt immediate initial paint
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!show) return null;

  const handleEnable = async () => {
    setBusy(true);
    const result = await enablePush();
    setBusy(false);
    
    if (result.ok) {
      setShow(false);
    } else if (result.reason === "denied") {
      setPushOptOut(true);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setPushOptOut(true);
    setShow(false);
  };

  return (
    <div className="fixed top-20 left-4 right-4 z-50 md:top-24 md:left-auto md:right-6 md:w-96 animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-orange/20 bg-card p-4 shadow-xl">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange/10 blur-xl"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-navy">Never miss an update</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enable notifications to instantly know when you receive a job request, review, or message.
            </p>
            <div className="mt-4 flex gap-3">
              <button 
                onClick={handleEnable}
                disabled={busy}
                className="flex-1 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange/90 disabled:opacity-50 transition-colors"
              >
                {busy ? "Enabling..." : "Enable Push"}
              </button>
              <button 
                onClick={handleDismiss}
                className="flex-1 rounded-full border border-border bg-transparent px-4 py-2 text-sm font-semibold text-navy hover:bg-muted transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
