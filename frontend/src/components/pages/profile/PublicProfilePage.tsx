import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useAuthGate } from "@/components/RequireAuthDialog";
import {
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Share2,
  Pencil,
  Plus,
  LayoutDashboard,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Circle,
  PartyPopper,
  X,
} from "lucide-react";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { formatSubcategory } from "@/lib/format-category";
import { Avatar } from "@/components/social/Avatar";
import { ExpandableText } from "@/components/feed/ExpandableText";
import { PriceGuideChip } from "@/components/PriceGuide";
import type { PriceType, PriceGuide } from "@/lib/price-guide";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { toast } from "sonner";
import { ServiceMediaGallery, type ServiceMediaItem } from "@/components/service/ServiceMediaGallery";
import { ServiceMediaManager } from "@/components/service/ServiceMediaManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePlus } from "lucide-react";

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
  area: string | null;
  areas_served: string[] | null;
  availability: string | null;
  opening_hours: unknown | null;
  phone: string | null;
  whatsapp: string | null;
  verified: string;
};

type ServiceProfileExtras = {
  price_display: string | null;
  price_min: number | null;
  price_max: number | null;
  created_at: string;
};

type OwnerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
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

const QUICK_MESSAGES = [
  "Is this available?",
  "What is your price?",
  "Can you come today?",
  "I need this service",
];

export function PublicProfilePage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { requireAuth } = useAuthGate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [extras, setExtras] = useState<ServiceProfileExtras | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [media, setMedia] = useState<ServiceMediaItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") setShowWelcome(true);
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.toString());
    }
  };

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
          posts: PostRow[];
          completedCount: number;
        }
      }>(`/profiles/slug/${slug}`);
      
      const { data } = res;
      setProfile(data.profile);
      setExtras(data.extras || null);
      setOwner(data.owner || null);
      setMedia(data.media || []);
      setServices(data.services || []);
      setPosts(data.posts || []);
      setCompleted(data.completedCount || 0);
    } catch (err) {
      console.error('Failed to load profile details:', err);
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted-foreground">
          This service doesn’t exist or was removed.
        </p>
        <Link to="/services" className="mt-3 inline-block text-sm font-semibold text-orange">
          ← Browse services
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === profile.owner_id;
  const location = [profile.area, profile.town, profile.district]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");
  const isVerified = profile.verified === "verified";
  const priceLabel = formatPrice(extras);
  const availabilityLabel = formatAvailability(profile.availability, profile.opening_hours);
  const recentlyListed =
    extras?.created_at &&
    Date.now() - new Date(extras.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

  const requestService = (serviceId?: string) => {
    requireAuth(
      () =>
        nav({
          to: "/requests/new",
          search: { profileId: profile.id, serviceId: serviceId ?? "" } as never,
        }),
      {
        title: "Sign in to request this service",
        message: "Create a free Tuungane account to send a request to this provider.",
        redirect: `/p/${profile.slug}`,
      },
    );
  };

  const sendQuickMessage = (msg: string) => {
    requireAuth(
      () =>
        nav({
          to: "/messages",
          search: { to: profile.owner_id, draft: msg } as never,
        }),
      {
        title: "Sign in to message",
        message: "Create a free Tuungane account to start a conversation.",
        redirect: `/p/${profile.slug}`,
      },
    );
  };

  const shareService = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator).share({ title: profile.name, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn’t copy link");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Media gallery hero — no banner */}
      <div className="relative">
        <ServiceMediaGallery
          items={media}
          fallbackName={profile.name}
          fallbackAvatarUrl={profile.avatar_url ?? profile.cover_url}
          fallbackCategorySlug={profile.category_slug}
        />
        {isOwner && (
          <button
            type="button"
            onClick={() => setMediaManagerOpen(true)}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75 z-10"
            aria-label="Upload photos and videos"
          >
            <ImagePlus className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span className="hidden sm:inline">
              {media.length === 0
                ? "Upload photos & videos — build trust"
                : "Upload more photos & videos"}
            </span>
            <span className="sm:hidden">Upload</span>
          </button>
        )}
      </div>

      <section className="mx-auto mt-4 w-full max-w-2xl px-4 pb-32 flex-1">
        {/* Service summary card */}
        <div className="relative rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
          <h1 className="text-center font-display text-2xl font-bold leading-tight text-navy sm:text-3xl">
            {profile.name}
          </h1>

          <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-navy/60 md:text-xs">
            {profile.subcategory
              ? formatSubcategory(profile.subcategory)
              : profile.category_slug ?? "Service"}
          </p>

          {(location || isVerified) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground md:text-sm">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-navy/60" />
                  {location}
                </span>
              )}
              {profile.profile_type === "individual" ? (
                <ProfileTrustBadge kind="service_profile" id={profile.owner_id} />
              ) : isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2.5 py-1 text-[11px] font-semibold text-green">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {priceLabel && (
              <span className="inline-flex items-center rounded-full bg-navy/5 px-3 py-1.5 text-xs font-bold text-navy">
                {priceLabel}
              </span>
            )}
            {recentlyListed && !isVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-3 py-1.5 text-[11px] font-semibold text-orange">
                <Sparkles className="h-3.5 w-3.5" /> Recently listed
              </span>
            )}
            {completed > 0 && (
              <span className="inline-flex items-center rounded-full bg-green/10 px-3 py-1.5 text-[11px] font-semibold text-green">
                {completed} completed
              </span>
            )}
          </div>
        </div>

        {/* Provider identity strip */}
        {owner && (
          <Link
            to="/u/$id"
            params={{ id: profile.owner_id }}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition hover:border-navy/30 md:p-4"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
              <Avatar name={owner.full_name || profile.name} url={owner.avatar_url} size={48} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-navy/50">
                Offered by
              </p>
              <p className="truncate text-base font-semibold text-navy">
                {owner.full_name || "View provider"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-navy/40" />
          </Link>
        )}

        {/* Contact actions — visitors only */}
        {!isOwner && (
          <div className="mt-4 md:mt-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Link
                to="/messages"
                search={{ to: profile.owner_id } as never}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange px-4 py-3 text-sm font-bold text-orange-foreground shadow-sm hover:bg-orange/90 active:scale-[0.98] transition-transform"
              >
                <MessageSquare className="h-4 w-4" /> Message
              </Link>
              {profile.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-navy/25 bg-card px-4 py-3 text-sm font-semibold text-navy hover:bg-muted active:scale-[0.98] transition-transform"
                >
                  <Phone className="h-4 w-4" /> Call {profile.name.split(" ")[0]}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => requestService()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-orange/40 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange hover:bg-orange/20 active:scale-[0.98] transition-transform"
              >
                Request service
              </button>
            </div>

            {/* Quick-message chips */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/50">
                Quick message
              </p>
              <div className="mt-2 flex flex-nowrap overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
                {QUICK_MESSAGES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => sendQuickMessage(m)}
                    className="shrink-0 snap-start rounded-full border border-navy/20 bg-card px-4 py-2 text-sm font-medium text-navy transition hover:border-orange hover:text-orange active:bg-orange/5"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={shareService}
              className="mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-navy/70 hover:text-navy"
            >
              <Share2 className="h-4 w-4" /> Share this service
            </button>
          </div>
        )}

        {/* Compact owner tools row */}
        {isOwner && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 p-3">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-navy/60 w-full sm:w-auto mb-1 sm:mb-0">
              Owner Tools
            </span>
            <Link
              to="/profiles/$id"
              params={{ id: profile.id }}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-orange px-3.5 py-1.5 text-xs font-semibold text-orange-foreground"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
            <button
              type="button"
              onClick={() => setMediaManagerOpen(true)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-navy/20 bg-card px-3.5 py-1.5 text-xs font-semibold text-navy"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Photos
            </button>
            <Link
              to="/dashboard"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-navy/20 bg-card px-3.5 py-1.5 text-xs font-semibold text-navy"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <button
              onClick={shareService}
              className="sm:ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-navy/70"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        )}

        {/* Owner welcome banner (after creation) */}
        {isOwner && showWelcome && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-green/40 bg-green/5 p-4 md:p-5">
            <button
              type="button"
              onClick={dismissWelcome}
              aria-label="Dismiss"
              className="absolute right-2 top-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-navy/50 hover:bg-navy/10"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green text-white">
                <PartyPopper className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-base md:text-lg font-bold text-navy">
                  Your service profile is live
                </p>
                <p className="mt-1 text-sm md:text-base text-foreground/80">
                  Add photos, videos, packages, and updates to attract more customers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Owner completion prompts */}
        {isOwner && (
          <div className="mt-4">
            <OwnerCompletionCard
              profile={profile}
              mediaCount={media.length}
              servicesCount={services.length}
              postsCount={posts.length}
              onUploadMedia={() => setMediaManagerOpen(true)}
            />
          </div>
        )}

        {/* Tabs */}

        <Tabs defaultValue="about" className="mt-6 md:mt-8">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1 md:h-12">
            <TabsTrigger
              value="about"
              className="rounded-lg text-sm md:text-base font-semibold text-navy/60 data-[state=active]:bg-card data-[state=active]:text-orange data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-orange/30 py-2.5"
            >
              About
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="rounded-lg text-sm md:text-base font-semibold text-navy/60 data-[state=active]:bg-card data-[state=active]:text-orange data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-orange/30 py-2.5"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="rounded-lg text-sm md:text-base font-semibold text-navy/60 data-[state=active]:bg-card data-[state=active]:text-orange data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-orange/30 py-2.5"
            >
              Packages
            </TabsTrigger>
          </TabsList>

          {/* ABOUT */}
          <TabsContent value="about" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
              <h2 className="font-display text-lg md:text-xl font-bold text-navy">About {profile.name}</h2>
              {profile.bio ? (
                <p className="mt-3 whitespace-pre-line text-sm md:text-base text-foreground/90">{profile.bio}</p>
              ) : isOwner ? (
                <Link
                  to="/profiles/$id"
                  params={{ id: profile.id }}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm md:text-base font-semibold text-orange"
                >
                  <Plus className="h-4 w-4" /> Add a description
                </Link>
              ) : (
                <p className="mt-3 text-sm md:text-base text-muted-foreground">No description yet.</p>
              )}

              <dl className="mt-6 divide-y divide-border/60">
                <DetailRow
                  label="Category"
                  value={
                    profile.subcategory
                      ? formatSubcategory(profile.subcategory)
                      : profile.category_slug ?? null
                  }
                  isOwner={isOwner}
                />
                <DetailRow label="Location" value={location || null} isOwner={isOwner} />
                <DetailRow
                  label="Areas served"
                  value={
                    profile.areas_served && profile.areas_served.length > 0
                      ? profile.areas_served.join(", ")
                      : null
                  }
                  isOwner={isOwner}
                  emptyOwnerPrompt="Add areas served"
                  profileEditId={profile.id}
                />
                <DetailRow
                  label="Availability"
                  value={availabilityLabel}
                  icon={<Clock className="h-4 w-4 text-navy/60" />}
                  isOwner={isOwner}
                  emptyOwnerPrompt="Set availability"
                  profileEditId={profile.id}
                />
                {priceLabel && (
                  <DetailRow label="Price guide" value={priceLabel} isOwner={isOwner} valueClass="font-semibold text-navy" />
                )}
                {isOwner ? (
                  <DetailRow
                    label="Contact"
                    value={profile.phone}
                    icon={<Phone className="h-4 w-4 text-navy/60" />}
                    isOwner
                    emptyOwnerPrompt="Add phone number"
                    profileEditId={profile.id}
                  />
                ) : profile.phone ? (
                  <div className="flex items-center justify-between gap-3 py-3 md:py-4">
                    <dt className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-navy/50">
                      Contact
                    </dt>
                    <a
                      href={`tel:${profile.phone}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground"
                    >
                      <Phone className="h-4 w-4" /> Call {profile.name.split(" ")[0]}
                    </a>
                  </div>
                ) : null}
              </dl>

              {isOwner && (
                <Link
                  to="/profiles/$id"
                  params={{ id: profile.id }}
                  className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-orange"
                >
                  <Pencil className="h-4 w-4" /> Edit About
                </Link>
              )}
            </div>
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-4 space-y-4">
            {isOwner && (
              <PostComposer
                defaultCategory={profile.category_slug}
                publicProfileId={profile.id}
                onPosted={load}
              />
            )}
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm md:text-base text-muted-foreground">
                {isOwner
                  ? "Share a photo, video, or update to show your work under this service."
                  : "No updates yet."}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onChanged={load} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* PACKAGES / PRICE GUIDE */}
          <TabsContent value="services" className="mt-4 space-y-3">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-navy/70">
              <p className="font-semibold text-navy text-base">Packages &amp; Price Guide</p>
              <p className="mt-1">
                Your main service <span className="font-semibold text-navy">{profile.name}</span> is already live.
                Add optional packages below (for example: basic, full, monthly) so customers can pick what fits them best.
              </p>
            </div>
            {services.length === 0 ? (
              isOwner ? null : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm md:text-base text-muted-foreground">
                  No specific packages listed yet. You can still request this service directly.
                </div>
              )

            ) : (
              <ul className="space-y-3">
                {services.map((s) => (
                  <li
                    key={s.id}
                    className={`rounded-2xl border bg-card p-4 md:p-5 ${
                      s.is_primary ? "border-orange/40 ring-1 ring-orange/15" : "border-border"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy md:text-lg">{s.title}</p>
                        {s.description && (
                          <ExpandableText
                            text={s.description}
                            clampLines={3}
                            maxLines={8}
                            className="mt-1 md:text-base"
                          />
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <PriceGuideChip guide={s as PriceGuide} />
                          {!s.price_type && s.price_guidance_ugx && (
                            <span className="inline-flex items-center rounded-full bg-orange/10 px-2.5 py-1 text-[11px] md:text-xs font-semibold text-orange">
                              From UGX {s.price_guidance_ugx.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {s.price_note && (
                          <p className="mt-1.5 text-xs text-muted-foreground">{s.price_note}</p>
                        )}
                      </div>
                      {!isOwner && (
                        <button
                          onClick={() => requestService(s.id)}
                          className="shrink-0 w-full sm:w-auto rounded-xl bg-orange px-5 py-3 text-sm font-semibold text-orange-foreground active:scale-[0.98] transition-transform"
                        >
                          Request
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {isOwner && (
              <Link
                to="/profiles/$id"
                params={{ id: profile.id }}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center sm:justify-start gap-2 rounded-xl border border-dashed border-orange/40 bg-orange/5 px-4 py-3 text-sm font-semibold text-orange w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" /> {services.length === 0 ? "Add a package or price option" : "Add another package"}
              </Link>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Sticky Bottom Action Bar for Mobile Visitors */}
      {!isOwner && profile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Link
              to="/messages"
              search={{ to: profile.owner_id } as never}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange/10 text-orange font-bold active:scale-[0.98] transition-transform"
            >
              <MessageSquare className="h-5 w-5" />
            </Link>
            <button
              onClick={() => requestService()}
              className="flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-xl bg-orange text-orange-foreground font-bold active:scale-[0.98] transition-transform shadow-sm"
            >
              Request service
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <Dialog
          open={mediaManagerOpen}
          onOpenChange={(open) => {
            setMediaManagerOpen(open);
            if (!open) load();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-t-2xl sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Photos &amp; videos</DialogTitle>
            </DialogHeader>
            <ServiceMediaManager ownerId={profile.owner_id} profileId={profile.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function formatPrice(sp: ServiceProfileExtras | null): string | null {
  if (!sp) return null;
  if (sp.price_display && sp.price_display.trim()) return sp.price_display.trim();
  const min = sp.price_min ?? null;
  const max = sp.price_max ?? null;
  if (min && max && max !== min) return `USh ${min.toLocaleString()} – ${max.toLocaleString()}`;
  if (min) return `From USh ${min.toLocaleString()}`;
  if (max) return `USh ${max.toLocaleString()}`;
  return null;
}

function DetailRow({
  label,
  value,
  icon,
  isOwner,
  emptyOwnerPrompt,
  profileEditId,
  valueClass,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  isOwner: boolean;
  emptyOwnerPrompt?: string;
  profileEditId?: string;
  valueClass?: string;
}) {
  const has = Boolean(value && String(value).trim());
  if (!has && !isOwner) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-3 md:py-4">
      <dt className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</dt>
      <dd className={`min-w-0 text-right text-sm md:text-base text-foreground/90 ${valueClass ?? ""}`}>
        {has ? (
          <span className="inline-flex items-center gap-1.5">
            {icon}
            <span className="truncate">{value}</span>
          </span>
        ) : isOwner && emptyOwnerPrompt && profileEditId ? (
          <Link
            to="/profiles/$id"
            params={{ id: profileEditId }}
            className="inline-flex min-h-[44px] items-center justify-end gap-1.5 text-xs md:text-sm font-semibold text-orange"
          >
            <Plus className="h-4 w-4" /> {emptyOwnerPrompt}
          </Link>
        ) : (
          <span className="text-muted-foreground italic">Not set</span>
        )}
      </dd>
    </div>
  );
}

function formatAvailability(availability: string | null, openingHours: unknown): string | null {
  const raw = (availability ?? "").trim().toLowerCase();
  const hours = formatOpeningHours(openingHours);
  const map: Record<string, string> = {
    available: "Available now",
    available_now: "Available now",
    open: "Open now",
    open_now: "Open now",
    open_today: "Open today",
    appointment: "Available by appointment",
    by_appointment: "Available by appointment",
    closed: "Closed now",
  };
  const label = raw ? map[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
  if (label && hours) return `${label} · ${hours}`;
  return label || hours || null;
}

function formatOpeningHours(oh: unknown): string {
  if (!oh) return "";
  if (typeof oh === "string") return oh.trim();
  if (typeof oh !== "object") return "";
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const dayLabels: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const now = new Date();
  const todayKey = days[(now.getDay() + 6) % 7];
  const rec = oh as Record<string, unknown>;
  const todayVal = rec[todayKey];
  const fmt = (v: unknown): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object" && v !== null) {
      const o = v as { open?: string; close?: string; closed?: boolean };
      if (o.closed) return "Closed";
      if (o.open && o.close) return `${o.open} – ${o.close}`;
    }
    return "";
  };
  const todayStr = fmt(todayVal);
  if (todayStr) return `Today: ${todayStr}`;
  for (const d of days) {
    const s = fmt(rec[d]);
    if (s) return `${dayLabels[d]}: ${s}`;
  }
  return "";
}

function OwnerCompletionCard({
  profile,
  mediaCount,
  servicesCount,
  postsCount,
  onUploadMedia,
}: {
  profile: PublicProfile;
  mediaCount: number;
  servicesCount: number;
  postsCount: number;
  onUploadMedia: () => void;
}) {
  const isVerified = profile.verified === "verified";
  const hasAreas = !!(profile.areas_served && profile.areas_served.length > 0);
  const hasAvailability = !!(profile.availability || profile.opening_hours);

  type Step = {
    key: string;
    label: string;
    done: boolean;
    action: React.ReactNode;
  };

  const steps: Step[] = [
    {
      key: "media",
      label: "Upload photos and videos",
      done: mediaCount > 0,
      action: (
        <button
          type="button"
          onClick={onUploadMedia}
          className="text-xs md:text-sm font-semibold text-orange hover:underline p-2 -m-2"
        >
          Upload
        </button>
      ),
    },
    {
      key: "areas",
      label: "Add areas you serve",
      done: hasAreas,
      action: (
        <Link
          to="/profiles/$id"
          params={{ id: profile.id }}
          className="text-xs md:text-sm font-semibold text-orange hover:underline p-2 -m-2"
        >
          Add
        </Link>
      ),
    },
    {
      key: "availability",
      label: "Set your availability",
      done: hasAvailability,
      action: (
        <Link
          to="/profiles/$id"
          params={{ id: profile.id }}
          className="text-xs md:text-sm font-semibold text-orange hover:underline p-2 -m-2"
        >
          Set
        </Link>
      ),
    },
    {
      key: "timeline",
      label: "Post a work update on the Timeline",
      done: postsCount > 0,
      action: <span className="text-xs md:text-sm text-navy/50">Use Timeline tab</span>,
    },
    {
      key: "packages",
      label: "Add packages or a price guide",
      done: servicesCount > 0,
      action: <span className="text-xs md:text-sm text-navy/50">Use Packages tab</span>,
    },
    {
      key: "verify",
      label: "Add verification (optional, later)",
      done: isVerified,
      action: (
        <Link
          to="/trust"
          className="text-xs md:text-sm font-semibold text-orange hover:underline p-2 -m-2"
        >
          Learn more
        </Link>
      ),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <div className="rounded-2xl border border-orange/30 bg-orange/5 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <p className="font-display text-base md:text-lg font-bold text-navy">
          Complete your service profile
        </p>
        <span className="text-xs md:text-sm font-semibold text-navy/60">
          {doneCount}/{steps.length}
        </span>
      </div>
      <p className="mt-1 text-sm md:text-base text-foreground/75">
        A more complete profile attracts more customers.
      </p>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between gap-3 rounded-xl bg-card/60 px-3 py-2.5 md:p-3"
          >
            <span className="flex min-w-0 items-center gap-3 text-sm md:text-base">
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-navy/30" />
              )}
              <span
                className={`truncate ${s.done ? "text-navy/60 line-through" : "text-navy"}`}
              >
                {s.label}
              </span>
            </span>
            {!s.done && <span className="shrink-0">{s.action}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
