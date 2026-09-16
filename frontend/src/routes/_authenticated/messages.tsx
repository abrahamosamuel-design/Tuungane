import { createFileRoute, Outlet, useMatchRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, createContext, useContext } from "react";
import { MessageSquare, Briefcase, ShieldCheck } from "lucide-react";
import { useMyCounts } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

type Tab = "messages" | "booked";

export type MessagesOutletContext = {
  tab: Tab;
  setTab: (t: Tab) => void;
  isRoot: boolean;
  hasId: boolean;
};

export const MessagesContext = createContext<MessagesOutletContext | null>(null);

export function useMessagesContext() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessagesContext must be used within MessagesLayout");
  return ctx;
}

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

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages & Booked Jobs — Tuungane" }] }),
  component: MessagesLayout,
});

function MessagesLayout() {
  const [tab, setTab] = useState<Tab>("messages");
  const counts = useMyCounts();
  const matchRoute = useMatchRoute();
  const isRoot = !!matchRoute({ to: "/messages", exact: true });
  const params = useParams({ strict: false }) as any;
  const hasId = !!params.id;
  const { user } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [requests, setRequests] = useState<Map<string, Req>>(new Map());
  const [msgLoaded, setMsgLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      try {
        const { data } = await apiClient<{ data: any[] }>("/messages");
        if (!active) return;
        let list = Array.isArray(data) ? data : (data?.data || []);
        setRows(list as Row[]);
        const pMap = new Map<string, Profile>();
        const rMap = new Map<string, Req>();
        for (const r of list) {
          if (r.otherProfile) pMap.set(r.otherProfile.id, r.otherProfile);
          if (r.request) rMap.set(r.request.id, r.request);
        }
        setProfiles(pMap);
        setRequests(rMap);
        setMsgLoaded(true);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [user?.id]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-canvas-subtle lg:bg-transparent">
      {/* ─── TOP HEADER & TOGGLE PILL ─── */}
      <div className={`${hasId ? 'hidden' : 'block'} bg-surface-container-lowest border-b border-border-hairline sticky top-0 lg:top-[64px] z-30`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold text-outline tracking-wider uppercase">Communication & Escrow Workspace</span>
                <span className="text-border-hairline">·</span>
                <span className="inline-flex items-center gap-1 bg-green/10 border border-green/30 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></span>
                  Escrow Protection Live
                </span>
              </div>
              <h1 className="text-xl font-bold text-navy-dark tracking-tight leading-tight">Messages & Booked Jobs</h1>
              <p className="text-xs text-on-surface-variant max-w-2xl mt-0.5 hidden sm:block">
                Manage your direct client conversations, service inquiries, and project communications.
              </p>
            </div>
            {/* Segmented Control */}
            <div className="bg-surface-alt p-1 rounded-xl flex items-center border border-border-hairline shadow-inner self-start md:self-auto shrink-0 scale-95 origin-right">
              <Link
                to="/messages"
                onClick={() => setTab("messages")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                  tab === "messages"
                    ? "bg-surface-container-lowest text-navy-dark font-semibold shadow-sm"
                    : "text-on-surface-variant hover:text-navy-dark font-medium"
                }`}
              >
                <MessageSquare className={`h-4 w-4 ${tab === "messages" ? "text-orange" : "text-outline"}`} />
                <span>Messages</span>
              </Link>
              <Link
                to="/messages"
                onClick={() => setTab("booked")}
                className={`relative flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                  tab === "booked"
                    ? "bg-surface-container-lowest text-navy-dark font-semibold shadow-sm"
                    : "text-on-surface-variant hover:text-navy-dark font-medium"
                }`}
              >
                <Briefcase className={`h-4 w-4 ${tab === "booked" ? "text-orange" : "text-outline"}`} />
                <span>Booked Jobs</span>
                {counts.activeRequests > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange ring-2 ring-surface-container-lowest"></span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <MessagesContext.Provider value={{ tab, setTab, isRoot, hasId }}>
        <main className={`flex flex-col flex-1 min-h-0 w-full max-w-7xl mx-auto ${tab === 'messages' ? 'px-0 lg:px-8 py-0 lg:py-4' : 'px-4 sm:px-6 lg:px-8 py-4'}`}>
          {tab === "messages" ? (
            <div className="flex-1 min-h-0 w-full bg-surface-container-lowest border-0 lg:border border-border-hairline lg:rounded-2xl lg:shadow-sm flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT COLUMN: Conversation List */}
              <aside className={`w-full lg:w-96 shrink-0 border-r-0 lg:border-r border-border-hairline flex-col bg-surface-container-lowest ${hasId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-border-hairline bg-surface-container-lowest space-y-3">
                   <div className="flex items-start gap-2 rounded-xl border border-green/30 bg-green/5 p-3 text-xs text-foreground/80">
                     <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                     <p>For safety, keep communication on Tuungane.</p>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-border-hairline [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {!msgLoaded && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
                  {msgLoaded && rows.length === 0 && (
                    <div className="p-4">
                      <EmptyState
                        icon={MessageSquare}
                        title="No conversations yet"
                        description="Message a provider from their profile or a service listing to start a conversation."
                        action={{ label: "Browse services", to: "/services" }}
                      />
                    </div>
                  )}
                  {rows.map((r) => {
                    const otherId = r.customer_id === user?.id ? r.provider_id : r.customer_id;
                    const other = profiles.get(otherId);
                    const req = r.service_request_id ? requests.get(r.service_request_id) : null;
                    const unread = r.customer_id === user?.id ? r.customer_unread_count : r.provider_unread_count;
                    const isActive = params.id === r.id;
                    
                    return (
                      <Link key={r.id} to="/messages/$id" params={{ id: r.id }} className={`flex w-full min-w-0 items-start gap-3 p-3.5 transition-colors ${isActive ? 'bg-orange/5 border-l-4 border-orange' : 'hover:bg-surface-alt/70 border-l-4 border-transparent'}`}>
                        <div className="relative shrink-0">
                          <Avatar name={other?.full_name ?? "User"} url={other?.avatar_url ?? null} size={44} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-sm font-bold text-navy-dark truncate">{other?.full_name ?? "User"}</span>
                            <span className="text-[11px] font-semibold text-outline">{timeAgo(r.last_message_at)}</span>
                          </div>
                          {req && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-outline mb-1 truncate max-w-full">
                              <span className="truncate">Re: {req.title ?? req.service_needed}</span>
                            </div>
                          )}
                          <p className={`text-xs line-clamp-1 ${unread > 0 ? 'text-navy-dark font-medium' : 'text-on-surface-variant'}`}>{r.last_message_preview ?? "Start the conversation"}</p>
                        </div>
                        {unread > 0 && (
                          <div className="shrink-0 self-center ml-2">
                            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-bold text-white shadow-sm">{unread}</span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </aside>
              
              {/* RIGHT COLUMN: Active Chat (Outlet) */}
              <section className={`flex-1 ${hasId ? 'flex' : 'hidden lg:flex'} flex-col bg-surface-container-lowest min-h-0`}>
                <Outlet />
              </section>
            </div>
          ) : (
            /* Booked Jobs Tab */
            <Outlet />
          )}
        </main>
      </MessagesContext.Provider>
    </div>
  );
}
