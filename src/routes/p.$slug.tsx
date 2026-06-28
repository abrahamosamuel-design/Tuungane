import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Building2, User as UserIcon, Landmark, Star, MapPin, MessageSquare, Phone, ShieldCheck } from "lucide-react";
import { ReviewDialog } from "@/components/social/ReviewDialog";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { formatSubcategory } from "@/lib/format-category";
import { Avatar } from "@/components/social/Avatar";
import { CoverImage } from "@/components/media/CoverImage";


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
  phone: string | null;
  verified: string;
  legacy_source: string | null;
  legacy_ref: string | null;
};

type Service = {
  id: string;
  title: string;
  description: string;
  price_guidance_ugx: number | null;
  active: boolean;
};

type Review = {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  user_id: string;
};

const TYPE_META: Record<ProfileType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  individual: { label: "Individual provider", icon: UserIcon },
  business: { label: "Business", icon: Building2 },
  organization: { label: "Organization", icon: Landmark },
};

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Tuungane` },
      { name: "description", content: "Public profile on Tuungane." },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("public_profiles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!p) { setProfile(null); setLoading(false); return; }
    const prof = p as PublicProfile;
    setProfile(prof);

    const [{ data: s }, { data: r }, { count: completed }] = await Promise.all([
      supabase.from("profile_services").select("id,title,description,price_guidance_ugx,active").eq("profile_id", prof.id).eq("active", true).order("sort_order"),
      supabase.from("reviews").select("id,rating,text,created_at,user_id").eq("public_profile_id", prof.id).eq("hidden", false).order("created_at", { ascending: false }).limit(20),
      supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("public_profile_id", prof.id).eq("status", "completed"),
    ]);
    setServices((s ?? []) as Service[]);
    setReviews((r ?? []) as Review[]);
    setStats({ completed: completed ?? 0, pending: 0 });
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);

  if (loading) {
    return <Layout><div className="mx-auto max-w-2xl px-4 py-8 text-sm text-muted-foreground">Loading…</div></Layout>;
  }

  if (!profile) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-sm text-muted-foreground">This profile doesn’t exist or was removed.</p>
          <Link to="/services" className="mt-3 inline-block text-sm font-semibold text-orange">← Browse services</Link>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === profile.owner_id;
  void TYPE_META;
  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;
  const location = [profile.area, profile.town, profile.district].filter(Boolean).join(", ");

  const requestService = (serviceId?: string) => {
    if (!user) {
      nav({ to: "/login", search: { tab: "signup", redirect: `/p/${profile.slug}` } as never });
      return;
    }
    nav({
      to: "/requests/new",
      search: { profileId: profile.id, serviceId: serviceId ?? "" } as never,
    });
  };

  return (
    <Layout>
      {/* Cover */}
      <div className="relative h-32 w-full sm:h-44">
        <CoverImage
          variant="wide"
          imageUrl={profile.cover_url}
          categorySlug={profile.category_slug}
          name={profile.name}
          label="No profile banner yet"
          className="h-32 w-full rounded-none sm:h-44"
        />
      </div>

      <section className="mx-auto -mt-10 max-w-2xl px-4 pb-24">
        <div className="flex items-end gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow">
            <Avatar
              name={profile.name}
              url={profile.avatar_url ?? profile.cover_url}
              categorySlug={profile.category_slug}
              verifiedRing={profile.verified === "verified"}
              size={72}
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-navy">{profile.name}</h1>
            {profile.profile_type === "individual" ? (
              <ProfileTrustBadge kind="service_profile" id={profile.owner_id} />
            ) : profile.verified === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-navy/60">
            {TYPE_META[profile.profile_type].label}
            {profile.subcategory ? ` · ${formatSubcategory(profile.subcategory)}` : profile.category_slug ? ` · ${profile.category_slug}` : ""}
          </p>
          {location && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {location}
            </p>
          )}
        </div>

        {/* Trust strip */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 text-center">
          <Stat label="Services" value={services.length} />
          <Stat label="Completed" value={stats.completed} />
          <Stat
            label="Rating"
            value={avgRating ? avgRating.toFixed(1) : "—"}
            sub={`${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
          />
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 whitespace-pre-line rounded-2xl border border-border bg-card p-4 text-sm text-foreground/90">
            {profile.bio}
          </p>
        )}

        {/* Primary actions */}
        {!isOwner && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => requestService()}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground"
            >
              Request service
            </button>
            <Link
              to="/messages"
              search={{ to: profile.owner_id } as never}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-navy/20 bg-card px-4 py-2.5 text-sm font-semibold text-navy"
            >
              <MessageSquare className="h-4 w-4" /> Message
            </Link>
          </div>
        )}

        {/* Services */}
        <div className="mt-6">
          <h2 className="font-display text-lg font-bold text-navy">Services</h2>
          {services.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              No services listed yet.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {services.map((s) => (
                <li key={s.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">{s.title}</p>
                      {s.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                      {s.price_guidance_ugx && (
                        <p className="mt-1 text-xs font-semibold text-orange">From UGX {s.price_guidance_ugx.toLocaleString()}</p>
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
        </div>

        {/* Reviews */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-navy">Reviews</h2>
            {!isOwner && user && (
              <button onClick={() => setReviewOpen(true)} className="text-xs font-semibold text-orange">
                Leave a review
              </button>
            )}
          </div>
          {reviews.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              No reviews yet — be the first to leave one after a completed service.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center gap-1 text-orange">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-orange" : "text-muted-foreground"}`} />
                    ))}
                    <span className="ml-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.text && <p className="mt-1 text-sm text-foreground/90">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isOwner && (
          <Link
            to="/profiles/$id"
            params={{ id: profile.id }}
            className="mt-6 inline-block rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-navy"
          >
            Manage this profile →
          </Link>
        )}
      </section>

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        providerUserId={profile.owner_id}
        publicProfileId={profile.id}
        onPosted={load}
      />
    </Layout>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <p className="font-display text-xl font-bold text-navy">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
