import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/social/Avatar";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — Tuungane" }] }),
  component: MessagesIndex,
});

type Row = {
  id: string;
  service_request_id: string | null;
  customer_id: string;
  provider_id: string;
  status: string;
  last_message_at: string;
  last_message_preview: string | null;
  customer_unread_count: number;
  provider_unread_count: number;
};


type Profile = { id: string; full_name: string; avatar_url: string | null };
type Req = { id: string; service_needed: string; title: string | null };

function MessagesIndex() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [requests, setRequests] = useState<Map<string, Req>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      try {
        const { data } = await apiClient<{ data: any[] }>("/messages");
        if (!active) return;
        
        let list = data.data || [];

        // --- DUMMY DATA FOR PREVIEW ---
        if (list.length === 0) {
          list = [
            {
              id: "dummy-1",
              service_request_id: "req-1",
              customer_id: user.id,
              provider_id: "prov-1",
              status: "active",
              last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
              last_message_preview: "Yes, I can come over this afternoon to fix the sink.",
              customer_unread_count: 2,
              provider_unread_count: 0,
              otherProfile: { id: "prov-1", full_name: "John's Plumbing", avatar_url: "https://i.pravatar.cc/150?u=johns-plumbing" },
              request: { id: "req-1", service_needed: "Plumbing", title: "Leaking sink in kitchen" }
            },
            {
              id: "dummy-2",
              service_request_id: "req-2",
              customer_id: user.id,
              provider_id: "prov-2",
              status: "active",
              last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              last_message_preview: "Thank you for the excellent service!",
              customer_unread_count: 0,
              provider_unread_count: 0,
              otherProfile: { id: "prov-2", full_name: "Kato Electricals", avatar_url: "https://i.pravatar.cc/150?u=kato-electricals" },
              request: { id: "req-2", service_needed: "Electrical", title: "Wiring for new extension" }
            },
            {
              id: "dummy-3",
              service_request_id: null,
              customer_id: user.id,
              provider_id: "prov-3",
              status: "active",
              last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
              last_message_preview: "Could you send me a quote for the painting job?",
              customer_unread_count: 0,
              provider_unread_count: 0,
              otherProfile: { id: "prov-3", full_name: "Sarah Painter", avatar_url: "https://i.pravatar.cc/150?img=47" },
            }
          ];
        }
        // ------------------------------

        setRows(list as Row[]);

        const pMap = new Map<string, Profile>();
        const rMap = new Map<string, Req>();

        for (const r of list) {
          if (r.otherProfile) {
            pMap.set(r.otherProfile.id, r.otherProfile);
          }
          if (r.request) {
            rMap.set(r.request.id, r.request);
          }
        }

        setProfiles(pMap);
        setRequests(rMap);
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    load();
    const interval = setInterval(load, 10000); // poll every 10s
    return () => { active = false; clearInterval(interval); };
  }, [user?.id]);

  if (!user) return null;

  return (
    <>
      <section className="mx-auto max-w-7xl w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pt-8 md:pb-8">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-orange/10 p-2 text-orange"><MessageSquare className="h-5 w-5" /></div>
          <h1 className="font-display text-2xl font-bold text-navy">Messages</h1>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-green/30 bg-green/5 p-3 text-xs sm:text-sm text-foreground/80">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
          <p>For safety, tracking, and verified reviews, keep communication on Tuungane. Tuungane Messages help protect both customers and providers.</p>
        </div>

        <div className="mt-5 space-y-2 w-full min-w-0">
          {!loaded && <p className="text-sm text-muted-foreground">Loading…</p>}
          {loaded && rows.length === 0 && (
            <div className="py-4 w-full min-w-0">
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Message a provider from their profile or a service listing to start a conversation."
                action={{ label: "Browse services", to: "/services" }}
              />
            </div>
          )}
          {rows.map((r) => {
            const otherId = r.customer_id === user.id ? r.provider_id : r.customer_id;
            const other = profiles.get(otherId);
            const req = r.service_request_id ? requests.get(r.service_request_id) : null;
            const unread = r.customer_id === user.id ? r.customer_unread_count : r.provider_unread_count;
            return (
              <Link key={r.id} to="/messages/$id" params={{ id: r.id }} className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-orange">
                <Avatar name={other?.full_name ?? "User"} url={other?.avatar_url ?? null} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-navy">{other?.full_name ?? "User"}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.last_message_at)}</span>
                  </div>
                  {req && <p className="truncate text-[11px] text-muted-foreground">Re: {req.title ?? req.service_needed}</p>}
                  <p className="truncate text-sm text-foreground/75">{r.last_message_preview ?? "Start the conversation"}</p>
                </div>
                {unread > 0 && (
                  <span className="ml-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-orange px-2 text-xs font-bold text-orange-foreground">{unread}</span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
