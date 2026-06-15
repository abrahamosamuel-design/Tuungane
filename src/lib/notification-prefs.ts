// Notification preferences (per-device, localStorage-backed).
// Matrix of category × delivery channel. In-app filters the bell + list;
// email/push are recorded as user intent — actual delivery wiring lands
// when those channels are enabled in the backend.

export type NotifCategory =
  | "requests"
  | "messages"
  | "social"
  | "reviews"
  | "credits"
  | "official";

export type NotifChannel = "in_app" | "email" | "push";

export const CATEGORY_LABELS: Record<NotifCategory, { title: string; hint: string }> = {
  requests: { title: "Service requests & jobs", hint: "New requests, responses, status changes, disputes." },
  messages: { title: "Messages", hint: "New chat messages from customers and providers." },
  social: { title: "Social activity", hint: "Follows, likes, comments on your posts." },
  reviews: { title: "Reviews & recommendations", hint: "When someone reviews or recommends you." },
  credits: { title: "Credit updates", hint: "Wallet changes, purchase approvals, starter credits, boosts." },
  official: { title: "Official Tuungane updates", hint: "Role changes and announcements from Tuungane." },
};

export const CATEGORY_ORDER: NotifCategory[] = ["requests", "messages", "social", "reviews", "credits", "official"];

export const CHANNEL_ORDER: NotifChannel[] = ["in_app", "email", "push"];

export const CHANNEL_LABELS: Record<NotifChannel, { title: string; short: string; hint: string }> = {
  in_app: { title: "In-app", short: "In-app", hint: "Bell + notifications list" },
  email: { title: "Email", short: "Email", hint: "Sent to your account email" },
  push: { title: "Push", short: "Push", hint: "Mobile / browser push" },
};

export function categoryForType(t: string): NotifCategory {
  if (t === "message_new") return "messages";
  if (t === "follow" || t === "like" || t === "comment") return "social";
  if (t === "recommendation" || t === "review" || t === "feedback_received") return "reviews";
  if (t.startsWith("credits_") || t === "boost_activated") return "credits";
  if (t === "role_granted") return "official";
  return "requests";
}

const STORAGE_KEY = "tuungane_notif_prefs_v2";
const LEGACY_KEY = "tuungane_notif_prefs";

export type ChannelPrefs = Record<NotifChannel, boolean>;
export type NotifPrefs = Record<NotifCategory, ChannelPrefs>;

const DEFAULT_CHANNEL_PREFS: Record<NotifCategory, ChannelPrefs> = {
  // Conservative defaults: in-app on everywhere; email on for the high-signal
  // categories; push opt-in per category but on for the most actionable ones.
  requests: { in_app: true, email: true, push: true },
  messages: { in_app: true, email: false, push: true },
  social: { in_app: true, email: false, push: false },
  reviews: { in_app: true, email: true, push: false },
  credits: { in_app: true, email: true, push: false },
  official: { in_app: true, email: true, push: false },
};

export const DEFAULT_PREFS: NotifPrefs = DEFAULT_CHANNEL_PREFS;

function mergeWithDefaults(input: unknown): NotifPrefs {
  const out: NotifPrefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
  if (!input || typeof input !== "object") return out;
  for (const cat of CATEGORY_ORDER) {
    const raw = (input as Record<string, unknown>)[cat];
    if (raw && typeof raw === "object") {
      for (const ch of CHANNEL_ORDER) {
        const v = (raw as Record<string, unknown>)[ch];
        if (typeof v === "boolean") out[cat][ch] = v;
      }
    } else if (typeof raw === "boolean") {
      // Legacy shape: boolean per category meant in-app only.
      out[cat].in_app = raw;
    }
  }
  return out;
}

export function loadNotifPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeWithDefaults(JSON.parse(raw));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = mergeWithDefaults(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotifPrefs(prefs: NotifPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("tuungane:notif-prefs-changed"));
  } catch {}
}

export function isChannelEnabled(prefs: NotifPrefs, category: NotifCategory, channel: NotifChannel): boolean {
  return prefs[category]?.[channel] !== false;
}

// Back-compat for callers that only care about in-app delivery (bell + list).
export function isTypeEnabled(prefs: NotifPrefs, t: string): boolean {
  return isChannelEnabled(prefs, categoryForType(t), "in_app");
}
