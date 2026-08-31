import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, MessageSquare, Clock, ImageIcon, Phone, Coins, Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthGate } from "@/components/RequireAuthDialog";
import { PostCard } from "@/components/social/PostCard";
import { AddTimelinePostDialog } from "@/components/AddTimelinePostDialog";
import { useAuth } from "@/hooks/use-auth";
import { useCreditWallet } from "@/hooks/use-credits";
import { DirectBookingDialog } from "@/components/pages/profile/DirectBookingDialog";

export const Route = createFileRoute("/service/$id")({
  staticData: { hideHeaderOnMobile: true, hideBottomNavOnMobile: true, hideHeader: true, hideBottomNav: true },
  head: () => ({
    meta: [{ title: "Service Details — Tuungane" }],
  }),
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { requireAuth } = useAuthGate();
  const { user } = useAuth();
  const { balance } = useCreditWallet();
  
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reviews" | "timeline">("reviews");
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const isOwner = user?.id && service && (user.id === service.user_profile_id || user.id === service.profile?.owner_id);

  const fetchService = async () => {
    try {
      const res = await apiClient<{ data: any }>(`/services/detail/${id}`);
      setService(res.data);
    } catch (err) {
      console.error("Failed to load service", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchService();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading service...</div>;
  }

  if (!service) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Service not found.</p>
        <button onClick={() => window.history.back()} className="mt-4 text-orange">Go Back</button>
      </div>
    );
  }

  // Gather all available images and deduplicate
  let images: string[] = [];
  if (service.media && service.media.length > 0) {
    images.push(...service.media.map((m: any) => m.url));
  }
  if (service.photos && service.photos.length > 0) {
    images.push(...service.photos);
  }
  if (images.length === 0) {
    if (service.profile?.cover_url) images.push(service.profile.cover_url);
    if (service.profile?.avatar_url && !service.profile?.cover_url) images.push(service.profile.avatar_url);
  }
  images = Array.from(new Set(images.filter(Boolean)));
  
  let priceDisplay = "Price varies";
  if (service.price_fixed_ugx) {
    priceDisplay = `UGX ${service.price_fixed_ugx.toLocaleString()}`;
    if (service.price_note) priceDisplay += ` / ${service.price_note}`;
  } else if (service.price_min_ugx) {
    priceDisplay = `From UGX ${service.price_min_ugx.toLocaleString()}`;
    if (service.price_note) priceDisplay += ` / ${service.price_note}`;
  } else if (service.price_note) {
    priceDisplay = service.price_note;
  }
  
  const handleOrder = () => {
    requireAuth(
      () => setBookingOpen(true),
      { title: "Sign in to Order", message: "Create an account to order this service.", redirect: `/service/${id}` }
    );
  };

  return (
    <div className="relative min-h-screen bg-muted/20 pb-24 font-sans">
      {/* Top Hero Image (Full Bleed with Slider) */}
      <div className="relative h-[55vh] w-full bg-black">
        {images.length > 1 ? (
          <div className="flex h-full w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {images.map((img, idx) => (
              <div key={idx} className="h-full w-full shrink-0 snap-center relative">
                <img src={img} alt={`${service.title} - Image ${idx + 1}`} className="h-full w-full object-cover opacity-90" />
                <div className="absolute bottom-12 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm z-10">
                  {idx + 1} / {images.length}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <img src={images[0] || ""} alt={service.title} className="h-full w-full object-cover opacity-90" />
        )}
        
        {/* Back Button Overlay */}
        <button 
          onClick={() => window.history.back()}
          className="absolute left-4 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-black shadow-sm backdrop-blur-sm transition-transform hover:scale-105"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Content Card Overlapping Image */}
      <div className="relative -mt-8 rounded-t-3xl bg-white px-5 pb-8 pt-8 shadow-sm">
        
        <h1 className="text-2xl font-bold tracking-tight text-navy">{service.title}</h1>
        
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-bold text-orange">
            {priceDisplay}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy whitespace-nowrap">
            <Star className="h-4 w-4 fill-orange text-orange" />
            {service.rating > 0 ? service.rating : "New"} <span className="font-normal text-muted-foreground">({service.reviewCount || 0} reviews)</span>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-navy">Description</h2>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {service.description || "No description provided."}
          </p>
        </div>

        {/* Provider Profile Info */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Offered by
          </h2>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-orange/10 flex items-center justify-center text-orange font-bold">
              {service.profile?.avatar_url ? (
                <img src={service.profile.avatar_url} alt={service.profile?.name} className="h-full w-full object-cover" />
              ) : (
                service.profile?.name?.charAt(0) || "?"
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="truncate font-semibold text-navy">{service.profile?.name}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  service.profile?.isPersonal ? service.district : service.profile?.town, 
                  service.profile?.isPersonal ? service.town : service.profile?.district
                ].filter(Boolean).join(", ")}
              </p>
            </div>
            <button 
              onClick={() => {
                if (service.profile?.isPersonal) {
                  nav({ to: `/u/${service.profile?.id}` as any });
                } else {
                  nav({ to: `/p/${service.profile?.slug || service.profile?.id}` });
                }
              }} 
              className="rounded-full bg-orange/10 px-4 py-1.5 text-xs font-semibold text-orange"
            >
              View
            </button>
          </div>
        </div>

        {/* Reviews / Timeline Toggle */}
        <div className="mt-8 mb-4">
          {/* Tab Pills & Post Update Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1 w-fit">
              <button
                id="tab-reviews"
                onClick={() => setActiveTab("reviews")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "reviews"
                    ? "bg-white text-navy shadow-sm"
                    : "text-muted-foreground hover:text-navy"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Reviews
              </button>
              <button
                id="tab-timeline"
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "timeline"
                    ? "bg-white text-navy shadow-sm"
                    : "text-muted-foreground hover:text-navy"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </button>
            </div>

            {isOwner && activeTab === "timeline" && (
              <button
                onClick={() => setPostDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-navy/90 shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Post
              </button>
            )}
          </div>

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              {service.reviews?.length > 0 ? (
                service.reviews.map((r: any, idx: number) => {
                  const initials = r.user?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || "?";
                  const dateString = new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                  return (
                    <div key={idx} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-orange/10 flex items-center justify-center text-xs font-bold text-orange">
                          {r.user?.avatar_url ? (
                            <img src={r.user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                          ) : initials}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-navy">{r.user?.full_name || "Anonymous User"}</p>
                            <span className="text-[10px] text-muted-foreground">{dateString}</span>
                          </div>
                          <div className="flex text-orange mt-0.5">
                            {Array.from({ length: r.rating || 0 }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                          </div>
                          
                          {(() => {
                            let displayText = r.text || "";
                            let mediaUrls: string[] = [];
                            const mediaMatch = displayText.match(/\[MEDIA\](.*?)\[\/MEDIA\]/);
                            if (mediaMatch) {
                              try {
                                mediaUrls = JSON.parse(mediaMatch[1]);
                                displayText = displayText.replace(mediaMatch[0], "").trim();
                              } catch (e) {
                                // Ignore parse error
                              }
                            }
                            return (
                              <>
                                {displayText && <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{displayText}</p>}
                                {mediaUrls.length > 0 && (
                                  <div className="mt-3 flex gap-2 overflow-x-auto">
                                    {mediaUrls.map((url, i) => (
                                      <div key={i} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                                        <img src={url} alt="Attached" className="h-full w-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No reviews yet.</p>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-5">
              {service.timeline_posts?.length > 0 ? (
                service.timeline_posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No timeline posts yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white px-5 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border-t-0 md:bg-transparent">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          {isOwner ? (
            <>
              <button 
                onClick={() => nav({ to: `/profiles/new`, search: { edit: service.id } as any })}
                className="flex-1 rounded-full border-2 border-gray-200 bg-white py-3.5 text-center font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-transform"
              >
                Edit Service
              </button>
              <button 
                onClick={() => nav({ to: `/credits` as any })}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-orange py-4 font-bold text-white shadow-lg hover:bg-orange/90 active:scale-[0.98] transition-transform"
              >
                <span>Promote |</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-500">
                  <Coins className="h-4 w-4" />
                  {balance?.toLocaleString() || 0}
                </span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleOrder}
                className="flex-1 rounded-full bg-orange py-4 text-center font-bold text-white shadow-lg hover:bg-orange/90 active:scale-[0.98] transition-transform"
              >
                Request Service
              </button>
              <a
                href={`tel:${service.user_profile?.phone || service.profile?.phone || ''}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20b858] active:scale-[0.98] transition-transform"
              >
                <Phone className="h-6 w-6 fill-current" />
              </a>
            </>
          )}
        </div>
      </div>
      {/* Timeline Post Dialog */}
      <AddTimelinePostDialog
        open={postDialogOpen}
        onClose={() => setPostDialogOpen(false)}
        jobTitle={service?.title || "this service"}
        requestId=""
        serviceId={service?.id}
        onPosted={() => {
          fetchService();
        }}
      />
      
      {/* Booking Dialog */}
      <DirectBookingDialog 
        open={bookingOpen} 
        onOpenChange={setBookingOpen} 
        providerId={service?.user_profile_id || service?.profile?.owner_id} 
        service={service} 
      />
    </div>
  );
}
