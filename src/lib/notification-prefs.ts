// Notification preferences (per-device, localStorage-backed).
// Categories let the user mute whole groups of notifications. Filtering is
// applied in the bell unread count and the notifications list; backend rows
// are still created so the user can re-enable a category and see history.

export type NotifCategory =
  | "requests"
  | "messages"
  | "social"
  | "reviews"
  | "credits"
  | "official";

export const CATEGORY_LABELS: Record<NotifCategory, { title: string; hint: string }> = {
  requests: { title: "Service requests & jobs", hint: "New requests, responses, status changes, disputes." },
  messages: { title: "Messages", hint: "New chat messages from customers and providers." },
  social: { title: "Social activity", hint: "Follows, likes, comments on your posts." },
  reviews: { title: "Reviews & recommendations", hint: "When someone reviews or recommends you." },
  credits: { title: "Credit updates", hint: "Wallet changes, purchase approvals, starter credits, boosts." },
  official: { title: "Official Tuungane updates", hint: "Role changes and announcements from Tuungane." },
};

export const CATEGORY_ORDER: NotifCategory[] = ["requests", "messages", "social", "reviews", "credits", "official"];

export function categoryForType(t: string): NotifCategory {
  if (t === "message_new") return "messages";
  if (t === "follow" || t === "like" || t === "comment") return "social";
  if (t === "recommendation" || t === "review" || t === "feedback_received") return "reviews";
  if (t.startsWith("credits_") || t === "boost_activated") return "credits";
  if (t === "role_granted") return "official";
  // request_*, dispute_opened, and any request lifecycle types
  return "requests";
}

const STORAGE_KEY = "tuungane_notif_prefs";

export type NotifPrefs = Record<NotifCategory, boolean>;

export const DEFAULT_PREFS: NotifPrefs = {
  requests: true,
  messages: true,
  social: true,
  reviews: true,
  credits: true,
  official: true,
};

export function loadNotifPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
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

export function isTypeEnabled(prefs: NotifPrefs, t: string): boolean {
  return prefs[categoryForType(t)] !== false;
}
