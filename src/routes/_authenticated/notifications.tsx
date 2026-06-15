import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo } from "@/lib/format";
import { Heart, MessageCircle, ThumbsUp, Star, UserPlus, ClipboardList, CheckCircle2, PlayCircle, Send, ShieldCheck, AlertTriangle, XCircle, Settings } from "lucide-react";
import { isTypeEnabled, loadNotifPrefs, type NotifPrefs, DEFAULT_PREFS } from "@/lib/notification-prefs";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Tuungane" }] }),
  component: NotificationsPage,
});

type Notif = {
  id: string; type: string; target_type: string | null; target_id: string | null; message: string; read: boolean; created_at: string; actor_id: string | null;
  actor?: { full_name: string; avatar_url: string | null };
};

const JOB_TYPES = new Set([
  "request_new", "request_accepted", "request_in_progress", "request_completed",
  "request_cancelled", "request_response_new", "request_response_chosen",
  "feedback_received", "dispute_opened",
]);

const iconFor = (t: string) => {
  switch (t) {
    case "follow": return <UserPlus className="h-4 w-4 text-navy" />;
    case "like": return <Heart className="h-4 w-4 text-orange" />;
    case "comment": return <MessageCircle className="h-4 w-4 text-navy" />;
    case "recommendation": return <ThumbsUp className="h-4 w-4 text-green" />;
    case "review":
    case "feedback_received": return <ShieldCheck className="h-4 w-4 text-green" />;
    case "request_new":
    case "request_response_new": return <Send className="h-4 w-4 text-orange" />;
    case "request_accepted":
    case "request_response_chosen": return <ClipboardList className="h-4 w-4 text-orange" />;
    case "request_in_progress": return <PlayCircle className="h-4 w-4 text-navy" />;
    case "request_completed": return <CheckCircle2 className="h-4 w-4 text-green" />;
    case "request_cancelled": return <XCircle className="h-4 w-4 text-muted-foreground" />;
    case "dispute_opened": return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default: return <Star className="h-4 w-4 text-muted-foreground" />;
  }
};

function NotificationsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<"all" | "jobs" | "social">("all");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: "/notifications" } as never });
  }, [loading, user, nav]);

  const load = async () => {
    if (!user) return;
    setBusy(true);
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    const ids = Array.from(new Set((data ?? []).map((n) => n.actor_id).filter(Boolean) as string[]));
    let pm = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    setItems((data ?? []).map((n) => ({ ...n, actor: n.actor_id ? pm.get(n.actor_id) : undefined })) as Notif[]);
    setBusy(false);
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user?.id]);


  const filtered = filter === "all"
    ? items
    : filter === "jobs"
      ? items.filter((n) => JOB_TYPES.has(n.type))
      : items.filter((n) => !JOB_TYPES.has(n.type));

  if (!user) return null;
  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Activity on your posts, profile, follows, and service jobs.</p>

        <div className="mt-4 inline-flex rounded-full border border-border bg-card p-1">
          {([
            { v: "all", label: "All" },
            { v: "jobs", label: "Job updates" },
            { v: "social", label: "Social" },
          ] as const).map((o) => (
            <button key={o.v} onClick={() => setFilter(o.v)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === o.v ? "bg-orange text-orange-foreground" : "text-muted-foreground"}`}>{o.label}</button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          {busy && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!busy && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-semibold text-navy">{filter === "all" ? "No notifications yet" : filter === "jobs" ? "No job updates yet" : "No social updates yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === "jobs"
                  ? "Activity on your service requests and jobs will show up here."
                  : "When people follow you, like your posts, or recommend you, it'll show up here."}
              </p>
            </div>
          )}
          {filtered.map((n) => (
            <Link
              key={n.id}
              to="/notifications/$id"
              params={{ id: n.id }}
              className={`flex items-start gap-3 rounded-2xl border border-border p-3 transition hover:border-orange ${n.read ? "bg-card" : "bg-orange/5"}`}
            >
              <div className="relative">
                <Avatar name={n.actor?.full_name ?? "User"} url={n.actor?.avatar_url ?? null} size={40} />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-card p-1 shadow-sm">{iconFor(n.type)}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-navy">{n.actor?.full_name ?? "Someone"}</span>{" "}
                  <span className="text-muted-foreground">{n.message}</span>
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-orange" />}
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
}
