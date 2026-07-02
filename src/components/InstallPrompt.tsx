import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { isIos, isStandaloneDisplay } from "@/lib/pwa";
import { trackPwa } from "@/lib/pwa-analytics";

const DISMISS_KEY = "tuungane_pwa_dismissed_at";
const IOS_DISMISS_KEY = "tuungane_pwa_ios_dismissed_at";
const INSTALLED_KEY = "tuungane_pwa_installed";
const DISMISS_DAYS = 7;

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function dismissedRecently(key: string) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return false;
    const at = Number(v);
    if (!at) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isEngaged(pathname: string, isAuthed: boolean): boolean {
  if (isAuthed) return true;
  // Non-auth engaged surfaces (returning visits, menu/profile, key flows).
  const engagedPaths = [
    "/dashboard",
    "/me",
    "/welcome",
    "/settings",
    "/requests",
    "/profiles/new",
    "/profiles",
    "/messages",
  ];
  if (engagedPaths.some((p) => pathname.startsWith(p))) return true;
  try {
    const visits = Number(localStorage.getItem("tuungane_visits") || "0");
    return visits >= 2;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const { isAuthenticated, roles } = useAuth();
  const isMobile = useIsMobile();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIos, setShowIos] = useState(false);

  // Track visits for engagement heuristic.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const n = Number(localStorage.getItem("tuungane_visits") || "0") + 1;
      localStorage.setItem("tuungane_visits", String(n));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplay()) return;
    try {
      if (localStorage.getItem(INSTALLED_KEY) === "true") return;
    } catch {}

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      trackPwa("pwa_prompt_available");
      const pathname = window.location.pathname;
      if (!dismissedRecently(DISMISS_KEY) && isEngaged(pathname, isAuthenticated)) {
        setVisible(true);
        trackPwa("pwa_prompt_shown", { pathname });
      }
    };

    const onInstalled = () => {
      try {
        localStorage.setItem(INSTALLED_KEY, "true");
      } catch {}
      setVisible(false);
      setShowIos(false);
      trackPwa("pwa_app_installed");
    };

    window.addEventListener("beforeinstallprompt", onBIP as EventListener);
    window.addEventListener("appinstalled", onInstalled);

    // iOS: show manual instructions once engaged, if not dismissed.
    if (isIos() && !dismissedRecently(IOS_DISMISS_KEY)) {
      const pathname = window.location.pathname;
      if (isEngaged(pathname, isAuthenticated)) {
        const t = window.setTimeout(() => {
          setShowIos(true);
          trackPwa("pwa_ios_instructions_shown");
        }, 1500);
        return () => {
          window.clearTimeout(t);
          window.removeEventListener("beforeinstallprompt", onBIP as EventListener);
          window.removeEventListener("appinstalled", onInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isAuthenticated]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    trackPwa("pwa_prompt_dismissed");
  };

  const install = async () => {
    if (!deferred) return;
    trackPwa("pwa_install_clicked");
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        trackPwa("pwa_install_accepted");
        try {
          localStorage.setItem(INSTALLED_KEY, "true");
        } catch {}
      } else {
        trackPwa("pwa_install_rejected");
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {}
      }
    } catch {}
    setDeferred(null);
    setVisible(false);
  };

  const dismissIos = () => {
    setShowIos(false);
    try {
      localStorage.setItem(IOS_DISMISS_KEY, String(Date.now()));
    } catch {}
    trackPwa("pwa_prompt_dismissed", { platform: "ios" });
  };

  const isProvider = roles.includes("admin") || roles.includes("moderator") ? false : false;
  // Copy adapts to signed-in providers vs customers when available.
  const title = "Install Tuungane App";
  const body = isAuthenticated
    ? isProvider
      ? "Install Tuungane so you don't miss new service requests near you."
      : "Install Tuungane so you can quickly find trusted service providers when you need help."
    : "Add Tuungane to your home screen for faster access to services, requests, messages, and opportunities.";

  if (visible && deferred) {
    return (
      <div
        role="dialog"
        aria-label="Install Tuungane"
        className={
          isMobile
            ? "fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-2xl border-t border-border bg-background p-4 pb-6 shadow-2xl mb-16"
            : "fixed bottom-4 right-4 z-40 w-[360px] rounded-2xl border border-border bg-background p-4 shadow-2xl"
        }
      >
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-lg" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <button
                onClick={dismiss}
                aria-label="Dismiss install prompt"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={install} className="gap-1.5">
                <Download className="h-4 w-4" />
                Install App
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showIos) {
    return (
      <div
        role="dialog"
        aria-label="Install Tuungane on your iPhone"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-2xl border-t border-border bg-background p-4 pb-6 shadow-2xl mb-16"
      >
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-lg" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Install Tuungane on your iPhone</h2>
              <button
                onClick={dismissIos}
                aria-label="Dismiss install instructions"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs leading-relaxed text-muted-foreground">
              Tap the Share button <Share className="inline h-3.5 w-3.5" />, then choose{" "}
              <span className="font-medium text-foreground">Add to Home Screen</span>.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={dismissIos}>
                Got it
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissIos}>
                Remind me later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
