import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { ChevronLeft, Bell, Mail, Smartphone, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CHANNEL_ORDER,
  CHANNEL_LABELS,
  DEFAULT_PREFS,
  loadNotifPrefs,
  saveNotifPrefs,
  type NotifPrefs,
  type NotifCategory,
  type NotifChannel,
} from "@/lib/notification-prefs";
import {
  isPushSupported,
  getPushPermission,
  enablePush,
  disablePush,
  getActiveSubscriptionEndpoint,
  syncPushPrefsToServer,
  setPushOptOut,
} from "@/lib/push";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications/preferences")({
  head: () => ({ meta: [{ title: "Notification preferences — Tuungane" }] }),
  component: NotificationPreferencesPage,
});

const CHANNEL_ICON: Record<NotifChannel, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  push: Smartphone,
};

function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushStatus = async () => {
    const supported = isPushSupported();
    setPushSupported(supported);
    setPushPermission(getPushPermission());
    if (supported) {
      const ep = await getActiveSubscriptionEndpoint();
      setPushSubscribed(!!ep);
      setPushEndpoint(ep);
    }
  };

  useEffect(() => {
    setPrefs(loadNotifPrefs());
    setLoaded(true);
    refreshPushStatus();
  }, []);

  // Re-check permission when user returns to tab (they may have changed it in settings)
  useEffect(() => {
    const onVis = () => { if (!document.hidden) refreshPushStatus(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Mirror push-channel preferences to the server whenever they change so the
  // edge function knows which categories to deliver to.
  useEffect(() => {
    if (!loaded) return;
    const pushPrefs = CATEGORY_ORDER.reduce(
      (acc, c) => ({ ...acc, [c]: !!prefs[c].push }),
      {} as Record<NotifCategory, boolean>,
    );
    syncPushPrefsToServer(pushPrefs).catch(() => {});
  }, [prefs, loaded]);

  const toggle = (cat: NotifCategory, ch: NotifChannel, value: boolean) => {
    const next: NotifPrefs = { ...prefs, [cat]: { ...prefs[cat], [ch]: value } };
    setPrefs(next);
    saveNotifPrefs(next);
    toast.success(
      `${CATEGORY_LABELS[cat].title} • ${CHANNEL_LABELS[ch].short} ${value ? "enabled" : "muted"}`,
      { duration: 1500 },
    );
  };

  const setColumn = (ch: NotifChannel, value: boolean) => {
    const next: NotifPrefs = { ...prefs };
    for (const cat of CATEGORY_ORDER) next[cat] = { ...next[cat], [ch]: value };
    setPrefs(next);
    saveNotifPrefs(next);
    toast.success(`${CHANNEL_LABELS[ch].short} ${value ? "enabled" : "muted"} for all categories`);
  };

  const setRow = (cat: NotifCategory, value: boolean) => {
    const next: NotifPrefs = { ...prefs };
    next[cat] = CHANNEL_ORDER.reduce((acc, c) => ({ ...acc, [c]: value }), { ...next[cat] });
    setPrefs(next);
    saveNotifPrefs(next);
    toast.success(`${CATEGORY_LABELS[cat].title} ${value ? "enabled" : "muted"}`);
  };

  const handleEnablePush = async () => {
    setPushBusy(true);
    const res = await enablePush();
    if (res.ok) setPushOptOut(false);
    await refreshPushStatus();
    setPushBusy(false);
    if (res.ok) {
      toast.success("Push notifications enabled on this device");
    } else if (res.reason === "denied") {
      toast.error("Push permission was denied. Enable it in your browser settings.");
    } else if (res.reason === "unsupported") {
      toast.error("This browser does not support push notifications.");
    } else {
      toast.error("Couldn't enable push: " + (res.reason || "unknown error"));
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    await disablePush();
    setPushOptOut(true);
    await refreshPushStatus();
    setPushBusy(false);
    toast.success("Push disabled on this device");
  };

  if (!loaded) return null;

  const columnAllOn = (ch: NotifChannel) => CATEGORY_ORDER.every((c) => prefs[c][ch]);

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/notifications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
          <ChevronLeft className="h-4 w-4" /> Back to notifications
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy">Notification preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick how you want to be alerted for each category. Toggle channels independently — in-app, email, and push.
        </p>

        {/* Push enable/disable for this device */}
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-orange/10 p-2 text-orange">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy">Push on this device</p>
                  {/* Overall status badge */}
                  {!pushSupported ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <XCircle className="h-3 w-3" /> Unsupported
                    </span>
                  ) : pushPermission === "denied" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                      <XCircle className="h-3 w-3" /> Permission denied
                    </span>
                  ) : pushSubscribed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Push enabled
                    </span>
                  ) : pushPermission === "granted" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                      <AlertCircle className="h-3 w-3" /> Permission granted, not subscribed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Info className="h-3 w-3" /> Permission default
                    </span>
                  )}
                </div>

                {/* Detailed status rows */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Browser support:</span>
                    <span className={pushSupported ? "font-medium text-green-600" : "font-medium text-red-500"}>
                      {pushSupported ? "Supported" : "Not supported"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Permission:</span>
                    <span
                      className={`font-medium capitalize ${
                        pushPermission === "granted"
                          ? "text-green-600"
                          : pushPermission === "denied"
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {pushPermission === "unsupported" ? "N/A" : pushPermission}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Subscription:</span>
                    <span className={pushSubscribed ? "font-medium text-green-600" : "font-medium text-muted-foreground"}>
                      {pushSubscribed ? "Active" : "Not active"}
                    </span>
                  </div>
                  {pushEndpoint && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Endpoint:</span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground max-w-[200px] sm:max-w-xs">
                        {pushEndpoint}
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {!pushSupported
                    ? "This browser does not support web push. Try a recent Chrome, Edge, or Firefox — on iOS, install Tuungane to your Home Screen first."
                    : pushPermission === "denied"
                      ? "You blocked notifications for this site. Enable them in your browser site settings, then try again."
                      : pushSubscribed
                        ? "Push is active. You'll receive alerts for enabled categories below even when Tuungane is closed."
                        : "Turn on push to get alerts on this device when something happens — even when Tuungane is closed."}
                </p>
              </div>
            </div>
            {pushSupported && pushPermission !== "denied" && (
              <button
                onClick={pushSubscribed ? handleDisablePush : handleEnablePush}
                disabled={pushBusy}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  pushSubscribed
                    ? "border border-border bg-background text-navy hover:border-orange"
                    : "bg-orange text-white hover:bg-orange/90"
                }`}
              >
                {pushBusy ? "…" : pushSubscribed ? "Disable" : "Enable push"}
              </button>
            )}
          </div>
        </div>

        {/* Channel legend / column toggles */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {CHANNEL_ORDER.map((ch) => {
            const Icon = CHANNEL_ICON[ch];
            const allOn = columnAllOn(ch);
            return (
              <button
                key={ch}
                onClick={() => setColumn(ch, !allOn)}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${allOn ? "border-orange bg-orange/5" : "border-border bg-card hover:border-orange"}`}
                aria-label={`Toggle ${CHANNEL_LABELS[ch].title} for all categories`}
              >
                <div className="flex items-center gap-2 text-navy">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{CHANNEL_LABELS[ch].title}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {CHANNEL_LABELS[ch].hint} · Tap to {allOn ? "mute" : "enable"} all
                </span>
              </button>
            );
          })}
        </div>

        {/* Category × channel matrix */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_repeat(3,72px)] border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Category</span>
            {CHANNEL_ORDER.map((ch) => (
              <span key={ch} className="text-center">{CHANNEL_LABELS[ch].short}</span>
            ))}
          </div>

          {CATEGORY_ORDER.map((cat, i) => {
            const { title, hint } = CATEGORY_LABELS[cat];
            const rowAllOff = CHANNEL_ORDER.every((c) => !prefs[cat][c]);
            return (
              <div
                key={cat}
                className={`grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_repeat(3,72px)] sm:items-center ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className={`font-semibold ${rowAllOff ? "text-muted-foreground" : "text-navy"}`}>{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <button
                    onClick={() => setRow(cat, rowAllOff)}
                    className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-navy hover:border-orange sm:hidden"
                  >
                    {rowAllOff ? "Enable all" : "Mute all"}
                  </button>
                </div>
                <div className="flex items-center gap-4 sm:contents">
                  {CHANNEL_ORDER.map((ch) => {
                    const Icon = CHANNEL_ICON[ch];
                    const checked = prefs[cat][ch];
                    return (
                      <div key={ch} className="flex items-center gap-2 sm:justify-center">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground sm:hidden" />
                        <span className="text-xs text-muted-foreground sm:hidden">{CHANNEL_LABELS[ch].short}</span>
                        <Switch
                          checked={checked}
                          onChange={(v) => toggle(cat, ch, v)}
                          ariaLabel={`${title} — ${CHANNEL_LABELS[ch].title}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Push delivery is live for enabled categories on devices where you've turned push on. Email delivery follows these preferences as we roll it out. In-app changes apply immediately to your bell and notifications list.
        </p>
      </section>
    </Layout>
  );
}

function Switch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${checked ? "bg-orange" : "bg-muted-foreground/30"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-card shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
