import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Tuungane` },
      { name: "description", content: "Service listing on Tuungane." },
    ],
  }),
  component: PublicProfilePage,
});

const QUICK_MESSAGES = [
  "Is this available?",
  "What is your price?",
  "Can you come today?",
  "I need this service",
];

function PublicProfilePage() {
  const { slug } = Route.useParams();
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

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("public_profiles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!p) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const prof = p as PublicProfile;
    setProfile(prof);

    const [{ data: sp }, { data: ownerRow }, { data: mediaRows }, { data: s }, { data: t }, { count: c }] = await Promise.all([
      supabase
        .from("service_profiles")
        .select("price_display,price_min,price_max,created_at")
        .eq("user_id", prof.owner_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id,full_name,avatar_url")
        .eq("id", prof.owner_id)
        .maybeSingle(),
      supabase
        .from("service_media")
        .select("id,kind,url,thumbnail_url,is_cover,sort_order")
        .eq("public_profile_id" as never, prof.id)
        .order("is_cover", { ascending: false })
        .order("sort_order"),
      supabase
        .from("profile_services")
        .select(
          "id,title,description,price_guidance_ugx,active,is_primary,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note",
        )
        .eq("profile_id", prof.id)
        .eq("active", true)
        .order("is_primary", { ascending: false })
        .order("sort_order"),
      supabase
        .from("timeline_posts")
        .select("*")
        .eq("public_profile_id", prof.id)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("public_profile_id", prof.id)
        .eq("status", "completed"),
    ]);
    setExtras((sp as ServiceProfileExtras | null) ?? null);
    setOwner((ownerRow as OwnerProfile | null) ?? null);
    setMedia((mediaRows ?? []) as ServiceMediaItem[]);
    setServices((s ?? []) as Service[]);
    setPosts((t ?? []) as PostRow[]);
    setCompleted(c ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-sm text-muted-foreground">
            This service doesn’t exist or was removed.
          </p>
          <Link to="/services" className="mt-3 inline-block text-sm font-semibold text-orange">
            ← Browse services
          </Link>
        </div>
      </Layout>
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
    <Layout>
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
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75"
            aria-label="Upload photos and videos"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {media.length === 0
              ? "Upload photos & videos — build trust"
              : "Upload more photos & videos"}
          </button>
        )}
      </div>

      <section className="mx-auto mt-4 max-w-2xl px-4 pb-32">
        {/* Service summary card */}
        <div className="relative rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h1 className="text-center font-display text-xl font-bold leading-tight text-navy sm:text-2xl">
            {profile.name}
          </h1>

          <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-navy/60">
            {profile.subcategory
              ? formatSubcategory(profile.subcategory)
              : profile.category_slug ?? "Service"}
          </p>

          {(location || isVerified) && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-navy/60" />
                  {location}
                </span>
              )}
              {profile.profile_type === "individual" ? (
                <ProfileTrustBadge kind="service_profile" id={profile.owner_id} />
              ) : isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {priceLabel && (
              <span className="inline-flex items-center rounded-full bg-navy/5 px-3 py-1 text-xs font-bold text-navy">
                {priceLabel}
              </span>
            )}
            {recentlyListed && !isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange">
                <Sparkles className="h-3 w-3" /> Recently listed
              </span>
            )}
            {completed > 0 && (
              <span className="inline-flex items-center rounded-full bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">
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
            className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-navy/30"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
              <Avatar name={owner.full_name || profile.name} url={owner.avatar_url} size={40} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-navy/50">
                Offered by
              </p>
              <p className="truncate text-sm font-semibold text-navy">
                {owner.full_name || "View provider"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-navy/40" />
          </Link>
        )}

        {/* Contact actions — visitors only */}
        {!isOwner && (
          <>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Link
                to="/messages"
                search={{ to: profile.owner_id } as never}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange px-4 py-3 text-sm font-bold text-orange-foreground shadow-sm"
              >
                <MessageSquare className="h-4 w-4" /> Message
              </Link>
              {profile.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/25 bg-card px-4 py-3 text-sm font-semibold text-navy"
                >
                  <Phone className="h-4 w-4" /> Call {profile.name.split(" ")[0]}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => requestService()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange/40 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange"
              >
                Request service
              </button>
            </div>

            {/* Quick-message chips */}
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/50">
                Quick message
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_MESSAGES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => sendQuickMessage(m)}
                    className="rounded-full border border-navy/20 bg-card px-3 py-1.5 text-xs font-medium text-navy transition hover:border-orange hover:text-orange"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={shareService}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy/70 hover:text-navy"
            >
              <Share2 className="h-3.5 w-3.5" /> Share this service
            </button>
          </>
        )}

        {/* Compact owner tools row */}
        {isOwner && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2 py-1.5">
            <span className="pl-1 text-[10px] font-semibold uppercase tracking-wide text-navy/60">
              Owner
            </span>
            <Link
              to="/profiles/$id"
              params={{ id: profile.id }}
              className="inline-flex items-center gap-1 rounded-full bg-orange px-2.5 py-1 text-[11px] font-semibold text-orange-foreground"
            >
              <Pencil className="h-3 w-3" /> Edit
            </Link>
            <button
              type="button"
              onClick={() => setMediaManagerOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-card px-2.5 py-1 text-[11px] font-semibold text-navy"
            >
              <ImagePlus className="h-3 w-3" /> Photos
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-card px-2.5 py-1 text-[11px] font-semibold text-navy"
            >
              <LayoutDashboard className="h-3 w-3" /> Dashboard
            </Link>
            <button
              onClick={shareService}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-navy/70"
            >
              <Share2 className="h-3 w-3" /> Share
            </button>
          </div>
        )}


        {/* Tabs */}
        <Tabs defaultValue="about" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
            <TabsTrigger
              value="about"
              className="rounded-lg text-sm font-semibold text-navy/60 data-[state=active]:bg-card data-[state=active]:text-orange data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-orange/30"
            >
              About
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="rounded-lg text-sm font-semibold text-navy/60 data-[state=active]:bg-card data-[state=active]:text-orange data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-orange/30"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="rounded-lg text-sm font-semibold text-navy/60 data-[state=active]:bg-card data-[state=active]:text-orange data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-orange/30"
            >
              Services
            </TabsTrigger>
          </TabsList>

          {/* ABOUT */}
          <TabsContent value="about" className="mt-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display text-base font-bold text-navy">About {profile.name}</h2>
              {profile.bio ? (
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{profile.bio}</p>
              ) : isOwner ? (
                <Link
                  to="/profiles/$id"
                  params={{ id: profile.id }}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-orange"
                >
                  <Plus className="h-3.5 w-3.5" /> Add a description
                </Link>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No description yet.</p>
              )}

              <dl className="mt-4 divide-y divide-border/60">
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
                  icon={<Clock className="h-3.5 w-3.5 text-navy/60" />}
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
                    icon={<Phone className="h-3.5 w-3.5 text-navy/60" />}
                    isOwner
                    emptyOwnerPrompt="Add phone number"
                    profileEditId={profile.id}
                  />
                ) : profile.phone ? (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-navy/50">
                      Contact
                    </dt>
                    <a
                      href={`tel:${profile.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call {profile.name.split(" ")[0]}
                    </a>
                  </div>
                ) : null}
              </dl>

              {isOwner && (
                <Link
                  to="/profiles/$id"
                  params={{ id: profile.id }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-orange"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit About
                </Link>
              )}
            </div>
          </TabsContent>



          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-3 space-y-3">
            {isOwner && (
              <PostComposer
                defaultCategory={profile.category_slug}
                publicProfileId={profile.id}
                onPosted={load}
              />
            )}
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                {isOwner
                  ? "Share a photo, video, or update to show your work under this service."
                  : "No updates yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onChanged={load} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* SERVICES */}
          <TabsContent value="services" className="mt-3 space-y-2">
            {services.length === 0 ? (
              isOwner ? (
                <Link
                  to="/profiles/$id"
                  params={{ id: profile.id }}
                  className="flex items-center justify-center gap-1 rounded-2xl border border-dashed border-orange/40 bg-orange/5 p-5 text-sm font-semibold text-orange"
                >
                  <Plus className="h-4 w-4" /> Add your first service or package
                </Link>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
                  No specific services listed yet. You can still request this service directly.
                </div>
              )
            ) : (
              <ul className="space-y-2">
                {services.map((s) => (
                  <li
                    key={s.id}
                    className={`rounded-2xl border bg-card p-3 ${
                      s.is_primary ? "border-orange/40 ring-1 ring-orange/15" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">{s.title}</p>
                        {s.description && (
                          <ExpandableText
                            text={s.description}
                            clampLines={3}
                            maxLines={8}
                            className="mt-0.5"
                          />
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <PriceGuideChip guide={s as PriceGuide} />
                          {!s.price_type && s.price_guidance_ugx && (
                            <span className="inline-flex items-center rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange">
                              From UGX {s.price_guidance_ugx.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {s.price_note && (
                          <p className="mt-1 text-[11px] text-muted-foreground">{s.price_note}</p>
                        )}
                      </div>
                      {!isOwner && (
                        <button
                          onClick={() => requestService(s.id)}
                          className="shrink-0 rounded-xl bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground"
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
                className="mt-2 inline-flex items-center gap-1 rounded-xl border border-dashed border-orange/40 bg-orange/5 px-3 py-2.5 text-sm font-semibold text-orange"
              >
                <Plus className="h-4 w-4" /> Add sub-service
              </Link>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {isOwner && (
        <Dialog
          open={mediaManagerOpen}
          onOpenChange={(open) => {
            setMediaManagerOpen(open);
            if (!open) load();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Photos &amp; videos</DialogTitle>
            </DialogHeader>
            <ServiceMediaManager ownerId={profile.owner_id} profileId={profile.id} />
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}

function AboutBlock({
  label,
  children,
  empty,
}: {
  label: string;
  children?: React.ReactNode;
  empty?: string;
}) {
  const hasContent = Boolean(children);
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/60">{label}</p>
      <div className="mt-1">
        {hasContent ? children : <p className="text-sm text-muted-foreground italic">{empty ?? "—"}</p>}
      </div>
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
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-navy/50">{label}</dt>
      <dd className={`min-w-0 text-right text-sm text-foreground/90 ${valueClass ?? ""}`}>
        {has ? (
          <span className="inline-flex items-center gap-1">
            {icon}
            <span className="truncate">{value}</span>
          </span>
        ) : isOwner && emptyOwnerPrompt && profileEditId ? (
          <Link
            to="/profiles/$id"
            params={{ id: profileEditId }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange"
          >
            <Plus className="h-3 w-3" /> {emptyOwnerPrompt}
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
  // Fallback: first day with hours
  for (const d of days) {
    const s = fmt(rec[d]);
    if (s) return `${dayLabels[d]}: ${s}`;
  }
  return "";
}

