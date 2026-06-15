// Browser web-push subscribe/unsubscribe helpers.
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BGUeqqWeNHctNhwNMfMcPexYjZIRYIizxwgMIfPx88PnTmt23RPu1L7x1gMvJ7kOuBiBM0R-bjLkXFd7-IUBvHc";

const SW_URL = "/sw-push.js";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const reg = await getRegistration();
  // Reuse subscription if it already exists
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    });
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, reason: "not_signed_in" };

  const endpoint = sub.endpoint;
  const p256dh = arrayBufferToBase64Url(sub.getKey("p256dh"));
  const authKey = arrayBufferToBase64Url(sub.getKey("auth"));

  const { error } = await supabase
    .from("notification_push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: navigator.userAgent.slice(0, 500),
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function disablePush(): Promise<{ ok: boolean }> {
  if (!isPushSupported()) return { ok: true };
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try {
      await supabase
        .from("notification_push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);
    } catch {}
    try {
      await sub.unsubscribe();
    } catch {}
  }
  return { ok: true };
}

export async function getActiveSubscriptionEndpoint(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint || null;
}

const CATEGORIES = ["requests", "messages", "social", "reviews", "credits", "official"] as const;
export type PushCategory = (typeof CATEGORIES)[number];

export async function syncPushPrefsToServer(
  prefs: Record<PushCategory, boolean>,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const rows = CATEGORIES.map((c) => ({
    user_id: userId,
    category: c,
    enabled: !!prefs[c],
    updated_at: new Date().toISOString(),
  }));
  await supabase
    .from("notification_push_prefs")
    .upsert(rows, { onConflict: "user_id,category" });
}
