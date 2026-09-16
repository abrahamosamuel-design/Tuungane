import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Send, ShieldCheck, Flag, Ban, Loader2, MapPin, ExternalLink, CheckCircle2, Star, Download, ChevronLeft, ChevronRight, Check, CheckCheck, Clock } from "lucide-react";
import { Avatar } from "@/components/social/Avatar";
import { toast } from "sonner";
import { markConversationRead } from "@/lib/messaging";
import { AcceptJobDialog } from "@/components/pages/profile/AcceptJobDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/messages/$id")({
    staticData: {
      hideFooter: true,
      hideBottomNavOnMobile: true
    },
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
  _status?: 'sending' | 'error';
};

type Profile = { id: string; full_name: string; avatar_url: string | null };
type Req = { id: string; service_needed: string; title: string | null; description?: string | null; status: string; location: string | null; budget_range: string | null; selected_provider_id: string | null; urgent_flag: boolean | null; urgency: string | null; public_profile_id: string | null; quantity: number | null; price_total: number | null; attachment_url?: string | null; media_urls?: string[] | null; };
type ServiceProfile = { id: string; name: string };


function ConversationPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conv, setConv] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [req, setReq] = useState<Req | null>(null);
  const [serviceProfile, setServiceProfile] = useState<ServiceProfile | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(true);
  const [acceptJobOpen, setAcceptJobOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const allImages = req ? [req.attachment_url, ...(req.media_urls || [])].filter(Boolean) as string[] : [];

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "tuungane-attachment.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Failed to download image", err);
      window.open(url, "_blank");
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      if (id === "mockup") {
        setConv({ id: "mockup", service_request_id: "req1", customer_id: user?.id ?? "c1", provider_id: "p1", status: "open", provider_response_id: null });
        setOther({ id: "p1", full_name: "Jane Doe", avatar_url: null });
        setReq({ id: "req1", service_needed: "Fix leaking pipe", title: "Emergency Kitchen Leak", status: "requested", location: "Nairobi", budget_range: "KES 2000 - 5000", selected_provider_id: null, urgent_flag: true, urgency: "urgent", public_profile_id: null });
        setServiceProfile({ id: "sp1", name: "Jane's Plumbing Services" });
        setMessages([
          { id: "m1", conversation_id: "mockup", sender_id: user?.id ?? "c1", receiver_id: "p1", body: "Hi Jane, I have an emergency leak in my kitchen. Can you help?", created_at: new Date(Date.now() - 3600000).toISOString(), is_read: true },
          { id: "m2", conversation_id: "mockup", sender_id: "p1", receiver_id: user?.id ?? "c1", body: "Hello! Yes, I can come over in about 30 minutes. Please turn off the main water valve.", created_at: new Date(Date.now() - 3500000).toISOString(), is_read: true },
          { id: "m3", conversation_id: "mockup", sender_id: user?.id ?? "c1", receiver_id: "p1", body: "Just turned it off. See you soon!", created_at: new Date(Date.now() - 3400000).toISOString(), is_read: true },
        ]);
        setBusy(false);
        return;
      }
      
      try {
        const response = await apiClient<{ data: { conv: Conv, other: Profile | null, req: Req | null, messages: Msg[], serviceProfile: ServiceProfile | null } }>(`/messages/${id}`);
        if (!active) return;
        
        const { conv: c, other: prof, req: r, messages: msgs, serviceProfile: sp } = response.data;
        
        setConv(c);
        setOther(prof);
        setReq(r);
        setMessages(msgs || []);
        setServiceProfile(sp);
        setBusy(false);
        void markConversationRead(id);
      } catch (err) {
        if (!active) return;
        console.error("Failed to fetch conversation", err);
        setBusy(false);
      }
    };

    load();

    const interval = setInterval(load, 5000); // Poll every 5s for new messages

    return () => { active = false; clearInterval(interval); };
  }, [id, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !conv) return;
    const body = text.trim();
    if (!body) return;
    if (body.length > 4000) { toast.error("Message too long"); return; }
    
    const tempId = "temp-" + Date.now();
    const optimisticMsg: Msg = {
      id: tempId,
      conversation_id: conv.id,
      sender_id: user.id,
      receiver_id: conv.customer_id === user.id ? conv.provider_id : conv.customer_id,
      body,
      created_at: new Date().toISOString(),
      is_read: false,
      _status: 'sending'
    };
    
    setMessages((prev) => [...prev, optimisticMsg]);
    setText("");
    setSending(true);
    try {
      const response = await apiClient.post<{ data: Msg }>(`/messages/${conv.id}/messages`, { body });
      setMessages((prev) => prev.map(m => m.id === tempId ? response.data : m));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send message");
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const reportConversation = async () => {
    if (!conv) return;
    const reason = prompt("Briefly describe the issue (visible to moderators):");
    if (!reason) return;
    try {
      await apiClient.post(`/messages/${conv.id}/report`, { reason });
      toast.success("Reported. Moderators will review.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to report");
    }
  };

  const blockOther = async () => {
    if (!conv || !user) return;
    const otherId = conv.customer_id === user.id ? conv.provider_id : conv.customer_id;
    if (!confirm("Block this user? They won't be able to message you again.")) return;
    try {
      await apiClient.post(`/messages/block`, { id: otherId });
      toast.success("User blocked");
      navigate({ to: "/messages" });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to block user");
    }
  };

  if (!user) return null;
  if (busy) return <><div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading…</div></>;
  if (!conv) return <><div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Conversation not found.</div></>;

  return (
    <>
      <section className="w-full flex flex-1 min-h-0 flex-col bg-surface-container-lowest relative">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button onClick={() => navigate({ to: "/messages" })} className="lg:hidden rounded-full p-1.5 text-navy hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/u/$id" params={{ id: other?.id ?? "" }} className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar name={other?.full_name ?? "User"} url={other?.avatar_url ?? null} size={36} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy">
                {serviceProfile?.name ?? other?.full_name ?? "User"}
              </p>
              {serviceProfile ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  Contacting: {serviceProfile.name}{other?.full_name ? ` · ${other.full_name}` : ""}
                </p>
              ) : req ? (
                <p className="truncate text-[11px] text-muted-foreground">Re: {req.title ?? req.service_needed}</p>
              ) : null}
            </div>
          </Link>

          {conv.service_request_id && (
            <Link to="/requests/$id" params={{ id: conv.service_request_id }} className="hidden rounded-full border border-border px-3 py-1 text-xs font-semibold text-navy hover:border-orange sm:inline-flex">Open request</Link>
          )}
          {conv.direct_booking_id && (
            <Link to="/direct-bookings/$id" params={{ id: conv.direct_booking_id }} className="hidden rounded-full border border-border px-3 py-1 text-xs font-semibold text-navy hover:border-orange sm:inline-flex">Open booking</Link>
          )}
          <button onClick={reportConversation} aria-label="Report" className="rounded-full p-2 text-muted-foreground hover:text-destructive"><Flag className="h-4 w-4" /></button>
          <button onClick={blockOther} aria-label="Block" className="rounded-full p-2 text-muted-foreground hover:text-destructive"><Ban className="h-4 w-4" /></button>
        </div>

        {/* Thread container wrapping cards and messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Request summary card — keeps messaging tied to the service request */}
        {req && (
          <div className="mb-2 rounded-xl bg-navy/5 lg:bg-surface-alt lg:border lg:border-border-hairline p-2.5 border-0 lg:shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase text-navy shadow-sm">{req.status.replace("_", " ")}</span>
                  {(req.urgent_flag || req.urgency === "urgent" || req.urgency === "today") && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-extrabold uppercase text-destructive">Urgent</span>
                  )}
                  <p className="text-sm font-bold text-navy leading-tight line-clamp-1 ml-1">{req.title || req.service_needed}</p>
                </div>
                
                {/* Images row - mini version */}
                {allImages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {allImages.map((url, idx) => (
                      <img 
                        key={idx} 
                        src={url} 
                        alt="Media" 
                        onClick={() => setSelectedImageIndex(idx)}
                        className="h-8 w-8 cursor-pointer rounded-md border border-black/5 object-cover transition-opacity hover:opacity-80" 
                      />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-navy/80">
                  {req.quantity && <span>Qty: <span className="font-bold text-navy">{req.quantity}</span></span>}
                  {req.price_total && <span>Total: <span className="font-bold text-navy">UGX {req.price_total.toLocaleString()}</span></span>}
                  {req.location && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3 text-orange" /> {req.location}</span>}
                  {req.budget_range && <span>Budget: {req.budget_range}</span>}
                </div>
              </div>
              
              {/* Next-step shortcuts (link into request page where actions execute) */}
              <div className="flex flex-wrap gap-1.5 shrink-0 self-start sm:self-center">
                {conv.customer_id === user.id && req.status === "requested" && (
                  <Link to={conv.direct_booking_id ? "/direct-bookings/$id" : "/requests/$id"} params={{ id: req.id }} className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-navy-foreground hover:brightness-110">
                    {conv.direct_booking_id ? "View booking" : "Select provider"}
                  </Link>
                )}
                {conv.provider_id === user.id && req.status === "requested" && (
                  <button onClick={() => setAcceptJobOpen(true)} className="rounded-full bg-green px-2.5 py-1 text-[10px] font-semibold text-white hover:brightness-110">
                    <CheckCircle2 className="mr-1 inline h-3 w-3" /> Accept
                  </button>
                )}
                {conv.provider_id === user.id && req.status === "accepted" && (
                  <Link to={conv.direct_booking_id ? "/direct-bookings/$id" : "/requests/$id"} params={{ id: req.id }} className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-navy-foreground hover:brightness-110">
                    <CheckCircle2 className="mr-1 inline h-3 w-3" /> Start
                  </Link>
                )}
                {req.status === "in_progress" && (
                  <Link to={conv.direct_booking_id ? "/direct-bookings/$id" : "/requests/$id"} params={{ id: req.id }} className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-navy-foreground hover:brightness-110">Complete</Link>
                )}
                {conv.customer_id === user.id && req.status === "completed" && (
                  <Link to={conv.direct_booking_id ? "/direct-bookings/$id" : "/requests/$id"} params={{ id: req.id }} className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-navy-foreground hover:brightness-110">
                    <Star className="mr-1 inline h-3 w-3" /> Review
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trust note */}
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-green/10 p-3 text-xs font-medium text-green-700 border-0">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>For safety and verified reviews, keep key service details on Tuungane.</p>
        </div>

        {/* Thread */}
        <div className="space-y-2">
            {messages.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No messages yet — say hello.</p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-navy text-navy-foreground" : "bg-muted text-navy"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-navy-foreground/70 justify-end" : "text-muted-foreground"}`}>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {mine && (
                        m._status === 'sending' ? <Clock className="h-3 w-3 opacity-70" /> :
                        m.is_read ? <CheckCheck className="h-3 w-3 text-orange" /> :
                        <Check className="h-3 w-3 opacity-70" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>

        {/* Composer footer */}
        <div className="shrink-0 bg-background border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-3">
          <div className="mx-auto lg:max-w-none max-w-3xl flex items-end gap-2 rounded-full bg-muted/30 p-1.5 focus-within:bg-muted/50 focus-within:ring-2 focus-within:ring-navy/20 transition-all">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={1}
              maxLength={4000}
              placeholder="Type a message…"
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-4 py-2.5 text-sm focus:outline-none placeholder:text-muted-foreground/70"
            />
            <button onClick={send} disabled={sending || !text.trim()} aria-label="Send" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange text-orange-foreground shadow-sm hover:brightness-110 transition-all disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
            </button>
          </div>
        </div>
      </section>

      {req && acceptJobOpen && (
        <AcceptJobDialog
          open={acceptJobOpen}
          onOpenChange={setAcceptJobOpen}
          requestId={req.id}
          initialPrice={req.price_total || 0}
          onAccepted={() => setReq({ ...req, status: 'accepted' })}
          isDirectBooking={!!conv.direct_booking_id}
        />
      )}

      {/* Image viewer dialog */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={(open) => !open && setSelectedImageIndex(null)}>
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none [&>button]:text-white outline-none">
          {selectedImageIndex !== null && allImages[selectedImageIndex] && (
            <>
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(allImages[selectedImageIndex]); }}
                title="Download Image"
                className="absolute right-10 top-4 rounded-sm opacity-70 cursor-pointer transition-opacity hover:opacity-100 focus:outline-none text-white z-50 flex items-center justify-center"
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </button>

              <div className="relative flex flex-col items-center justify-center group mt-10">
                <img src={allImages[selectedImageIndex]} alt="Attachment full" className="max-h-[85vh] w-auto rounded-md object-contain" />

              {allImages.length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((prev) => prev! === 0 ? allImages.length - 1 : prev! - 1); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70 shadow-md"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((prev) => prev! === allImages.length - 1 ? 0 : prev! + 1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70 shadow-md"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

