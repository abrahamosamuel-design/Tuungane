import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, BadgeCheck, Flag, Star } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/social/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { RecommendDialog } from "@/components/social/RecommendDialog";
import { ReviewDialog } from "@/components/social/ReviewDialog";
import { ReportDialog } from "@/components/social/ReportDialog";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/u/$id")({
  head: () => ({ meta: [{ title: "Provider — Tuungane" }] }),
  component: UserProfile,
});

type Tab = "timeline" | "recommendations" | "reviews";

function UserProfile() {
  const { id } = useParams({ from: "/u/$id" });
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; bio: string | null; town: string | null; district: string | null; is_provider: boolean } | null>(null);
  const [sp, setSp] = useState<{ business_name: string | null; subcategory: string; bio: string; town: string; district: string; phone: string | null; whatsapp: string | null; verified: string; category_slug: string } | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [recs, setRecs] = useState<Array<{ id: string; service: string; message: string; rating: number | null; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; text: string; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [tab, setTab] = useState<Tab>("timeline");
  const [recOpen, setRecOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const load = async () => {
    const { data: p } = await supabase.from("profiles").select("full_name,avatar_url,bio,town,district,is_provider").eq("id", id).maybeSingle();
    setProfile(p);
    const { data: s } = await supabase.from("service_profiles").select("business_name,subcategory,bio,town,district,phone,whatsapp,verified,category_slug").eq("user_id", id).maybeSingle();
    setSp(s);
    const { data: ps } = await supabase.from("timeline_posts").select("*").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false });
    setPosts((ps ?? []).map((r) => ({ ...r, author: p ?? undefined })) as PostRow[]);

    const [rRes, vRes] = await Promise.all([
      supabase.from("provider_recommendations").select("id,service,message,rating,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
      supabase.from("reviews").select("id,rating,text,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
    ]);
    const ids = Array.from(new Set([...(rRes.data ?? []).map((r) => r.user_id), ...(vRes.data ?? []).map((r) => r.user_id)]));
    let pm = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: ps2 } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = new Map((ps2 ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    setRecs((rRes.data ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) })));
    setReviews((vRes.data ?? []).map((r) => ({ ...r, profile: pm.get(r.user_id) })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!profile) return <Layout><div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div></Layout>;

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const isOwn = user?.id === id;

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={profile.full_name} url={profile.avatar_url} size={80} />
              <div>
                <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy">
                  {sp?.business_name || profile.full_name}
                  {(sp?.verified === "verified" || sp?.verified === "featured") && <BadgeCheck className="h-5 w-5 text-green" />}
                </h1>
                {sp && <p className="text-sm text-orange">{sp.subcategory}</p>}
                {(sp?.town || profile.town) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {sp?.town || profile.town}, {sp?.district || profile.district}
                  </p>
                )}
                {avgRating > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-orange text-orange" /> {avgRating.toFixed(1)} ({reviews.length})
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isOwn && profile.is_provider && <FollowButton providerUserId={id} />}
              {!isOwn && user && profile.is_provider && (
                <>
                  <button onClick={() => setRecOpen(true)} className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-navy hover:border-orange">Recommend</button>
                  <button onClick={() => setRevOpen(true)} className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-navy hover:border-orange">Review</button>
                </>
              )}
              {sp?.whatsapp && <a href={`https://wa.me/${sp.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-2 text-xs font-semibold text-white"><Phone className="h-3 w-3" /> WhatsApp</a>}
              {!isOwn && user && <button onClick={() => setReportOpen(true)} className="text-muted-foreground hover:text-destructive"><Flag className="h-4 w-4" /></button>}
            </div>
          </div>
          {(sp?.bio || profile.bio) && <p className="mt-4 text-sm text-foreground/80">{sp?.bio || profile.bio}</p>}
        </div>

        <div className="mt-6 flex gap-2 border-b border-border">
          {(["timeline", "recommendations", "reviews"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "text-orange" : "text-muted-foreground"}`}>
              {t}{tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-orange" />}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {tab === "timeline" && (
            <>
              {posts.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No posts yet.</p>}
              {posts.map((p) => <PostCard key={p.id} post={p} onChanged={load} />)}
            </>
          )}
          {tab === "recommendations" && (
            <>
              {recs.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No recommendations yet.</p>}
              {recs.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.profile?.full_name ?? "User"} url={r.profile?.avatar_url ?? null} size={36} />
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
              {reviews.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No reviews yet.</p>}
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
        </div>

        <RecommendDialog open={recOpen} onClose={() => setRecOpen(false)} providerUserId={id} />
        <ReviewDialog open={revOpen} onClose={() => setRevOpen(false)} providerUserId={id} onPosted={load} />
        <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="provider" targetId={id} />
      </section>
    </Layout>
  );
}
