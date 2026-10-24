import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useAuthGate } from "@/components/RequireAuthDialog";
import { DirectBookingDialog } from "./DirectBookingDialog";
import {
  ArrowLeft,
  Star,
  ImagePlus,
  Pencil,
  LayoutDashboard,
  Share2,
  MessageSquare,
  Clock,
  ImageIcon,
  Phone,
  Shield
} from "lucide-react";
import { Avatar } from "@/components/social/Avatar";
import { formatPrice } from "@/lib/price-guide";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceMediaManager } from "@/components/service/ServiceMediaManager";
import { supabase } from "@/integrations/supabase/client";
import type { PriceType, PriceGuide } from "@/lib/price-guide";

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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
  phone: string | null;
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
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<any>(undefined);
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
  const imageUrl = media?.[0]?.url || profile.cover_url || profile.avatar_url || null;
  
  // Format overall price from extras
  const displayPrice = extras?.price_display || 
    (extras?.price_min && extras?.price_max && extras.price_min !== extras.price_max ? `UGX ${extras.price_min.toLocaleString()} - ${extras.price_max.toLocaleString()}` : 
    (extras?.price_min ? `From UGX ${extras.price_min.toLocaleString()}` : "Contact for price"));

  const [fallbackContact, setFallbackContact] = useState<{ phone: string | null; whatsapp: string | null } | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.phone) return;

    (async () => {
      const ownerId = profile.owner_id || profile.id;
      const { data: pub } = await supabase
        .from('public_profiles')
        .select('phone, whatsapp')
        .or(`owner_id.eq.${ownerId},id.eq.${ownerId}`)
        .not('phone', 'is', null)
        .limit(1)
        .maybeSingle();

      if (pub?.phone) {
        setFallbackContact({ phone: pub.phone, whatsapp: pub.whatsapp || pub.phone });
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', ownerId)
        .maybeSingle();

      if (prof?.phone) {
        setFallbackContact({ phone: prof.phone, whatsapp: prof.phone });
      }
    })();
  }, [profile?.id, profile?.owner_id, profile?.phone]);

  const rawPhone = profile?.phone || fallbackContact?.phone || "";
  const rawWhatsapp = (profile as any)?.whatsapp || fallbackContact?.whatsapp || rawPhone;

  const getCleanWhatsappNumber = (phoneStr: string) => {
    let cleaned = phoneStr.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "256" + cleaned.slice(1);
    } else if (!cleaned.startsWith("256") && cleaned.length === 9) {
      cleaned = "256" + cleaned;
    }
    return cleaned;
  };

  const serviceUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://tuungane.com/p/${slug}`;

  const displayImage = imageUrl
    ? imageUrl.startsWith("http")
      ? imageUrl
      : `${typeof window !== "undefined" ? window.location.origin : "https://tuungane.com"}${imageUrl}`
    : "";

  const whatsappMessage = [
    `Hello! I found your service on Tuungane.`,
    ``,
    `*Service Requested:* ${profile?.name || "Service"}`,
    displayPrice && displayPrice !== "Contact for price" ? `*Price:* ${displayPrice}` : null,
    profile?.town || profile?.district ? `*Location:* ${[profile.town, profile.district].filter(Boolean).join(", ")}` : null,
    ``,
    `*Service Link:*`,
    serviceUrl,
    displayImage ? `\n*Service Photo:*\n${displayImage}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappNumber = getCleanWhatsappNumber(rawWhatsapp);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : "";

  const requestService = () => {
    requireAuth(
      () => {
        setSelectedServiceForBooking(services.length > 0 ? services[0] : {
          id: profile.id,
          title: profile.name,
          category_slug: profile.category_slug,
          subcategory: profile.subcategory,
          price_fixed_ugx: extras?.price_min
        });
        setBookingOpen(true);
      },
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
                        {s.price_fixed_ugx ? (
                          <p className="text-xs md:text-sm text-orange font-medium mt-1">
                            UGX {s.price_fixed_ugx.toLocaleString()} {s.price_note ? `/ ${s.price_note}` : ""}
                          </p>
                        ) : s.price_guidance_ugx ? (
                          <p className="text-xs md:text-sm text-orange font-medium mt-1">From UGX {s.price_guidance_ugx.toLocaleString()}</p>
                        ) : (
                          <p className="text-xs md:text-sm text-orange font-medium mt-1">Contact for price</p>
                        )}
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
                {media?.length > 0 ? (
                  media.map((m: any, idx: number) => (
                    <div key={idx} className="group overflow-hidden rounded-2xl border border-border bg-card">
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                        <img
                          src={m.url}
                          alt="Work post"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <span className="absolute bottom-2 left-3 flex items-center gap-1 text-[11px] font-medium text-white/90">
                          <ImageIcon className="h-3 w-3" />
                          Work Post
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No timeline posts yet.</p>
                )}
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
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Call Button */}
              {rawPhone ? (
                <a
                  href={`tel:${rawPhone}`}
                  className="py-3.5 px-4 rounded-xl bg-[#0B192C] text-white font-bold text-sm shadow-md hover:bg-[#0B192C]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-center"
                >
                  <Phone className="h-4 w-4 fill-current" />
                  <span>Call</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error("Phone number is not available")}
                  className="py-3.5 px-4 rounded-xl border border-border text-muted-foreground font-bold text-sm bg-muted/30 transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call</span>
                </button>
              )}

              {/* WhatsApp Button */}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 px-4 rounded-xl bg-[#25D366] text-white font-bold text-sm shadow-md hover:bg-[#20b858] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-center"
                >
                  <WhatsAppIcon className="h-4 w-4 fill-white" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error("WhatsApp number is not available")}
                  className="py-3.5 px-4 rounded-xl border border-border text-muted-foreground font-bold text-sm bg-muted/30 transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                >
                  <WhatsAppIcon className="h-4 w-4 fill-muted-foreground" />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
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
          <div className="flex w-full items-center gap-3">
            {/* Call Button */}
            {rawPhone ? (
              <a
                href={`tel:${rawPhone}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#0B192C] py-3.5 px-4 text-center font-bold text-white shadow-md hover:bg-[#0B192C]/90 active:scale-[0.98] transition-all"
              >
                <Phone className="h-5 w-5 fill-current" />
                <span>Call</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => toast.error("Phone number is not available for this provider.")}
                className="flex-1 flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-slate-50 py-3.5 px-4 text-center font-bold text-slate-400 cursor-not-allowed opacity-80"
              >
                <Phone className="h-5 w-5" />
                <span>Call</span>
              </button>
            )}

            {/* WhatsApp Button */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 px-4 text-center font-bold text-white shadow-md hover:bg-[#20b858] active:scale-[0.98] transition-all"
              >
                <WhatsAppIcon className="h-5 w-5 fill-white" />
                <span>WhatsApp</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => toast.error("WhatsApp is not available for this provider.")}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-slate-200 py-3.5 px-4 text-center font-bold text-slate-400 cursor-not-allowed opacity-80"
              >
                <WhatsAppIcon className="h-5 w-5 fill-slate-400" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
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

      {owner && profile && (
        <DirectBookingDialog 
          open={bookingOpen} 
          onOpenChange={setBookingOpen} 
          providerId={profile.owner_id} 
          service={selectedServiceForBooking} 
        />
      )}
    </div>
  );
}
