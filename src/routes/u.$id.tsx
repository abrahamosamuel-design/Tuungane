import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, BadgeCheck, Flag, Star, Share2, Camera, Briefcase, Users, ThumbsUp } from "lucide-react";
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
import { OpportunityCard, type OpportunityRow } from "@/components/OpportunityCard";
import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";
import { TrustStats } from "@/components/TrustStats";
import { RequestServiceDialog } from "@/components/RequestServiceDialog";
import { VerifiedReviewBadge } from "@/components/VerifiedReviewBadge";
import { uploadMedia } from "@/lib/upload";
import { timeAgo } from "@/lib/format";
import { getCategory } from "@/data/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$id")({
  head: () => ({ meta: [{ title: "Profile — Tuungane" }] }),
  component: UserProfile,
});

type Tab = "timeline" | "portfolio" | "services" | "recommendations" | "reviews" | "opportunities" | "about";

const TABS: { id: Tab; label: string; providerOnly?: boolean }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "portfolio", label: "Portfolio", providerOnly: true },
  { id: "services", label: "Services", providerOnly: true },
  { id: "recommendations", label: "Recommendations", providerOnly: true },
  { id: "reviews", label: "Reviews", providerOnly: true },
  { id: "opportunities", label: "Opportunities" },
  { id: "about", label: "About" },
];

function UserProfile() {
  const { id } = useParams({ from: "/u/$id" });
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; bio: string | null; town: string | null; district: string | null; is_provider: boolean } | null>(null);
  const [sp, setSp] = useState<{ business_name: string | null; subcategory: string; bio: string; town: string; district: string; phone: string | null; whatsapp: string | null; email: string | null; verified: string; category_slug: string; years_experience: number; areas_served: string[]; availability: string; cover_url: string | null; seeded_by_official: boolean; seeded_status: string | null } | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [opps, setOpps] = useState<OpportunityRow[]>([]);
  const [followers, setFollowers] = useState(0);
  const [recs, setRecs] = useState<Array<{ id: string; service: string; message: string; rating: number | null; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; text: string; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [tab, setTab] = useState<Tab>("timeline");
  const [recOpen, setRecOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [feedback, setFeedback] = useState<Array<{ id: string; rating: number; review_text: string; service_provided: string; created_at: string; customer_id: string; would_recommend: boolean; profile?: { full_name: string; avatar_url: string | null } }>>([]);

  const load = async () => {
    const { data: p } = await supabase.from("profiles").select("full_name,avatar_url,bio,town,district,is_provider").eq("id", id).maybeSingle();
    setProfile(p);
    const { data: s } = await supabase.from("service_profiles").select("business_name,subcategory,bio,town,district,phone,whatsapp,email,verified,category_slug,years_experience,areas_served,availability,cover_url,seeded_by_official,seeded_status").eq("user_id", id).maybeSingle();
    setSp(s);
    const { data: ps } = await supabase.from("timeline_posts").select("*").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false });
    setPosts((ps ?? []).map((r) => ({ ...r, author: p ?? undefined })) as PostRow[]);

    const [{ count: fc }, rRes, vRes, oRes] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("provider_user_id", id),
      supabase.from("provider_recommendations").select("id,service,message,rating,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
      supabase.from("reviews").select("id,rating,text,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
      supabase.from("opportunities").select("*").eq("poster_id", id).in("status", ["approved", "featured"]).order("created_at", { ascending: false }),
    ]);
    setFollowers(fc ?? 0);
    setOpps((oRes.data ?? []) as OpportunityRow[]);

    const ids = Array.from(new Set([...(rRes.data ?? []).map((r) => r.user_id), ...(vRes.data ?? []).map((r) => r.user_id)]));
    let pm = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: ps2 } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = new Map((ps2 ?? []).map((pp) => [pp.id, { full_name: pp.full_name, avatar_url: pp.avatar_url }]));
    }
    setRecs((rRes.data ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) })));
    setReviews((vRes.data ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) })));

    const { data: fbRes } = await (supabase as any).from("service_feedback")
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

  if (!profile) return <Layout><div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div></Layout>;

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const isOwn = user?.id === id;
  const isProvider = profile.is_provider;
  const cat = sp ? getCategory(sp.category_slug) : null;
  const visibleTabs = TABS.filter((t) => !t.providerOnly || isProvider);
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
        <div className="-mt-12 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="-mt-12 rounded-full border-4 border-card bg-card sm:-mt-16">
                <Avatar name={profile.full_name} url={profile.avatar_url} size={96} />
              </div>
              <div className="flex-1">
                <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold text-navy">
                  {sp?.business_name || profile.full_name}
                  {(sp?.verified === "verified" || sp?.verified === "featured") && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-xs font-semibold text-green"><BadgeCheck className="h-3 w-3" /> Verified</span>
                  )}
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
            {!isOwn && user && isProvider && (
              <button onClick={() => setRequestOpen(true)} className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-navy-foreground hover:brightness-110">Request service</button>
            )}
            {!isOwn && isProvider && <FollowButton providerUserId={id} onChange={setFollowers} />}
            {!isOwn && isProvider && <SaveButton providerUserId={id} variant="full" />}
            {!isOwn && user && isProvider && (
              <>
                <button onClick={() => setRecOpen(true)} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-navy hover:border-orange">Recommend</button>
                <button onClick={() => setRevOpen(true)} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-navy hover:border-orange">Review</button>
              </>
            )}
            {sp?.whatsapp && <a href={`https://wa.me/${sp.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-green px-4 py-2 text-xs font-semibold text-green-foreground"><Phone className="h-3 w-3" /> WhatsApp</a>}
            {sp?.phone && <a href={`tel:${sp.phone}`} className="inline-flex items-center gap-1 rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground"><Phone className="h-3 w-3" /> Call</a>}
            <button onClick={share} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-navy hover:border-orange"><Share2 className="h-3 w-3" /> Share</button>
            {isOwn && <Link to="/dashboard" className="ml-auto rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-navy hover:border-orange">Edit profile</Link>}
            {!isOwn && user && <button onClick={() => setReportOpen(true)} className="ml-auto text-muted-foreground hover:text-destructive"><Flag className="h-4 w-4" /></button>}
          </div>
        </div>

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
                    {sp.whatsapp && <a href={`https://wa.me/${sp.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-full bg-green px-4 py-2 text-xs font-semibold text-green-foreground">WhatsApp</a>}
                    {sp.phone && <a href={`tel:${sp.phone}`} className="rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground">Call</a>}
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

          {tab === "opportunities" && (
            <>
              {isOwn && (
                <Link to="/opportunities/new" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange/40 bg-orange/5 p-4 text-sm font-semibold text-orange hover:bg-orange/10">
                  <Briefcase className="h-4 w-4" /> Post an opportunity
                </Link>
              )}
              {opps.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No opportunities posted.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {opps.map((o) => <OpportunityCard key={o.id} o={{ ...o, author: { full_name: profile.full_name, avatar_url: profile.avatar_url } }} />)}
              </div>
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
                {sp?.whatsapp && <Row label="WhatsApp" value={sp.whatsapp} />}
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
        <RequestServiceDialog open={requestOpen} onClose={() => setRequestOpen(false)} providerId={id} providerName={sp?.business_name || profile.full_name} defaultCategorySlug={sp?.category_slug} defaultSubcategory={sp?.subcategory} onSubmitted={load} />
      </section>
    </Layout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize text-navy">{value}</dd>
    </div>
  );
}
