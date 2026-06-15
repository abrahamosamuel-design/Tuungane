import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { ChevronLeft, BellOff, Bell } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_PREFS,
  loadNotifPrefs,
  saveNotifPrefs,
  type NotifPrefs,
  type NotifCategory,
} from "@/lib/notification-prefs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications/preferences")({
  head: () => ({ meta: [{ title: "Notification preferences — Tuungane" }] }),
  component: NotificationPreferencesPage,
});

function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(loadNotifPrefs());
    setLoaded(true);
  }, []);

  const toggle = (key: NotifCategory, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotifPrefs(next);
    toast.success(value ? `${CATEGORY_LABELS[key].title} enabled` : `${CATEGORY_LABELS[key].title} muted`);
  };

  const setAll = (value: boolean) => {
    const next = CATEGORY_ORDER.reduce<NotifPrefs>((acc, k) => ({ ...acc, [k]: value }), { ...prefs });
    setPrefs(next);
    saveNotifPrefs(next);
    toast.success(value ? "All notifications enabled" : "All notifications muted");
  };

  if (!loaded) return null;

  const allOn = CATEGORY_ORDER.every((k) => prefs[k]);
  const allOff = CATEGORY_ORDER.every((k) => !prefs[k]);

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/notifications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
          <ChevronLeft className="h-4 w-4" /> Back to notifications
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy">Notification preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which notifications to receive. Muted categories won't show in your bell or list — you can re-enable them at any time.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setAll(true)}
            disabled={allOn}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange disabled:opacity-50"
          >
            <Bell className="h-3 w-3" /> Enable all
          </button>
          <button
            onClick={() => setAll(false)}
            disabled={allOff}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange disabled:opacity-50"
          >
            <BellOff className="h-3 w-3" /> Mute all
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {CATEGORY_ORDER.map((key) => {
            const { title, hint } = CATEGORY_LABELS[key];
            const checked = prefs[key];
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 transition ${checked ? "border-border bg-card" : "border-border bg-muted/40"}`}
              >
                <div className="flex-1">
                  <p className="font-semibold text-navy">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch checked={checked} onChange={(v) => toggle(key, v)} />
              </label>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Preferences are stored on this device. We'll add cross-device sync soon.
        </p>
      </section>
    </Layout>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${checked ? "bg-orange" : "bg-muted-foreground/30"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-card shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
