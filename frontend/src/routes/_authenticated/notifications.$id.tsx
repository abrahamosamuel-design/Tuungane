import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo } from "@/lib/format";
import { ArrowLeft, Heart, MessageCircle, ThumbsUp, Star, UserPlus, ClipboardList, CheckCircle2, PlayCircle, Send, ShieldCheck, AlertTriangle, XCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications/$id")({
  head: () => ({ meta: [{ title: "Notification — Tuungane" }] }),
  component: NotificationDetailPage,
});

type Notif = {
  id: string;
  type: string;
  target_type: string | null;
  target_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  actor_id: string | null;
  actor?: { full_name: string; avatar_url: string | null };
};

const iconFor = (t: string) => {
  switch (t) {
    case "follow": return <UserPlus className="h-5 w-5 text-navy" />;
    case "like": return <Heart className="h-5 w-5 text-orange" />;
    case "comment": return <MessageCircle className="h-5 w-5 text-navy" />;
    case "recommendation": return <ThumbsUp className="h-5 w-5 text-green" />;
    case "review":
    case "feedback_received": return <ShieldCheck className="h-5 w-5 text-green" />;
    case "request_new":
    case "request_response_new": return <Send className="h-5 w-5 text-orange" />;
    case "request_accepted":
    case "request_response_chosen": return <ClipboardList className="h-5 w-5 text-orange" />;
    case "request_in_progress": return <PlayCircle className="h-5 w-5 text-navy" />;
    case "request_completed": return <CheckCircle2 className="h-5 w-5 text-green" />;
    case "request_cancelled": return <XCircle className="h-5 w-5 text-muted-foreground" />;
    case "dispute_opened": return <AlertTriangle className="h-5 w-5 text-destructive" />;
    default: return <Star className="h-5 w-5 text-muted-foreground" />;
  }
};

const labelFor = (t: string) => {
  switch (t) {
    case "follow": return "New follower";
    case "like": return "New like";
    case "comment": return "New comment";
    case "recommendation": return "Recommendation";
    case "review": return "New review";
    case "feedback_received": return "Feedback received";
    case "request_new": return "New request";
    case "request_response_new": return "New response";
    case "request_accepted": return "Request accepted";
    case "request_response_chosen": return "Provider chosen";
    case "request_in_progress": return "In progress";
    case "request_completed": return "Completed";
    case "request_cancelled": return "Cancelled";
    case "dispute_opened": return "Dispute opened";
    default: return "Notification";
  }
};

function NotificationDetailPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState<Notif | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { tab: "login", redirect: `/notifications/${id}` } as never });
  }, [loading, user, navigate, id]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      setBusy(true);
      try {
        const { data: n } = await apiClient<{ data: Notif }>(`/notifications/${id}`);
        if (!active) return;
        if (!n) { setBusy(false); setNotif(null); return; }

        setNotif(n);
        setBusy(false);

        // Mark as read if unread
        if (!n.read) {
          apiClient(`/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
        }
      } catch (err) {
        if (!active) return;
        setBusy(false);
        setNotif(null);
      }
    };

    load();
    return () => { active = false; };
  }, [id, user?.id]);

  const targetHref = () => {
    if (!notif) return "/feed";
    if (notif.target_type === "service_request" && notif.target_id) return `/requests/${notif.target_id}`;
    if (notif.target_type === "service_feedback" && user) return `/u/${user.id}`;
    if (notif.target_type === "profile" && notif.target_id) return `/u/${notif.target_id}`;
    if (notif.target_type === "post" && user) return `/u/${user.id}`;
    return "/feed";
  };

  const targetLabel = () => {
    if (!notif) return "Go to feed";
    if (notif.target_type === "service_request") return "View request";
    if (notif.target_type === "service_feedback") return "View feedback";
    if (notif.target_type === "profile") return "View profile";
    if (notif.target_type === "post") return "View post";
    return "Go to feed";
  };

  if (!user) return null;

  return (
    <>
      <section className="mx-auto max-w-xl px-4 py-8">
        <button
          onClick={() => navigate({ to: "/notifications" })}
          className="inline-flex items-center gap-1 rounded-full p-2 text-navy hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {busy && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {!busy && !notif && (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-semibold text-navy">Notification not found</p>
            <p className="mt-1 text-sm text-muted-foreground">It may have been deleted or you don’t have access.</p>
          </div>
        )}

        {!busy && notif && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar name={notif.actor?.full_name ?? "User"} url={notif.actor?.avatar_url ?? null} size={56} />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-card p-1.5 shadow-sm">{iconFor(notif.type)}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">{labelFor(notif.type)}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(notif.created_at)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-navy">{notif.actor?.full_name ?? "Someone"}</span>{" "}
                <span className="text-muted-foreground">{notif.message}</span>
              </p>
            </div>

            <div className="mt-4">
              <Link
                to={targetHref() as any}
                className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground hover:brightness-110"
              >
                {targetLabel()}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
