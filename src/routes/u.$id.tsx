import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, BadgeCheck, Flag, Star, Share2, Camera, Users, ThumbsUp, ClipboardList } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/social/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { RecommendDialog } from "@/components/social/RecommendDialog";
import { ReviewDialog } from "@/components/social/ReviewDialog";
import { ReportDialog } from "@/components/social/ReportDialog";
import { SaveButton } from "@/components/social/SaveButton";

import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";
import { TrustStats } from "@/components/TrustStats";
import { RequestServiceDialog } from "@/components/RequestServiceDialog";
import { VerifiedReviewBadge } from "@/components/VerifiedReviewBadge";
import { uploadMedia } from "@/lib/upload";
import { timeAgo } from "@/lib/format";

import { useCategory } from "@/hooks/use-categories";
import { toast } from "sonner";
import { useActiveBoosts } from "@/hooks/use-boosts";
import { BoostBadge } from "@/components/BoostBadge";
import { BoostButton } from "@/components/BoostButton";
import { MobileActionBar } from "@/components/MobileActionBar";
import { ContactProviderModal } from "@/components/ContactProviderModal";
import { ContactOptionsUnlocked } from "@/components/ContactOptionsUnlocked";
import { useContactGate } from "@/hooks/use-contact-gate";
import { Lock } from "lucide-react";


import { RouteErrorCard, RouteNotFoundCard } from "@/lib/route-boundaries";

export const Route = createFileRoute("/u/$id")({
  loader: async ({ params }) => {
    try {
      const [{ data: profile }, { data: sp }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,bio,is_provider,district,town,avatar_url").eq("id", params.id).maybeSingle(),
        supabase.from("service_profiles").select("business_name,subcategory,bio,category_slug,district,town,verified").eq("user_id", params.id).maybeSingle(),
      ]);
      return { profile, sp };
    } catch {
      return { profile: null, sp: null };
    }
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.sp?.business_name || loaderData?.profile?.full_name || "Profile";
    const loc = [loaderData?.sp?.town || loaderData?.profile?.town, loaderData?.sp?.district || loaderData?.profile?.district].filter(Boolean).join(", ");
    const subtitle = loaderData?.sp?.subcategory || loaderData?.sp?.category_slug;
    const title = `${name}${subtitle ? ` — ${subtitle}` : ""} | Tuungane`;
    const description = (loaderData?.sp?.bio || loaderData?.profile?.bio || `Connect with ${name}${loc ? ` in ${loc}` : ""} on Tuungane — Uganda's trusted services marketplace.`).slice(0, 158);
    const url = `https://tuungane.com/u/${params.id}`;
    const isProvider = !!loaderData?.sp || loaderData?.profile?.is_provider;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "profile" },
    ];
    if (loaderData?.profile?.avatar_url) {
      meta.push({ property: "og:image", content: loaderData.profile.avatar_url });
      meta.push({ name: "twitter:image", content: loaderData.profile.avatar_url });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (isProvider) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name,
          description,
          url,
          address: loc ? { "@type": "PostalAddress", addressLocality: loaderData?.sp?.town || loaderData?.profile?.town, addressRegion: loaderData?.sp?.district || loaderData?.profile?.district, addressCountry: "UG" } : undefined,
          image: loaderData?.profile?.avatar_url || undefined,
        }),
      });
    }
    return { meta, links: [{ rel: "canonical", href: url }], scripts };
  },
  component: UserProfile,
  errorComponent: ({ error, reset }) => <RouteErrorCard error={error} reset={reset} title="Couldn't load this profile" />,
  notFoundComponent: () => <RouteNotFoundCard title="Profile not found" message="This user profile may have been removed." />,
});

type Tab = "timeline" | "portfolio" | "services" | "recommendations" | "reviews" | "about";

const TABS: { id: Tab; label: string; providerOnly?: boolean }[] = [
  { id: "services", label: "Services", providerOnly: true },
  { id: "portfolio", label: "Portfolio", providerOnly: true },
  { id: "reviews", label: "Reviews", providerOnly: true },
  { id: "about", label: "About" },
  { id: "timeline", label: "Timeline" },
  { id: "recommendations", label: "Recommendations", providerOnly: true },
];

function UserProfile() {
  const { id } = useParams({ from: "/u/$id" });
  const { user } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; bio: string | null; town: string | null; district: string | null; area: string | null; location_visibility: string | null; is_provider: boolean } | null>(null);
  const [sp, setSp] = useState<{ business_name: string | null; subcategory: string; bio: string; town: string; district: string; phone: string | null; whatsapp: string | null; email: string | null; verified: string; category_slug: string; years_experience: number; areas_served: string[]; availability: string; cover_url: string | null; seeded_by_official: boolean; seeded_status: string | null } | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  
  const [followers, setFollowers] = useState(0);
  const [recs, setRecs] = useState<Array<{ id: string; service: string; message: string; rating: number | null; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; text: string; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [tab, setTab] = useState<Tab>("services");
  const [recOpen, setRecOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<Array<{ id: string; rating: number; review_text: string; service_provided: string; created_at: string; customer_id: string; would_recommend: boolean; profile?: { full_name: string; avatar_url: string | null } }>>([]);

  const load = async () => {
    // Use the masked RPC so anon visitors and non-owners can never see
    // location columns they shouldn't (DB-level enforcement of
    // profiles.location_visibility). Owners/admins get unmasked rows.
    const { data: p } = await supabase
      .rpc("get_profile_card", { _id: id })
      .maybeSingle();
    setProfile(p as typeof profile);
    const { data: s } = user
      ? await supabase.from("service_profiles").select("business_name,subcategory,bio,town,district,phone,whatsapp,email,verified,category_slug,years_experience,areas_served,availability,cover_url,seeded_by_official,seeded_status").eq("user_id", id).maybeSingle()
      : await supabase.from("service_profiles").select("business_name,subcategory,bio,town,district,verified,category_slug,years_experience,areas_served,availability,cover_url,seeded_by_official,seeded_status").eq("user_id", id).maybeSingle();
    setSp(s as typeof sp);
    const { data: ps } = await supabase.from("timeline_posts").select("*").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false });
    setPosts((ps ?? []).map((r) => ({ ...r, author: p ?? undefined })) as PostRow[]);

    const [{ count: fc }, rRes, vRes] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("provider_user_id", id),
      supabase.from("provider_recommendations").select("id,service,message,rating,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
      supabase.from("reviews").select("id,rating,text,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
    ]);
    setFollowers(fc ?? 0);

    const ids = Array.from(new Set([...(rRes.data ?? []).map((r) => r.user_id), ...(vRes.data ?? []).map((r) => r.user_id)]));
    let pm = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: ps2 } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = new Map((ps2 ?? []).map((pp) => [pp.id, { full_name: pp.full_name, avatar_url: pp.avatar_url }]));
    }
    setRecs((rRes.data ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) })));
    setReviews((vRes.data ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) })));

    const { data: fbRes } = await supabase.from("service_feedback")
      .select("id,rating,review_text,service_provided,created_at,customer_id,would_recommend")
      .eq("provider_id", id).eq("is_visible", true).order("created_at", { ascending: false });
    const fbList = (fbRes ?? []) as Array<{ id: string; rating: number; review_text: string; service_provided: string; created_at: string; customer_id: string; would_recommend: boolean }>;
    const fbIds = Array.from(new Set(fbList.map((f) => f.customer_id).filter((x) => !pm.has(x))));
    if (fbIds.length) {
      const { data: ps3 } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", fbIds);
      (ps3 ?? []).forEach((p) => pm.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    setFeedback(fbList.map((f) => ({ ...f, profile: pm.get(f.customer_id) })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const uploadCover = async (file: File | null) => {
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const url = await uploadMedia(user.id, file, "covers");
      await supabase.from("service_profiles").update({ cover_url: url }).eq("user_id", user.id);
      load();
      toast.success("Cover updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingCover(false); }
  };

  const share = async () => {
    const url = `${window.location.origin}/u/${id}`;
    if (navigator.share) navigator.share({ title: profile?.full_name ?? "Profile", url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
  };

  const gate = useContactGate(id);
  const cat = useCategory(sp?.category_slug);

  if (!profile) return <Layout><div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div></Layout>;

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const isOwn = user?.id === id;
  const isProvider = profile.is_provider;
  const visibleTabs = TABS.filter((t) => !t.providerOnly || isProvider);
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) setTab(visibleTabs[0]?.id ?? "about");
    // eslint-disable-next-line
  }, [isProvider]);
  const portfolioPosts = posts.filter((p) => p.media_urls.length > 0);

  return (
    <Layout>
      {/* Cover */}
      <div className="relative h-40 w-full sm:h-56" style={{ background: sp?.cover_url ? `url(${sp.cover_url}) center/cover` : "var(--gradient-hero)" }}>
        {isOwn && isProvider && (
          <label className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/70">
            <Camera className="h-3.5 w-3.5" /> {uploadingCover ? "Uploading…" : "Edit cover"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0] ?? null)} disabled={uploadingCover} />
          </label>
        )}
      </div>

      <section className="mx-auto max-w-3xl px-4">
        {sp?.seeded_by_official && sp.seeded_status !== "claimed" && (
          <div className="-mt-6 mb-3 flex flex-col gap-3 rounded-2xl border border-orange/40 bg-orange/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
              <div>
                <p className="font-semibold text-navy">
                  Added by Tuungane Official
                  {sp.seeded_status === "claim_pending" && <span className="ml-2 rounded-full bg-orange/20 px-2 py-0.5 text-[10px] font-semibold text-orange">Claim under review</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">This profile was added by Tuungane to help customers discover this provider. If this is your business, claim it to manage it directly.</p>
              </div>
            </div>
            {user && user.id !== id && sp.seeded_status === "unclaimed" && (
              <button onClick={() => setClaimOpen(true)} className="shrink-0 rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground hover:brightness-110">
                Claim this profile
              </button>
            )}
          </div>
        )}
        {/* Header card */}
        <div className="relative z-10 -mt-12 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)] sm:-mt-16 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
              <div className="-mt-16 shrink-0 rounded-full border-4 border-card bg-card sm:-mt-20">
                <Avatar name={profile.full_name} url={profile.avatar_url} size={96} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold text-navy">
                  {sp?.business_name || profile.full_name}
                  {(sp?.verified === "verified" || sp?.verified === "featured") && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-xs font-semibold text-green"><BadgeCheck className="h-3 w-3" /> Verified</span>
                  )}
                  <ProfileBoostBadges providerId={id} />
                </h1>
                {sp && <p className="text-sm font-medium text-orange">{sp.subcategory} {cat && <span className="text-muted-foreground">· {cat.name}</span>}</p>}
                {!sp && <p className="text-sm text-muted-foreground">{isProvider ? "Service provider" : "Customer"}</p>}
                {(sp?.town || profile.town) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {sp?.town || profile.town}{(sp?.district || profile.district) && `, ${sp?.district || profile.district}`}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> <strong className="text-navy">{followers}</strong> followers</span>
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> <strong className="text-navy">{recs.length}</strong> recommendations</span>
                  {avgRating > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-orange text-orange" /> <strong className="text-navy">{avgRating.toFixed(1)}</strong> ({reviews.length})</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!isOwn && isProvider && (
              <button
                onClick={() => {
                  if (!user) {
                    nav({ to: "/login", search: { tab: "login", redirect: `/u/${id}` } as never });
                    return;
                  }
                  setRequestOpen(true);
                }}
                className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground shadow-sm hover:brightness-110"
              >
                Request service
              </button>
            )}
            {!isOwn && isProvider && <FollowButton providerUserId={id} onChange={setFollowers} />}
            {!isOwn && isProvider && <SaveButton providerUserId={id} variant="full" />}
            <button onClick={share} aria-label="Share" className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-navy hover:border-orange"><Share2 className="h-3.5 w-3.5" /> Share</button>
            {isOwn && isProvider && (
              <>
                <BoostButton boostType="boost_profile" entityType="provider_profile" entityId={id} label="Boost profile" dialogTitle="Boost your provider profile" dialogDescription="Increase your visibility across Tuungane for a set period." />
                <BoostButton boostType="feature_business_page" entityType="provider_profile" entityId={id} label="Feature business" dialogTitle="Feature your business page" dialogDescription="Highlight your business page in featured rails." />
              </>
            )}
            {isOwn && <Link to="/dashboard" className="ml-auto rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-navy hover:border-orange">Edit profile</Link>}
            {!isOwn && user && <button onClick={() => setReportOpen(true)} aria-label="Report" className="ml-auto text-muted-foreground hover:text-destructive"><Flag className="h-4 w-4" /></button>}
          </div>
        </div>

        {!isOwn && isProvider && user && (
          gate.unlocked && gate.requestId ? (
            <div className="mt-4">
              <ContactOptionsUnlocked
                customerId={user.id}
                providerId={id}
                serviceRequestId={gate.requestId}
                phone={sp?.phone ?? null}
                email={sp?.email ?? null}
              />
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-orange/30 bg-orange/5 p-4 text-sm">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              <p className="text-foreground/80">
                Request this service through Tuungane to unlock contact options and help us track service quality.
              </p>
            </div>
          )
        )}

        {isProvider && <div className="mt-4"><TrustStats providerId={id} /></div>}

        {/* Tabs */}
        <div className="sticky top-16 z-10 -mx-4 mt-4 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur">
          <div className="flex gap-1">
            {visibleTabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${tab === t.id ? "text-orange" : "text-muted-foreground hover:text-navy"}`}>
                {t.label}
                {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-orange" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4 pb-10">
          {tab === "timeline" && (
            <>
              {isOwn && isProvider && <PostComposer defaultCategory={sp?.category_slug} onPosted={load} />}
              {posts.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No posts yet.</p>}
              {posts.map((p) => <PostCard key={p.id} post={p} onChanged={load} />)}
            </>
          )}

          {tab === "portfolio" && (
            <>
              {portfolioPosts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No portfolio items yet. Post photos of your work on the timeline to build your portfolio.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {portfolioPosts.flatMap((p) =>
                    p.media_urls.map((u, i) => (
                      <div key={`${p.id}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
                        <img src={u} alt={p.text.slice(0, 60)} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="line-clamp-2 text-[10px] text-white">{p.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {tab === "services" && (
            <>
              {!sp ? (
                <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No service profile yet.</p>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-lg font-bold text-navy">{sp.subcategory}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{cat?.name}</p>
                  <p className="mt-3 text-sm text-foreground/85">{sp.bio || "No description yet."}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-muted-foreground">Areas served</dt><dd className="mt-0.5 font-medium text-navy">{sp.areas_served.join(", ") || sp.town}</dd></div>
                    <div><dt className="text-muted-foreground">Availability</dt><dd className="mt-0.5 font-medium capitalize text-navy">{sp.availability.replace(/_/g, " ")}</dd></div>
                    <div><dt className="text-muted-foreground">Experience</dt><dd className="mt-0.5 font-medium text-navy">{sp.years_experience} years</dd></div>
                    <div><dt className="text-muted-foreground">Status</dt><dd className="mt-0.5 font-medium capitalize text-navy">{sp.verified}</dd></div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {sp.phone && <a href={`tel:${sp.phone}`} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-navy hover:border-orange">Call</a>}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "recommendations" && (
            <>
              {!isOwn && user && isProvider && (
                <button onClick={() => setRecOpen(true)} className="w-full rounded-2xl border-2 border-dashed border-orange/40 bg-orange/5 p-4 text-sm font-semibold text-orange hover:bg-orange/10">+ Recommend this provider</button>
              )}
              {recs.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No recommendations yet.</p>}
              {recs.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.profile?.full_name ?? "User"} url={r.profile?.avatar_url ?? null} size={40} />
                    <div>
                      <p className="text-sm font-semibold text-navy">{r.profile?.full_name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground">recommends for {r.service} · {timeAgo(r.created_at)}</p>
                    </div>
                    {r.rating && <span className="ml-auto text-sm text-orange">{"★".repeat(r.rating)}</span>}
                  </div>
                  <p className="mt-3 text-sm text-foreground/90">{r.message}</p>
                </div>
              ))}
            </>
          )}

          {tab === "reviews" && (
            <>
              {avgRating > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 text-center">
                  <p className="font-display text-4xl font-bold text-navy">{avgRating.toFixed(1)}</p>
                  <p className="mt-1 text-sm text-orange">{"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
                </div>
              )}
              {!isOwn && user && isProvider && (
                <button onClick={() => setRevOpen(true)} className="w-full rounded-2xl border-2 border-dashed border-orange/40 bg-orange/5 p-4 text-sm font-semibold text-orange hover:bg-orange/10">+ Write a review</button>
              )}
              {feedback.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-bold text-navy">Verified service reviews</h4>
                  {feedback.map((f) => (
                    <div key={f.id} className="rounded-2xl border border-green/30 bg-green/5 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={f.profile?.full_name ?? "Customer"} url={f.profile?.avatar_url ?? null} size={36} />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-navy">{f.profile?.full_name ?? "Customer"} <VerifiedReviewBadge /></p>
                          <p className="text-xs text-muted-foreground">{f.service_provided} · {timeAgo(f.created_at)}</p>
                        </div>
                        <span className="ml-auto text-sm text-orange">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                      </div>
                      {f.review_text && <p className="mt-3 text-sm text-foreground/90">{f.review_text}</p>}
                    </div>
                  ))}
                </div>
              )}
              {reviews.length === 0 && feedback.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No reviews yet.</p>}
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.profile?.full_name ?? "User"} url={r.profile?.avatar_url ?? null} size={36} />
                    <div>
                      <p className="text-sm font-semibold text-navy">{r.profile?.full_name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
                    </div>
                    <span className="ml-auto text-sm text-orange">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  {r.text && <p className="mt-3 text-sm text-foreground/90">{r.text}</p>}
                </div>
              ))}
            </>
          )}


          {tab === "about" && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-lg font-bold text-navy">About</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{sp?.bio || profile.bio || "No bio yet."}</p>
              <dl className="mt-5 space-y-2 text-sm">
                {sp && <Row label="Service" value={`${sp.subcategory} · ${cat?.name ?? ""}`} />}
                <Row label="Location" value={`${sp?.town || profile.town || "—"}${(sp?.district || profile.district) ? `, ${sp?.district || profile.district}` : ""}`} />
                {sp && <Row label="Areas served" value={sp.areas_served.join(", ") || sp.town} />}
                {sp && <Row label="Experience" value={`${sp.years_experience} years`} />}
                {sp && <Row label="Availability" value={sp.availability.replace(/_/g, " ")} />}
                {sp?.phone && <Row label="Phone" value={sp.phone} />}
                
                {sp?.email && <Row label="Email" value={sp.email} />}
                {sp && <Row label="Verification" value={sp.verified} />}
              </dl>
            </div>
          )}
        </div>

        <RecommendDialog open={recOpen} onClose={() => setRecOpen(false)} providerUserId={id} />
        <ReviewDialog open={revOpen} onClose={() => setRevOpen(false)} providerUserId={id} onPosted={load} />
        <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="provider" targetId={id} />
        <ClaimProfileDialog serviceProfileUserId={id} open={claimOpen} onClose={() => setClaimOpen(false)} onSubmitted={load} />
        <RequestServiceDialog open={requestOpen} onClose={() => setRequestOpen(false)} providerId={id} providerName={sp?.business_name || profile.full_name} defaultCategorySlug={sp?.category_slug} defaultSubcategory={sp?.subcategory} onSubmitted={() => { load(); gate.refresh(); }} />
        <ContactProviderModal open={contactModalOpen} onClose={() => setContactModalOpen(false)} providerName={sp?.business_name || profile.full_name} onRequestService={() => setRequestOpen(true)} />
      </section>

      {!isOwn && isProvider && (
        <MobileActionBar>
          <button onClick={() => { if (!user) { nav({ to: "/login", search: { tab: "login", redirect: `/u/${id}` } as never }); return; } setRequestOpen(true); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground shadow-sm"><ClipboardList className="h-4 w-4" /> Request service</button>
          {sp?.phone && <a href={`tel:${sp.phone}`} aria-label="Call provider" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-navy"><Phone className="h-4 w-4" /></a>}
        </MobileActionBar>
      )}
    </Layout>

  );
}

function ProfileBoostBadges({ providerId }: { providerId: string }) {
  const { boosts } = useActiveBoosts("provider_profile", providerId);
  return <>{boosts.map((b) => <BoostBadge key={b.id} type={b.boost_type} />)}</>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize text-navy">{value}</dd>
    </div>
  );
}
