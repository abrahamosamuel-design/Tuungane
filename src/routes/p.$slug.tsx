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
  opening_hours: string | null;
  phone: string | null;
  whatsapp: string | null;
  verified: string;
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
      { name: "description", content: "Service profile on Tuungane." },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { requireAuth } = useAuthGate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

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

    const [{ data: s }, { data: t }, { count: c }] = await Promise.all([
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
  const location = [profile.area, profile.town, profile.district].filter(Boolean).join(", ");
  const isVerified = profile.verified === "verified";

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
      {/* Plain background strip — banner removed for MVP */}
      <div className="h-16 w-full bg-gradient-to-b from-muted/60 to-transparent" />

      <section className="mx-auto -mt-10 max-w-2xl px-4 pb-24">
        {/* Logo + identity */}
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-md">
            <Avatar
              name={profile.name}
              url={profile.avatar_url ?? profile.cover_url}
              categorySlug={profile.category_slug}
              verifiedRing={isVerified}
              size={88}
            />
          </div>
          <div className="mt-3 min-w-0 sm:ml-4 sm:mt-0">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-display text-2xl font-bold text-navy">{profile.name}</h1>
              {profile.profile_type === "individual" ? (
                <ProfileTrustBadge kind="service_profile" id={profile.owner_id} />
              ) : isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-navy/60">
              {profile.subcategory
                ? formatSubcategory(profile.subcategory)
                : profile.category_slug ?? "Service"}
            </p>
            {location && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {location}
              </p>
            )}
            {/* Soft trust chip — no broken 0-review formats */}
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {isVerified && (
                <span className="rounded-full bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">
                  Verified service
                </span>
              )}
              {completed > 0 ? (
                <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-semibold text-navy/80">
                  {completed} completed request{completed === 1 ? "" : "s"}
                </span>
              ) : !isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange">
                  <Sparkles className="h-3 w-3" /> Recently listed
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Primary actions — visitors only */}
        {!isOwner && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              onClick={() => requestService()}
              className="col-span-2 inline-flex items-center justify-center gap-1 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground"
            >
              Request service
            </button>
            <Link
              to="/messages"
              search={{ to: profile.owner_id } as never}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-navy/20 bg-card px-3 py-2.5 text-sm font-semibold text-navy"
            >
              <MessageSquare className="h-4 w-4" /> Message
            </Link>
            <button
              onClick={shareService}
              className="col-span-3 inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-navy/80"
            >
              <Share2 className="h-3.5 w-3.5" /> Share this service
            </button>
          </div>
        )}

        {/* Owner-only slim bar (never for visitors) */}
        {isOwner && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-orange/30 bg-orange/5 p-3">
            <span className="text-xs font-semibold text-orange/90">Owner tools</span>
            <Link
              to="/profiles/$id"
              params={{ id: profile.id }}
              className="inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit service
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-card px-3 py-1.5 text-xs font-semibold text-navy"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <button
              onClick={shareService}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-navy/70"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="about" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          {/* ABOUT */}
          <TabsContent value="about" className="mt-3 space-y-3">
            <AboutBlock label="Description" empty="No description yet.">
              {profile.bio ? (
                <p className="whitespace-pre-line text-sm text-foreground/90">{profile.bio}</p>
              ) : null}
            </AboutBlock>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AboutBlock label="Category">
                <p className="text-sm text-foreground/90">
                  {profile.subcategory
                    ? formatSubcategory(profile.subcategory)
                    : profile.category_slug ?? "—"}
                </p>
              </AboutBlock>
              <AboutBlock label="Location">
                <p className="text-sm text-foreground/90">{location || "—"}</p>
              </AboutBlock>
              <AboutBlock label="Areas served" empty="Not set yet.">
                {profile.areas_served && profile.areas_served.length > 0 ? (
                  <p className="text-sm text-foreground/90">
                    {profile.areas_served.join(", ")}
                  </p>
                ) : null}
              </AboutBlock>
              <AboutBlock label="Availability" empty="Not set yet.">
                {profile.availability || profile.opening_hours ? (
                  <p className="inline-flex items-center gap-1 text-sm text-foreground/90">
                    <Clock className="h-3.5 w-3.5 text-navy/60" />
                    {profile.availability || profile.opening_hours}
                  </p>
                ) : null}
              </AboutBlock>
            </div>

            {profile.phone && (
              <AboutBlock label="Phone">
                <p className="inline-flex items-center gap-1 text-sm text-foreground/90">
                  <Phone className="h-3.5 w-3.5 text-navy/60" /> {profile.phone}
                </p>
              </AboutBlock>
            )}

            {isOwner && (
              <Link
                to="/profiles/$id"
                params={{ id: profile.id }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit About
              </Link>
            )}
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
              <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
                No services added yet. Add the specific things customers can request under this service.
              </div>
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
                          Request this service
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
                <Plus className="h-4 w-4" /> Add service
              </Link>
            )}
          </TabsContent>
        </Tabs>
      </section>
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
