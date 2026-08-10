import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useAuthGate } from "@/components/RequireAuthDialog";
import {
  ArrowLeft,
  Star,
  ImagePlus,
  Pencil,
  LayoutDashboard,
  Share2,
  Shield,
  MessageSquare,
  Clock,
  ImageIcon
} from "lucide-react";
import { Avatar } from "@/components/social/Avatar";
import { formatPrice } from "@/lib/price-guide";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceMediaManager } from "@/components/service/ServiceMediaManager";
import type { PriceType, PriceGuide } from "@/lib/price-guide";

type ProfileType = "individual" | "business" | "organization";

type PublicProfile = {
  id: string;
  owner_id: string;
  profile_type: ProfileType;
  slug: string;
  name: string;
  category_slug: string | null;
  subcategory: string | null;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  district: string | null;
  town: string | null;
};

type ServiceProfileExtras = {
  price_display: string | null;
  price_min: number | null;
  price_max: number | null;
};

type OwnerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type ServiceMediaItem = {
  url: string;
  type?: string;
};

type Service = {
  id: string;
  title: string;
  description: string;
  price_guidance_ugx: number | null;
  active: boolean;
  is_primary: boolean;
  price_type: PriceType | null;
  price_fixed_ugx: number | null;
  price_min_ugx: number | null;
  price_max_ugx: number | null;
  price_currency: string | null;
  price_note: string | null;
};

export function PublicProfilePage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { requireAuth } = useAuthGate();
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [extras, setExtras] = useState<ServiceProfileExtras | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [media, setMedia] = useState<ServiceMediaItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"reviews" | "timeline">("reviews");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient<{
        data: {
          profile: PublicProfile;
          extras: ServiceProfileExtras;
          owner: OwnerProfile;
          media: ServiceMediaItem[];
          services: Service[];
        }
      }>(`/profiles/slug/${slug}`);
      
      setProfile(res.data.profile);
      setExtras(res.data.extras || null);
      setOwner(res.data.owner || null);
      setMedia(res.data.media || []);
      setServices(res.data.services || []);
    } catch (err) {
      console.error('Failed to load profile details:', err);
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading service...</div>;
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">This service doesn't exist.</p>
        <button onClick={() => window.history.back()} className="mt-4 text-orange">Go Back</button>
      </div>
    );
  }

  const isOwner = user?.id === profile.owner_id;
  const imageUrl = media?.[0]?.url || profile.cover_url || profile.avatar_url || "https://picsum.photos/800/800";
  
  // Format overall price from extras
  const displayPrice = extras?.price_display || 
    (extras?.price_min && extras?.price_max && extras.price_min !== extras.price_max ? `UGX ${extras.price_min.toLocaleString()} - ${extras.price_max.toLocaleString()}` : 
    (extras?.price_min ? `From UGX ${extras.price_min.toLocaleString()}` : "Contact for price"));

  const requestService = () => {
    requireAuth(
      () => nav({ to: "/requests/new", search: { profileId: profile.id, serviceId: "" } as never }),
      { title: "Sign in to Order", message: "Create a free Tuungane account to order.", redirect: `/p/${slug}` }
    );
  };

  const shareService = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await (navigator as Navigator).share({ title: profile.name, url }); return; } catch {}
    }
    try { await navigator.clipboard?.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); }
  };

  return (
    <div className="relative min-h-screen bg-muted/20 pb-24 font-sans md:bg-background md:pb-16 md:px-8">
      {/* Top Hero Image (Full Bleed Mobile, Bounded Banner Desktop) */}
      <div className="relative h-[55vh] w-full bg-black md:mx-auto md:max-w-6xl md:h-[450px] md:mt-4 md:rounded-[2rem] md:overflow-hidden md:shadow-sm">
        <img src={imageUrl} alt={profile.name} className="h-full w-full object-cover opacity-90" />
        
        {/* Back Button Overlay */}
        <button 
          onClick={() => window.history.back()}
          className="absolute left-4 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-black shadow-sm backdrop-blur-sm z-10 hover:bg-white transition-colors md:left-6 md:top-6"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {isOwner && (
          <button
            onClick={() => setMediaManagerOpen(true)}
            className="absolute right-4 top-6 flex items-center justify-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-sm z-10 hover:bg-black/80 md:right-6 md:top-6"
          >
            <ImagePlus className="h-4 w-4" /> Edit Photos
          </button>
        )}
      </div>

      <div className="mx-auto max-w-6xl md:mt-12 md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-16">
        
        {/* Left Column: Main Details */}
        <div className="relative -mt-8 rounded-t-3xl bg-white px-5 pb-8 pt-8 shadow-sm md:mt-0 md:rounded-none md:p-0 md:shadow-none md:bg-transparent">
          
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-navy">{profile.name}</h1>
          
          <div className="mt-3 flex items-center justify-between md:mt-4 md:justify-start md:gap-6">
            <div className="text-lg font-bold text-orange md:hidden">
              {displayPrice}
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-navy">
              <Star className="h-4 w-4 fill-orange text-orange md:h-5 md:w-5" />
              <span className="md:text-base font-bold">4.8</span> <span className="font-normal text-muted-foreground md:text-base">(24 reviews)</span>
            </div>
          </div>

          <div className="mt-6 md:mt-10">
            <h2 className="mb-2 text-sm font-bold text-navy md:text-xl md:mb-4">Description</h2>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap md:text-base">
              {profile.bio || "No description provided."}
            </p>
          </div>

          {services.length > 0 && (
            <div className="mt-8 md:mt-12">
              <h2 className="mb-3 text-sm font-bold text-navy md:text-xl md:mb-4">Other Packages</h2>
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                {services.map(s => (
                  <Link key={s.id} to="/service/$id" params={{ id: s.id }} className="block rounded-xl border border-border bg-card p-4 transition hover:border-orange/50 hover:shadow-sm">
                    <div className="flex justify-between items-start flex-col gap-2">
                      <div>
                        <p className="font-semibold text-sm md:text-base text-navy">{s.title}</p>
                        {s.price_guidance_ugx && <p className="text-xs md:text-sm text-orange font-medium mt-1">From UGX {s.price_guidance_ugx.toLocaleString()}</p>}
                      </div>
                      <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-semibold text-orange mt-2">View Details</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Reviews / Timeline Toggle */}
          <div className="mt-8 mb-4 md:mt-12 md:mb-8">

            {/* Tab Pills */}
            <div className="flex items-center gap-1 rounded-full bg-muted/70 p-1 w-fit mb-6">
              <button
                id="tab-reviews"
                onClick={() => setActiveTab("reviews")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
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
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  activeTab === "timeline"
                    ? "bg-white text-navy shadow-sm"
                    : "text-muted-foreground hover:text-navy"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </button>
            </div>

            {/* ── Reviews Tab ── */}
            {activeTab === "reviews" && (
              <div className="space-y-5">
                {([
                  { initials: "JD", name: "John Doe",   stars: 5, date: "2 days ago",  comment: "Amazing service! Really delivered exactly what I was looking for. Highly recommended." },
                  { initials: "AM", name: "Amina M.",   stars: 5, date: "1 week ago",  comment: "Very professional and timely. Will definitely work with them again." },
                  { initials: "RK", name: "Robert K.",  stars: 4, date: "3 weeks ago", comment: "Good quality work, the property was exactly as described. Happy with the results." },
                ] as const).map((r, idx) => (
                  <div key={idx} className="border-b border-border pb-5 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-orange/10 flex items-center justify-center text-sm font-bold text-orange">
                        {r.initials}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-navy">{r.name}</p>
                          <span className="text-[11px] text-muted-foreground">{r.date}</span>
                        </div>
                        <div className="flex text-orange mt-0.5">
                          {Array.from({ length: r.stars }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>
                        <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">{r.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Timeline Tab ── */}
            {activeTab === "timeline" && (
              <div className="space-y-5">
                {([
                  {
                    img: media[0]?.url || profile.cover_url || "https://picsum.photos/seed/work1/600/400",
                    caption: "Completed a 3-bedroom rental refurbishment in Entebbe — new flooring, fresh paint, and modern fixtures throughout.",
                    date: "Aug 5, 2026",
                  },
                  {
                    img: media[1]?.url || "https://picsum.photos/seed/work2/600/400",
                    caption: "Handed over a fully furnished long-stay apartment in Kampala. Client loved the balcony view!",
                    date: "Jul 28, 2026",
                  },
                  {
                    img: media[2]?.url || "https://picsum.photos/seed/work3/600/400",
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-2 left-3 flex items-center gap-1 text-[11px] font-medium text-white/90">
                        <ImageIcon className="h-3 w-3" />
                        Work Post
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm md:text-base leading-relaxed text-navy">{item.caption}</p>
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

          {/* Provider Profile Info */}
          {owner && (
            <div className="mt-8 rounded-2xl border border-border bg-white p-4 shadow-sm md:mt-10 md:p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:mb-5">Offered by</h2>
              <div className="flex items-center gap-4">
                <Avatar url={owner.avatar_url} name={owner.full_name || profile.name} size={56} />
                <div className="flex-1 overflow-hidden">
                  <h3 className="truncate text-base font-bold text-navy">{owner.full_name || "Provider"}</h3>
                  <p className="truncate text-sm text-muted-foreground mt-0.5">
                    {[profile.town, profile.district].filter(Boolean).join(", ")}
                  </p>
                </div>
                <Link to="/u/$id" params={{ id: profile.owner_id }} className="rounded-full bg-orange/10 px-5 py-2 text-sm font-semibold text-orange transition-colors hover:bg-orange/20">
                  View Profile
                </Link>
              </div>
            </div>
          )}

          {/* Owner Quick Actions (Mobile Only) */}
          {isOwner && (
            <div className="mt-6 flex flex-wrap gap-2 md:hidden">
              <Link to="/profiles/$id" params={{ id: profile.id }} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl border border-navy/20 py-3 text-sm font-semibold text-navy">
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <Link to="/dashboard" className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl border border-navy/20 py-3 text-sm font-semibold text-navy">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <button onClick={shareService} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl border border-navy/20 py-3 text-sm font-semibold text-navy">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Desktop Booking Widget */}
        <div className="hidden md:block sticky top-28 rounded-[2rem] border border-border bg-white p-8 shadow-xl">
          <h3 className="text-3xl font-bold text-navy mb-8">{displayPrice}</h3>
          
          {!isOwner && (
            <button 
              onClick={() => requestService()}
              className="w-full rounded-full bg-black py-4 text-center text-lg font-bold text-white shadow-lg hover:bg-gray-900 active:scale-[0.98] transition-transform"
            >
              Order Now
            </button>
          )}

          {isOwner && (
            <div className="flex flex-col gap-3">
              <Link to="/profiles/$id" params={{ id: profile.id }} className="w-full inline-flex justify-center items-center gap-2 rounded-full border border-border py-4 text-sm font-bold text-navy hover:bg-muted transition-colors">
                <Pencil className="h-4 w-4" /> Edit Service
              </Link>
              <Link to="/dashboard" className="w-full inline-flex justify-center items-center gap-2 rounded-full border border-border py-4 text-sm font-bold text-navy hover:bg-muted transition-colors">
                <LayoutDashboard className="h-4 w-4" /> View Dashboard
              </Link>
              <button onClick={shareService} className="w-full inline-flex justify-center items-center gap-2 rounded-full border border-border py-4 text-sm font-bold text-navy hover:bg-muted transition-colors">
                <Share2 className="h-4 w-4" /> Share Service
              </button>
            </div>
          )}
          
          <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
            <p className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-green" /> Secure payments via Tuungane
            </p>
            <p>You won't be charged yet</p>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Action Bar (Mobile Only) */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white px-5 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden">
          <button 
            onClick={() => requestService()}
            className="w-full rounded-full bg-black py-4 text-center font-bold text-white shadow-lg hover:bg-gray-900 active:scale-[0.98] transition-transform"
          >
            Order Now
          </button>
        </div>
      )}

      {isOwner && (
        <Dialog open={mediaManagerOpen} onOpenChange={(o) => { setMediaManagerOpen(o); if(!o) load(); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-t-2xl sm:rounded-2xl">
            <DialogHeader><DialogTitle>Photos & videos</DialogTitle></DialogHeader>
            <ServiceMediaManager ownerId={profile.owner_id} profileId={profile.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
