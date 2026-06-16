// Send web-push notifications when a row is inserted in public.notifications.
// Called by a Postgres trigger via pg_net with a shared secret header.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC = "BGUeqqWeNHctNhwNMfMcPexYjZIRYIizxwgMIfPx88PnTmt23RPu1L7x1gMvJ7kOuBiBM0R-bjLkXFd7-IUBvHc";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@tuungane.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function categoryForType(t: string): string {
  if (t === "message_new") return "messages";
  if (t === "follow" || t === "like" || t === "comment") return "social";
  if (t === "recommendation" || t === "review" || t === "feedback_received") return "reviews";
  if (t?.startsWith("credits_") || t === "boost_activated") return "credits";
  if (t === "role_granted") return "official";
  return "requests";
}

const CATEGORY_TITLE: Record<string, string> = {
  requests: "Service request",
  messages: "New message",
  social: "Tuungane",
  reviews: "New review",
  credits: "Credit update",
  official: "Tuungane update",
};

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const headerSecret = req.headers.get("x-trigger-secret") || "";
  const { data: cfg } = await supabase
    .from("push_config")
    .select("trigger_secret")
    .eq("id", 1)
    .maybeSingle();
  if (!cfg?.trigger_secret || !timingSafeEqualStr(headerSecret, cfg.trigger_secret)) {
    return new Response("forbidden", { status: 403 });
  }

  let payload: {
    notification_id?: string;
    user_id: string;
    type: string;
    message: string;
    target_type?: string;
    target_id?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const category = categoryForType(payload.type);

  // Check push pref (default: enabled if no row, mirrors client defaults)
  const { data: pref } = await supabase
    .from("notification_push_prefs")
    .select("enabled")
    .eq("user_id", payload.user_id)
    .eq("category", category)
    .maybeSingle();
  if (pref && pref.enabled === false) {
    return new Response(JSON.stringify({ skipped: "muted" }), { status: 200 });
  }

  const { data: subs } = await supabase
    .from("notification_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", payload.user_id);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ skipped: "no_subs" }), { status: 200 });
  }

  const body = JSON.stringify({
    title: CATEGORY_TITLE[category] || "Tuungane",
    body: payload.message || "You have a new notification",
    url: notificationUrl(payload),
    tag: payload.notification_id || `${payload.user_id}-${Date.now()}`,
  });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      ),
    ),
  );

  // Clean up gone/expired endpoints
  const dead: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const status = (r.reason as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) dead.push(subs[i].id);
    }
  });
  if (dead.length > 0) {
    await supabase.from("notification_push_subscriptions").delete().in("id", dead);
  }

  return new Response(
    JSON.stringify({
      sent: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
      cleaned: dead.length,
    }),
    { headers: { "content-type": "application/json" }, status: 200 },
  );
});

function notificationUrl(p: {
  type: string;
  target_type?: string;
  target_id?: string;
  notification_id?: string;
}): string {
  if (p.target_type === "conversation" && p.target_id) return `/messages/${p.target_id}`;
  if (p.target_type === "service_request" && p.target_id) return `/requests/${p.target_id}`;
  if (p.notification_id) return `/notifications/${p.notification_id}`;
  return "/notifications";
}
