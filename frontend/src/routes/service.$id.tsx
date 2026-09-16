import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, MessageSquare, Clock, ImageIcon, Phone, Coins, Plus, MapPin, Zap, ShieldCheck, Share2, BadgeCheck, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthGate } from "@/components/RequireAuthDialog";
import { PostCard } from "@/components/social/PostCard";
import { AddTimelinePostDialog } from "@/components/AddTimelinePostDialog";
import { useAuth } from "@/hooks/use-auth";
import { useCreditWallet } from "@/hooks/use-credits";
import { DirectBookingDialog } from "@/components/pages/profile/DirectBookingDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/service/$id")({
  staticData: { hideHeaderOnMobile: true, hideBottomNavOnMobile: true },
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
  
  const [activeTab, setActiveTab] = useState<"timeline" | "reviews">("timeline");
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  
  const imageSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const el = imageSliderRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const currentScroll = el.scrollLeft;
      if (currentScroll + 10 >= maxScroll) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollTo({ left: currentScroll + el.clientWidth, behavior: 'smooth' });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch service details using React Query for instant local caching
  const { data: service, isLoading: loading, refetch: fetchService } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const res = await apiClient<{ data: any }>(`/services/detail/${id}`);
      return res.data;
    }
  });

  // Fetch similar services in the background without blocking the UI
  const { data: allServices = [] } = useQuery({
    queryKey: ['services', 'all'],
    queryFn: async () => {
      const searchRes = await apiClient<{ data: any[] }>(`/services/search`);
      return searchRes.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isOwner = user?.id && service && (user.id === service.user_profile_id || user.id === service.profile?.owner_id);

  if (loading && !service) {
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

  const handleDeleteService = async () => {
    if (!confirm("Are you sure you want to delete this service? This action cannot be undone.")) return;
    try {
      await apiClient.delete(`/services/${id}`);
      toast.success("Service deleted successfully");
      nav({ to: `/u/$id`, params: { id: user?.id || "" } as any });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  return (
    <>
      <div className="relative min-h-screen bg-muted/20 pb-24 font-sans block lg:hidden">
      {/* Top Hero Image (Full Bleed with Slider) */}
      <div className="relative h-[55vh] w-full bg-black">
        {images.length > 1 ? (
          <div ref={imageSliderRef} className="flex h-full w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                nav({ to: `/u/${service.user_profile_id || service.profile?.owner_id || service.profile?.id}` as any });
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
            </div>

            {isOwner && (
              <button
                onClick={() => setPostDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-navy/90 shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Post Update
              </button>
            )}
          </div>

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              {service.reviews?.length > 0 ? (
                <>
                  {(showAllReviews ? service.reviews : service.reviews.slice(0, 1)).map((r: any, idx: number) => {
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
                  })}
                  {!showAllReviews && service.reviews.length > 1 && (
                    <button 
                      onClick={() => setShowAllReviews(true)}
                      className="w-full mt-4 rounded-full border border-border py-2 text-sm font-semibold text-navy hover:bg-muted"
                    >
                      More Reviews ({service.reviews.length - 1})
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No reviews yet.</p>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-5">
              {service.timeline_posts?.length > 0 ? (
                <>
                  {(showAllPosts ? service.timeline_posts : service.timeline_posts.slice(0, 1)).map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                  {!showAllPosts && service.timeline_posts.length > 1 && (
                    <button 
                      onClick={() => setShowAllPosts(true)}
                      className="w-full mt-2 rounded-full border border-border py-2 text-sm font-semibold text-navy hover:bg-muted"
                    >
                      Show more posts ({service.timeline_posts.length - 1})
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No timeline posts yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Similar Services and Other Services */}
        {allServices.length > 0 && (
          <div className="mt-12 mb-8">
            {allServices.filter(s => s.category_slug === service.category_slug && s.user_id !== (service.user_profile_id || service.profile?.owner_id)).length > 0 && (
              <>
                <h2 className="mb-4 text-lg font-bold text-navy">Similar Services</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {allServices
                    .filter(s => s.category_slug === service.category_slug && s.user_id !== (service.user_profile_id || service.profile?.owner_id))
                    .slice(0, 5)
                    .map((s, idx) => {
                      const name = s.business_name || s.profile?.full_name || s.profile?.name || "Provider";
                      const coverImage = s.cover_url || (s.media_urls && s.media_urls[0]) || s.profile?.avatar_url;
                      return (
                        <div key={idx} className="w-[180px] shrink-0 snap-start">
                          <Link to="/service/$id" params={{ id: s.service_id || s.user_id || s.id }} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
                              {coverImage ? (
                                <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-surface">
                                  <span className="text-muted-foreground/30 text-2xl font-bold uppercase">{name.substring(0, 2)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1 p-3">
                              <h3 className="font-display text-sm font-bold leading-tight text-navy line-clamp-1">{name}</h3>
                              <p className="mt-1 text-xs font-medium text-foreground/80 line-clamp-1">{s.subcategory || s.category_slug}</p>
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground line-clamp-1">
                                <MapPin className="h-3 w-3 shrink-0" /> {s.town || s.district || "Uganda"}
                              </p>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {allServices.filter(s => s.category_slug !== service.category_slug && s.user_id !== (service.user_profile_id || service.profile?.owner_id)).length > 0 && (
              <>
                <h2 className="mt-8 mb-4 text-lg font-bold text-navy">Other Services</h2>
                <div className="grid grid-cols-2 gap-4 pb-4">
                  {allServices
                    .filter(s => s.category_slug !== service.category_slug && s.user_id !== (service.user_profile_id || service.profile?.owner_id))
                    .slice(0, 6)
                    .map((s, idx) => {
                      const name = s.business_name || s.profile?.full_name || s.profile?.name || "Provider";
                      const coverImage = s.cover_url || (s.media_urls && s.media_urls[0]) || s.profile?.avatar_url;
                      return (
                        <Link key={idx} to="/service/$id" params={{ id: s.service_id || s.user_id || s.id }} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative">
                          <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
                            {coverImage ? (
                              <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-surface">
                                <span className="text-muted-foreground/30 text-2xl font-bold uppercase">{name.substring(0, 2)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 p-3">
                            <h3 className="font-display text-sm font-bold leading-tight text-navy line-clamp-1">{name}</h3>
                            <p className="mt-1 text-xs font-medium text-foreground/80 line-clamp-1">{s.subcategory || s.category_slug}</p>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground line-clamp-1">
                              <MapPin className="h-3 w-3 shrink-0" /> {s.town || s.district || "Uganda"}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white px-5 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border-t-0 md:bg-transparent">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          {isOwner ? (
            <>
              <button 
                onClick={handleDeleteService}
                aria-label="Delete Service"
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button 
                onClick={() => nav({ to: `/profiles/new`, search: { edit: service.id } as any })}
                className="flex-1 rounded-full border-2 border-gray-200 bg-white py-3 text-center text-[15px] font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-transform"
              >
                Edit
              </button>
              <button 
                onClick={() => nav({ to: `/credits` as any })}
                className="flex-[1.2] flex items-center justify-center gap-1.5 rounded-full bg-orange py-3 text-[15px] font-bold text-white shadow-lg hover:bg-orange/90 active:scale-[0.98] transition-transform"
              >
                <span>Promote</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-500">
                  <Coins className="h-3.5 w-3.5" />
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

      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 items-start relative h-[calc(100vh-64px)] overflow-hidden font-sans bg-background">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-8 h-full overflow-y-auto pr-2 pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Service Hero Card */}
          <article className="bg-surface-container-lowest rounded-2xl border border-border p-6 shadow-sm bg-white">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="bg-muted text-navy rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-border">
                {service.subcategory || service.category_slug || "SERVICE"}
              </span>
              <span className="bg-[#E8F7EE] text-[#005323] border border-[#A3E2B8] rounded px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                <MapPin className="h-3 w-3" />
                {service.town || service.district || "UGANDA"}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-navy mb-4 tracking-tight leading-tight">
              {service.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 py-3 border-b border-border text-sm font-medium">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-orange text-orange" />
                <span className="font-bold text-navy">{service.rating > 0 ? service.rating : "New"}</span>
                <span className="text-muted-foreground">({service.reviewCount || 0} reviews)</span>
              </div>
              <span className="text-border">•</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Available</span>
              </div>
            </div>

            {/* Image Gallery */}
            <div className="mt-6 flex flex-col gap-3">
              <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video w-full">
                {images.length > 0 ? (
                  <img src={images[0]} alt={service.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                     <ImageIcon className="h-16 w-16" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.slice(1, 5).map((img, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-video">
                      <img src={img} alt={`${service.title} - ${i+1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {images.length > 5 && (
                    <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-navy flex flex-col items-center justify-center text-white p-2 text-center cursor-pointer hover:bg-navy/90">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-xs font-semibold mt-1">+{images.length - 5} Media</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>

          {/* Service Description */}
          <section className="bg-surface-container-lowest rounded-2xl border border-border p-6 shadow-sm bg-white">
            <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange">info</span>
              <span>Service Overview</span>
            </h2>
            <div className="prose max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed text-[15px]">
              {service.description || "No description provided."}
            </div>
          </section>

          {/* Timeline & Reviews */}
          <section className="bg-surface-container-lowest rounded-2xl border border-border p-6 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1 w-fit">
                <button
                  id="tab-timeline-desktop"
                  onClick={() => setActiveTab("timeline")}
                  className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === "timeline"
                      ? "bg-white text-navy shadow-sm"
                      : "text-muted-foreground hover:text-navy"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  Timeline
                </button>
                <button
                  id="tab-reviews-desktop"
                  onClick={() => setActiveTab("reviews")}
                  className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === "reviews"
                      ? "bg-white text-navy shadow-sm"
                      : "text-muted-foreground hover:text-navy"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Reviews
                </button>
              </div>

              {isOwner && (
                <button
                  onClick={() => setPostDialogOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy/90"
                >
                  <Plus className="h-4 w-4" />
                  Post Update
                </button>
              )}
            </div>

            {/* Desktop Timeline */}
            {activeTab === "timeline" && (
              <div className="space-y-5">
                {service.timeline_posts?.length > 0 ? (
                  <>
                    {(showAllPosts ? service.timeline_posts : service.timeline_posts.slice(0, 3)).map((post: any) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                    {!showAllPosts && service.timeline_posts.length > 3 && (
                      <button 
                        onClick={() => setShowAllPosts(true)}
                        className="w-full mt-2 rounded-full border border-border py-3 text-sm font-semibold text-navy hover:bg-muted transition-colors"
                      >
                        Show more posts ({service.timeline_posts.length - 3})
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12 bg-muted/30 rounded-xl">No timeline posts yet.</p>
                )}
              </div>
            )}

            {/* Desktop Reviews */}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                {service.reviews?.length > 0 ? (
                  <>
                    {(showAllReviews ? service.reviews : service.reviews.slice(0, 3)).map((r: any, idx: number) => {
                      const initials = r.user?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || "?";
                      const dateString = new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                      return (
                        <div key={idx} className="p-5 rounded-xl bg-muted/30 border border-border">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-orange/10 flex items-center justify-center font-bold text-orange shadow-sm border border-orange/20">
                                {r.user?.avatar_url ? (
                                  <img src={r.user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                ) : initials}
                              </div>
                              <div>
                                <h4 className="font-semibold text-navy">{r.user?.full_name || "Anonymous User"}</h4>
                                <div className="flex text-orange mt-0.5">
                                  {Array.from({ length: r.rating || 0 }).map((_, i) => (
                                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">{dateString}</span>
                          </div>
                          
                          {(() => {
                            let displayText = r.text || "";
                            let mediaUrls: string[] = [];
                            const mediaMatch = displayText.match(/\[MEDIA\](.*?)\[\/MEDIA\]/);
                            if (mediaMatch) {
                              try {
                                mediaUrls = JSON.parse(mediaMatch[1]);
                                displayText = displayText.replace(mediaMatch[0], "").trim();
                              } catch (e) {}
                            }
                            return (
                              <>
                                {displayText && <p className="text-[15px] text-navy/80 leading-relaxed italic">"{displayText}"</p>}
                                {mediaUrls.length > 0 && (
                                  <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                    {mediaUrls.map((url, i) => (
                                      <div key={i} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-black/5 hover:opacity-90 transition-opacity cursor-pointer">
                                        <img src={url} alt="Attached" className="h-full w-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      );
                    })}
                    {!showAllReviews && service.reviews.length > 3 && (
                      <button 
                        onClick={() => setShowAllReviews(true)}
                        className="w-full mt-4 rounded-full border border-border py-3 text-sm font-semibold text-navy hover:bg-muted transition-colors"
                      >
                        Show all {service.reviews.length} reviews
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12 bg-muted/30 rounded-xl">No verified project testimonials yet.</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <aside className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pl-2 pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Conversion Widget */}
          <div className="bg-white rounded-2xl border-2 border-orange/30 p-6 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Investment</span>
              <span className="text-[10px] text-[#005323] bg-[#E8F7EE] px-2 py-0.5 rounded font-bold border border-[#A3E2B8]">Fixed & Milestone</span>
            </div>
            
            <div className="text-3xl font-extrabold text-navy mb-2">
              {priceDisplay}
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-6 pb-6 border-b border-border">
              Standard service package
            </p>

            <div className="space-y-3 mb-6 bg-muted/30 p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3 text-sm text-navy">
                <Clock className="h-4 w-4 text-orange" />
                <span className="font-medium">Estimated Delivery: <strong>Standard</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm text-navy">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="font-medium">Response Guarantee: <strong>&lt; 2 Hours</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm text-navy">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Tuungane Escrow: <strong>100% Protected</strong></span>
              </div>
            </div>

            {isOwner ? (
              <div className="flex gap-3 mb-4">
                <button 
                  onClick={handleDeleteService}
                  aria-label="Delete Service"
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => nav({ to: `/profiles/new`, search: { edit: service.id } as any })}
                  className="flex-1 py-3.5 rounded-xl border-2 border-border text-navy font-bold text-[15px] hover:bg-muted transition-colors"
                >
                  Edit Service
                </button>
                <button 
                  onClick={() => nav({ to: `/credits` as any })}
                  className="flex-1 py-3.5 rounded-xl bg-orange text-white font-bold text-[15px] hover:brightness-105 transition-all shadow-md shadow-orange/20"
                >
                  Promote Service
                </button>
              </div>
            ) : (
              <button 
                onClick={handleOrder}
                className="w-full py-3.5 px-4 rounded-xl bg-orange text-white font-bold text-base shadow-lg shadow-orange/20 hover:brightness-105 transition-all flex items-center justify-center gap-2 mb-4"
              >
                <span>Send Service Request</span>
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            )}

            {!isOwner && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleOrder}
                  className="py-3 px-3 rounded-xl border border-border text-navy font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Message</span>
                </button>
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: service.title,
                        url: window.location.href,
                      });
                    }
                  }}
                  className="py-3 px-3 rounded-xl border border-border text-navy font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground text-center mt-5 px-4 leading-relaxed">
              Milestone payments released only upon your project approval.
            </p>
          </div>

          {/* Provider Identity Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-4">
              Offered by Verified Provider
            </div>
            
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-orange shadow-sm bg-orange/10 flex items-center justify-center text-orange font-bold text-xl">
                  {service.profile?.avatar_url ? (
                    <img src={service.profile.avatar_url} alt={service.profile?.name} className="h-full w-full object-cover" />
                  ) : (
                    service.profile?.name?.charAt(0) || "?"
                  )}
                </div>
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-bold text-navy truncate">{service.profile?.name}</h3>
                  <BadgeCheck className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {[
                    service.profile?.isPersonal ? service.district : service.profile?.town, 
                    service.profile?.isPersonal ? service.town : service.profile?.district
                  ].filter(Boolean).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Verified Member</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5 mb-5">
              <span className="bg-[#E8F7EE] text-[#005323] border border-[#A3E2B8] rounded px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                ID VERIFIED
              </span>
              <span className="bg-[#E8F7EE] text-[#005323] border border-[#A3E2B8] rounded px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                PHONE VERIFIED
              </span>
            </div>

            <div className="pt-4 border-t border-border">
              <button 
                onClick={() => nav({ to: `/u/$id` as any, params: { id: service.user_profile_id || service.profile?.owner_id || service.profile?.id } })}
                className="group flex items-center justify-between text-sm font-bold text-orange hover:text-navy transition-colors w-full"
              >
                <span>View Full Profile</span>
                <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Trust Guarantee Banner */}
          <div className="rounded-xl bg-muted/40 border border-border p-4 flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-navy shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-navy font-semibold block mb-0.5">Tuungane Trust Guarantee:</strong>
              All financial transactions are covered by regulatory escrow. Providers undergo biometric ID checks.
            </p>
          </div>

        </aside>
      </div>

      {/* MODALS */}
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
    </>
  );
}
