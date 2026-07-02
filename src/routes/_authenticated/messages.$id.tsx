import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Send, ShieldCheck, Flag, Ban, Loader2, MapPin, ExternalLink, CheckCircle2, Star } from "lucide-react";
import { Avatar } from "@/components/social/Avatar";
import { toast } from "sonner";
import { markConversationRead } from "@/lib/messaging";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({ meta: [{ title: "Conversation — Tuungane" }] }),
  component: ConversationPage,
});

type Conv = {
  id: string;
  service_request_id: string;
  customer_id: string;
  provider_id: string;
  status: string;
  provider_response_id: string | null;
};

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  is_read: boolean;
};

type Profile = { id: string; full_name: string; avatar_url: string | null };
type Req = { id: string; service_needed: string; title: string | null; status: string; location: string | null; budget_range: string | null; selected_provider_id: string | null; urgent_flag: boolean | null; urgency: string | null; public_profile_id: string | null };
type ServiceProfile = { id: string; name: string };


function ConversationPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conv, setConv] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [req, setReq] = useState<Req | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data: c, error } = await supabase.from("conversations").select("id,service_request_id,customer_id,provider_id,status,provider_response_id").eq("id", id).maybeSingle();
      if (!active) return;
      if (error || !c) { setBusy(false); return; }
      setConv(c as Conv);
      const otherId = c.customer_id === user.id ? c.provider_id : c.customer_id;
      const [{ data: prof }, { data: r }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url").eq("id", otherId).maybeSingle(),
        c.service_request_id
          ? supabase.from("service_requests").select("id,service_needed,title,status,location,budget_range,selected_provider_id,urgent_flag,urgency").eq("id", c.service_request_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("messages").select("id,conversation_id,sender_id,receiver_id,body,created_at,is_read").eq("conversation_id", id).order("created_at", { ascending: true }),
      ]);

      if (!active) return;
      setOther((prof ?? null) as Profile | null);
      setReq((r ?? null) as Req | null);
      setMessages((msgs ?? []) as Msg[]);
      setBusy(false);
      void markConversationRead(id);
    };

    load();

    const ch = supabase
      .channel(`conv-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) => {
        setMessages((prev) => {
          const m = payload.new as Msg;
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        if ((payload.new as Msg).receiver_id === user.id) void markConversationRead(id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${id}` }, (payload) => {
        setConv((prev) => (prev ? { ...prev, ...(payload.new as Conv) } : prev));
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [id, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !conv) return;
    const body = text.trim();
    if (!body) return;
    if (body.length > 4000) { toast.error("Message too long"); return; }
    setSending(true);
    const receiverId = conv.customer_id === user.id ? conv.provider_id : conv.customer_id;
    const { error } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      receiver_id: receiverId,
      body,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText("");
  };

  const reportConversation = async () => {
    if (!conv) return;
    const reason = prompt("Briefly describe the issue (visible to moderators):");
    if (!reason) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user!.id,
      target_type: "conversation",
      target_id: conv.id,
      reason: reason.slice(0, 1000),
    });
    if (error) toast.error(error.message);
    else toast.success("Reported. Moderators will review.");
  };

  const blockOther = async () => {
    if (!conv || !user) return;
    const otherId = conv.customer_id === user.id ? conv.provider_id : conv.customer_id;
    if (!confirm("Block this user? They won't be able to message you again.")) return;
    const { error } = await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: otherId });
    if (error) toast.error(error.message);
    else { toast.success("User blocked"); navigate({ to: "/messages" }); }
  };

  if (!user) return null;
  if (busy) return <Layout><div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading…</div></Layout>;
  if (!conv) return <Layout><div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Conversation not found.</div></Layout>;

  return (
    <Layout hideFooter>
      <section className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col md:h-[calc(100dvh-4rem)]">


        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button onClick={() => navigate({ to: "/messages" })} className="rounded-full p-1.5 text-navy hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/u/$id" params={{ id: other?.id ?? "" }} className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar name={other?.full_name ?? "User"} url={other?.avatar_url ?? null} size={36} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy">{other?.full_name ?? "User"}</p>
              {req && <p className="truncate text-[11px] text-muted-foreground">Re: {req.title ?? req.service_needed}</p>}
            </div>
          </Link>
          <Link to="/requests/$id" params={{ id: conv.service_request_id }} className="hidden rounded-full border border-border px-3 py-1 text-xs font-semibold text-navy hover:border-orange sm:inline-flex">Open request</Link>
          <button onClick={reportConversation} aria-label="Report" className="rounded-full p-2 text-muted-foreground hover:text-destructive"><Flag className="h-4 w-4" /></button>
          <button onClick={blockOther} aria-label="Block" className="rounded-full p-2 text-muted-foreground hover:text-destructive"><Ban className="h-4 w-4" /></button>
        </div>

        {/* Request summary card — keeps messaging tied to the service request */}
        {req && (
          <div className="mx-4 mt-3 rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-navy">{req.status.replace("_", " ")}</span>
                  {(req.urgent_flag || req.urgency === "urgent" || req.urgency === "today") && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">Urgent</span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-navy">{req.title || req.service_needed}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  {req.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.location}</span>}
                  {req.budget_range && <span>Budget: {req.budget_range}</span>}
                  <span>With: {other?.full_name ?? "User"}</span>
                </div>
              </div>
              <Link to="/requests/$id" params={{ id: req.id }} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange">
                <ExternalLink className="h-3 w-3" /> View
              </Link>
            </div>

            {/* Next-step shortcuts (link into request page where actions execute) */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {conv.customer_id === user.id && req.status === "requested" && (
                <Link to="/requests/$id" params={{ id: req.id }} className="rounded-full bg-orange px-3 py-1 text-[11px] font-semibold text-orange-foreground hover:brightness-110">Select provider</Link>
              )}
              {conv.provider_id === user.id && req.status === "accepted" && (
                <Link to="/requests/$id" params={{ id: req.id }} className="rounded-full bg-orange px-3 py-1 text-[11px] font-semibold text-orange-foreground hover:brightness-110">
                  <CheckCircle2 className="mr-1 inline h-3 w-3" /> Mark in progress
                </Link>
              )}
              {req.status === "in_progress" && (
                <Link to="/requests/$id" params={{ id: req.id }} className="rounded-full bg-orange px-3 py-1 text-[11px] font-semibold text-orange-foreground hover:brightness-110">Complete service</Link>
              )}
              {conv.customer_id === user.id && req.status === "completed" && (
                <Link to="/requests/$id" params={{ id: req.id }} className="rounded-full bg-orange px-3 py-1 text-[11px] font-semibold text-orange-foreground hover:brightness-110">
                  <Star className="mr-1 inline h-3 w-3" /> Leave review
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Trust note */}
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-xl border border-green/30 bg-green/5 p-2.5 text-[11px] text-foreground/80">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" />
          <p>For safety and verified reviews, keep key service details on Tuungane.</p>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {messages.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No messages yet — say hello.</p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-orange text-orange-foreground" : "bg-muted text-navy"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "text-orange-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>

        {/* Sticky composer */}
        <div className="sticky bottom-0 border-t border-border bg-background px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={1}
              maxLength={4000}
              placeholder="Type a message…"
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-border bg-card px-3 py-2 text-sm focus:border-orange focus:outline-none"
            />
            <button onClick={send} disabled={sending || !text.trim()} aria-label="Send" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange text-orange-foreground disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

