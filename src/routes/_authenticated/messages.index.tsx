import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/social/Avatar";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — Tuungane" }] }),
  component: MessagesIndex,
});

type Row = {
  id: string;
  service_request_id: string;
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
      const { data } = await supabase
        .from("conversations")
        .select("id,service_request_id,customer_id,provider_id,status,last_message_at,last_message_preview,customer_unread_count,provider_unread_count")
        .or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (!active) return;
      const list = (data ?? []) as Row[];
      setRows(list);

      const userIds = Array.from(new Set(list.flatMap((r) => [r.customer_id, r.provider_id]).filter((id) => id !== user.id)));
      const reqIds = Array.from(new Set(list.map((r) => r.service_request_id)));

      const [{ data: profs }, { data: reqs }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id,full_name,avatar_url").in("id", userIds) : Promise.resolve({ data: [] }),
        reqIds.length ? supabase.from("service_requests").select("id,service_needed,title").in("id", reqIds) : Promise.resolve({ data: [] }),
      ]);
      if (!active) return;
      setProfiles(new Map((profs ?? []).map((p) => [p.id, p as Profile])));
      setRequests(new Map((reqs ?? []).map((r) => [r.id, r as Req])));
      setLoaded(true);
    };

    load();
    const ch = supabase
      .channel(`msgs-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 pt-6 pb-24">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-orange/10 p-2 text-orange"><MessageSquare className="h-5 w-5" /></div>
          <h1 className="font-display text-2xl font-bold text-navy">Messages</h1>
        </div>
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-green/30 bg-green/5 p-3 text-xs text-foreground/80">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
          <p>For safety, tracking, and verified reviews, keep communication on Tuungane. Tuungane Messages help protect both customers and providers.</p>
        </div>

        <div className="mt-5 space-y-2">
          {!loaded && <p className="text-sm text-muted-foreground">Loading…</p>}
          {loaded && rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-navy">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Submit a request, then message providers directly from their response.</p>
            </div>
          )}
          {rows.map((r) => {
            const otherId = r.customer_id === user.id ? r.provider_id : r.customer_id;
            const other = profiles.get(otherId);
            const req = requests.get(r.service_request_id);
            const unread = r.customer_id === user.id ? r.customer_unread_count : r.provider_unread_count;
            return (
              <Link key={r.id} to="/messages/$id" params={{ id: r.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-orange">
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
    </Layout>
  );
}
