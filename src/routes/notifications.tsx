import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo } from "@/lib/format";
import { Heart, MessageCircle, ThumbsUp, Star, UserPlus } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Tuungane" }] }),
  component: NotificationsPage,
});

type Notif = {
  id: string; type: string; target_type: string | null; target_id: string | null; message: string; read: boolean; created_at: string; actor_id: string | null;
  actor?: { full_name: string; avatar_url: string | null };
};

const iconFor = (t: string) => {
  switch (t) {
    case "follow": return <UserPlus className="h-4 w-4 text-navy" />;
    case "like": return <Heart className="h-4 w-4 text-orange" />;
    case "comment": return <MessageCircle className="h-4 w-4 text-navy" />;
    case "recommendation": return <ThumbsUp className="h-4 w-4 text-green" />;
    case "review": return <Star className="h-4 w-4 text-orange" />;
    default: return null;
  }
};

function NotificationsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [busy, setBusy] = useState(true);

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

  const hrefFor = (n: Notif) => {
    if (n.target_type === "profile" && n.target_id) return `/u/${n.target_id}`;
    if (n.target_type === "post" && user) return `/u/${user.id}`;
    return "/feed";
  };

  if (!user) return null;
  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Activity on your posts, profile, and follows.</p>
        <div className="mt-6 space-y-2">
          {busy && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!busy && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-semibold text-navy">No notifications yet</p>
              <p className="mt-1 text-sm text-muted-foreground">When people follow you, like your posts, or recommend you, it'll show up here.</p>
            </div>
          )}
          {items.map((n) => (
            <a
              key={n.id}
              href={hrefFor(n)}
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
            </a>
          ))}
          })}
        </div>
      </section>
    </Layout>
  );
}
