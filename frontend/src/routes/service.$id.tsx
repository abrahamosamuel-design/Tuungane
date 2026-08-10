import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, MessageSquare, Clock, ImageIcon } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthGate } from "@/components/RequireAuthDialog";
import { formatPrice } from "@/lib/price-guide";
import { FeedAvatar } from "@/components/social/FeedAvatar";

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
  
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reviews" | "timeline">("reviews");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<{ data: any }>(`/services/detail/${id}`);
        setService(res.data);
      } catch (err) {
        console.error("Failed to load service", err);
      } finally {
        setLoading(false);
      }
    })();
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

  // Use cover_url from service, or fallback to profile avatar/cover, or a default placeholder
  const imageUrl = service.media?.[0]?.url || service.profile?.cover_url || service.profile?.avatar_url || "https://picsum.photos/800/800";
  const displayPrice = formatPrice({ price_display: service.price_note, price_min: service.price_min_ugx, price_max: service.price_max_ugx });
  
  const handleOrder = () => {
    requireAuth(
      () => nav({ to: "/requests/new", search: { profileId: service.profile_id, serviceId: service.id } as never }),
      { title: "Sign in to Order", message: "Create an account to order this service.", redirect: `/service/${id}` }
    );
  };

  return (
    <div className="relative min-h-screen bg-muted/20 pb-24 font-sans">
      {/* Top Hero Image (Full Bleed) */}
      <div className="relative h-[55vh] w-full bg-black">
        <img src={imageUrl} alt={service.title} className="h-full w-full object-cover opacity-90" />
        {/* Back Button Overlay */}
        <button 
          onClick={() => window.history.back()}
          className="absolute left-4 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-black shadow-sm backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Content Card Overlapping Image */}
      <div className="relative -mt-8 rounded-t-3xl bg-white px-5 pb-8 pt-8 shadow-sm">
        
        <h1 className="text-2xl font-bold tracking-tight text-navy">{service.title}</h1>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="text-lg font-bold text-orange">
            {displayPrice || (service.price_fixed_ugx ? `UGX ${service.price_fixed_ugx.toLocaleString()}` : "Price varies")}
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-navy">
            <Star className="h-4 w-4 fill-orange text-orange" />
            4.8 <span className="font-normal text-muted-foreground">(24 reviews)</span>
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
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offered by</h2>
          <div className="flex items-center gap-3">
            <FeedAvatar src={service.profile?.avatar_url} name={service.profile?.name} size={48} />
            <div className="flex-1 overflow-hidden">
              <h3 className="truncate font-semibold text-navy">{service.profile?.name}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {[service.profile?.town, service.profile?.district].filter(Boolean).join(", ")}
              </p>
            </div>
            <button onClick={() => nav({ to: `/p/${service.profile?.slug || service.profile?.id}` })} className="rounded-full bg-orange/10 px-4 py-1.5 text-xs font-semibold text-orange">
              View
            </button>
          </div>
        </div>

        {/* Reviews / Timeline Toggle */}
        <div className="mt-8 mb-4">
          {/* Tab Pills */}
          <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1 w-fit mb-6">
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

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              {/* Review item */}
              {([
                { initials: "JD", name: "John Doe", stars: 5, date: "2 days ago", comment: "Amazing service! Really delivered exactly what I was looking for. Highly recommend." },
                { initials: "AM", name: "Amina M.", stars: 5, date: "1 week ago", comment: "Very professional and timely. Will definitely work with them again." },
                { initials: "RK", name: "Robert K.", stars: 4, date: "3 weeks ago", comment: "Good quality work, the property was exactly as described. Happy with the results." },
              ] as const).map((r, idx) => (
                <div key={idx} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-orange/10 flex items-center justify-center text-xs font-bold text-orange">
                      {r.initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-navy">{r.name}</p>
                        <span className="text-[10px] text-muted-foreground">{r.date}</span>
                      </div>
                      <div className="flex text-orange mt-0.5">
                        {Array.from({ length: r.stars }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-5">
              {([
                {
                  img: service.media?.[0]?.url || service.profile?.cover_url || "https://picsum.photos/seed/work1/600/400",
                  caption: "Completed a 3-bedroom rental refurbishment in Entebbe — new flooring, fresh paint, and modern fixtures throughout.",
                  date: "Aug 5, 2026",
                },
                {
                  img: service.media?.[1]?.url || "https://picsum.photos/seed/work2/600/400",
                  caption: "Handed over a fully furnished long-stay apartment in Kampala. Client loved the balcony view!",
                  date: "Jul 28, 2026",
                },
                {
                  img: service.media?.[2]?.url || "https://picsum.photos/seed/work3/600/400",
                  caption: "Land sale finalized in Wakiso. Clean title, ready for development.",
                  date: "Jul 15, 2026",
                },
                {
                  img: "https://picsum.photos/seed/work4/600/400",
                  caption: "New office space fit-out for a tech startup — open plan layout, glass partitions, and ergonomic seating.",
                  date: "Jun 30, 2026",
                },
              ] as const).map((item, idx) => (
                <div key={idx} className="group overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                    <img
                      src={item.img}
                      alt={item.caption}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute bottom-2 left-3 flex items-center gap-1 text-[10px] font-medium text-white/90">
                      <ImageIcon className="h-3 w-3" />
                      Work Post
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed text-navy">{item.caption}</p>
                    <span className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white px-5 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border-t-0 md:bg-transparent">
        <div className="mx-auto max-w-2xl">
          <button 
            onClick={handleOrder}
            className="w-full rounded-full bg-black py-4 text-center font-bold text-white shadow-lg hover:bg-gray-900 active:scale-[0.98] transition-transform"
          >
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
}
