import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, Loader2, Star, CheckCircle2, Copy, Send, Image as ImageIcon } from "lucide-react";

import { Avatar } from "@/components/social/Avatar";
import { StatusTracker } from "@/components/StatusTracker";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { SafetyNote, SAFETY_TIPS } from "@/components/SafetyNote";
import { MobileActionBar } from "@/components/MobileActionBar";
import { ContactOptionsUnlocked } from "@/components/ContactOptionsUnlocked";
import { MessageButton } from "@/components/MessageButton";
import { RouteErrorCard, RouteNotFoundCard } from "@/lib/route-boundaries";

export const Route = createFileRoute("/_authenticated/direct-bookings/$id")({
  head: () => ({ meta: [{ title: "Direct Booking — Tuungane" }] }),
  component: DirectBookingDetailsPage,
  errorComponent: ({ error, reset }) => <RouteErrorCard error={error} reset={reset} title="Couldn't load this booking" />,
  notFoundComponent: () => <RouteNotFoundCard title="Booking not found" message="This direct booking may have been removed." homeHref="/messages" homeLabel="Back to Messages" />,
});

type Profile = { id: string; full_name: string; avatar_url: string | null };

type DirectBooking = {
  id: string;
  customer_id: string;
  provider_id: string;
  service_needed: string;
  description: string | null;
  price_total: number | null;
  quantity: number | null;
  attachment_url: string | null;
  media_urls: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  provider?: Profile;
};

function DirectBookingDetailsPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [booking, setBooking] = useState<DirectBooking | null>(null);
  const [providerContact, setProviderContact] = useState<{ phone: string | null; whatsapp: string | null; email: string | null; name: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: `/direct-bookings/${id}` } as never });
  }, [loading, user, nav, id]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await apiClient<{ data: DirectBooking }>(`/direct-bookings/${id}`);
      if (!data) {
        toast.error("Booking not found or you don't have access");
        return;
      }
      setBooking(data);
      
      if (data.provider_id) {
        try {
          const { data: contact } = await apiClient<{ data: { phone?: string | null; whatsapp?: string | null; email?: string | null } }>(`/requests/provider_contact/${data.provider_id}`);
          setProviderContact({
            phone: contact?.phone ?? null,
            whatsapp: contact?.whatsapp ?? null,
            email: contact?.email ?? null,
            name: "Provider", // Minimal info for now
          });
        } catch (e) {
          setProviderContact(null);
        }
      }
    } catch (err) {
      toast.error("Booking not found or you don't have access");
    }
  }, [id, user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user || !booking) {
    return <><div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div></>;
  }

  const isCustomer = user.id === booking.customer_id;
  const isProvider = user.id === booking.provider_id;
  
  // The "other party" is the person the current user is dealing with
  const otherParty = isCustomer ? booking.provider : booking.customer;
  const otherRoleName = isCustomer ? "Provider" : "Customer";

  const updateStatus = async (status: string) => {
    setBusy(true);
    try {
      await apiClient(`/direct-bookings/${booking.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      toast.success(`Marked ${status.replace("_", " ")}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* 1. Header (Mobile & Desktop) */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4 md:h-16">
          <Link to="/messages" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">Booking Details</h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 md:py-8 lg:px-8 space-y-6 lg:space-y-8 pb-24 md:pb-12">
        {/* Tracker */}
        <StatusTracker 
          status={booking.status as any} 
          isAssignedProvider={isProvider} 
          isDirectBooking={true} 
          onUpdateStatus={updateStatus} 
        />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* The Booking Specs */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">{booking.service_needed}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                  ${booking.status === 'requested' ? 'bg-yellow-100 text-yellow-700' :
                    booking.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    booking.status === 'in_progress' ? 'bg-orange/15 text-orange' :
                    booking.status === 'completed' ? 'bg-green/15 text-green' :
                    'bg-red-100 text-red-700'}`}>
                  {booking.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-4">
                {booking.description && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</h3>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{booking.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  {booking.price_total !== null && (
                    <div className="bg-muted/50 p-3 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Agreed Price</p>
                      <p className="font-semibold text-foreground">UGX {Number(booking.price_total).toLocaleString()}</p>
                    </div>
                  )}
                  {booking.quantity !== null && (
                    <div className="bg-muted/50 p-3 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Quantity</p>
                      <p className="font-semibold text-foreground">{booking.quantity}</p>
                    </div>
                  )}
                </div>

                {/* Media Section */}
                {(booking.attachment_url || (booking.media_urls && booking.media_urls.length > 0)) && (
                  <div className="pt-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attachments</h3>
                    <div className="flex flex-wrap gap-3">
                      {booking.attachment_url && (
                        <a href={booking.attachment_url} target="_blank" rel="noreferrer" className="relative h-20 w-20 rounded-xl overflow-hidden border border-border bg-muted flex-shrink-0 group">
                           <img src={booking.attachment_url} alt="Attachment" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        </a>
                      )}
                      {booking.media_urls?.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="relative h-20 w-20 rounded-xl overflow-hidden border border-border bg-muted flex-shrink-0 group">
                           <img src={url} alt={`Attachment ${i}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground pt-4 border-t border-border mt-6">
                  Created {timeAgo(booking.created_at)}
                </p>
              </div>
            </section>

            {/* Provider/Customer Info */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
               <h3 className="font-semibold text-foreground mb-4">Your {otherRoleName}</h3>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar url={otherParty?.avatar_url || null} name={otherParty?.full_name || "User"} size={48} />
                    <div>
                      <p className="font-medium text-foreground">{otherParty?.full_name || "Unknown User"}</p>
                      <p className="text-sm text-muted-foreground">Tuungane Member</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <MessageButton 
                      otherUserId={otherParty?.id!} 
                      serviceRequestId={undefined} 
                      directBookingId={booking.id}
                      className="flex-1 sm:flex-none justify-center" 
                    />
                  </div>
               </div>

               {/* Contact details unmasked if active */}
               {isCustomer && booking.status !== "requested" && booking.status !== "cancelled" && booking.status !== "declined" && providerContact && (
                 <div className="mt-4 pt-4 border-t border-border">
                    <ContactOptionsUnlocked
                      phone={providerContact.phone}
                      whatsapp={providerContact.whatsapp}
                      email={providerContact.email}
                      name={otherParty?.full_name || "Provider"}
                    />
                 </div>
               )}
            </section>

          </div>

          {/* Right Column: Actions & Safety */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground">Actions</h3>
              
              {isProvider && booking.status === "requested" && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => updateStatus("accepted")}
                    disabled={busy}
                    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Accept Booking
                  </button>
                  <button
                    onClick={() => updateStatus("declined")}
                    disabled={busy}
                    className="w-full rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}

              {isCustomer && booking.status === "requested" && (
                 <div className="flex flex-col gap-2">
                   <button
                    onClick={() => updateStatus("cancelled")}
                    disabled={busy}
                    className="w-full rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Cancel Booking
                  </button>
                 </div>
              )}

              {(booking.status === "accepted" || booking.status === "in_progress") && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => updateStatus(isProvider ? "in_progress" : "completed")}
                    disabled={busy}
                    className="w-full rounded-xl bg-green/10 px-4 py-2.5 text-sm font-semibold text-green hover:bg-green/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {isProvider ? (booking.status === "accepted" ? "Start Job" : "Mark as Completed") : "Confirm Job Complete"}
                  </button>
                </div>
              )}

              {booking.status === "completed" && (
                 <div className="rounded-xl bg-green/10 p-3 text-center text-sm font-medium text-green">
                   This booking has been completed.
                 </div>
              )}
              {(booking.status === "cancelled" || booking.status === "declined") && (
                 <div className="rounded-xl bg-muted p-3 text-center text-sm font-medium text-muted-foreground">
                   This booking is {booking.status}.
                 </div>
              )}

            </section>

            <SafetyNote tips={[SAFETY_TIPS.PAYMENTS, SAFETY_TIPS.COMMUNICATION, SAFETY_TIPS.REVIEWS]} />
          </div>
        </div>
      </main>

      <MobileActionBar
        items={[
          {
            icon: ArrowLeft,
            label: "Back",
            onClick: () => nav({ to: "/messages" }),
            primary: false,
          },
          {
            icon: Send,
            label: "Message",
            onClick: () => {
              // Message button handles the actual action, we can just trigger it visually or rely on the in-page button
            },
            primary: true,
          }
        ]}
      />
    </>
  );
}
