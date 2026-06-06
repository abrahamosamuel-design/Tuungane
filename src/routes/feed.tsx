import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, MapPin, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { PostCard, type PostRow } from "@/components/social/PostCard";

import { OfficialPostCard } from "@/components/OfficialPostCard";
import { categories } from "@/data/categories";
import { postTypes, type PostTypeValue } from "@/data/postTypes";
import type { OfficialAccountRow, OfficialPostRow } from "@/data/officialPostTypes";
import { useUserLocation } from "@/hooks/use-user-location";
import { sortByProximity, type TargetLocation } from "@/lib/location";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Activity Feed — Tuungane" }] }),
  component: Feed,
});

type Tab = "posts" | "services";
type PostFilter = "all" | "following" | "verified" | "popular" | "nearby" | "official";

const avatar = (s: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s || "T")}&backgroundColor=1e3a8a,f97316,16a34a&fontFamily=Plus%20Jakarta%20Sans`;

function Feed() {
  const { user } = useAuth();
  const { location: userLoc } = useUserLocation();
  const [tab, setTab] = useState<Tab>("posts");
  const [filter, setFilter] = useState<PostFilter>("all");
  const [category, setCategory] = useState<string>("");
  const [postType, setPostType] = useState<PostTypeValue | "">("");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  
  const [officialPosts, setOfficialPosts] = useState<OfficialPostRow[]>([]);
  const [officialAccount, setOfficialAccount] = useState<OfficialAccountRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { has: isBoostedPost } = useBoostedSet("post", ["feature_post", "promote_completed_work"]);
  const { has: isBoostedProvider } = useBoostedSet("provider", ["boost_profile", "feature_business_page"]);
  

  const loadPosts = async () => {
    let providerIds: string[] | null = null;
    if (filter === "following" && user) {
      const { data } = await supabase.from("follows").select("provider_user_id").eq("follower_id", user.id);
      providerIds = (data ?? []).map((f) => f.provider_user_id);
      if (providerIds.length === 0) { setPosts([]); return; }
    }
    if (filter === "verified") {
      const { data } = await supabase.from("service_profiles").select("user_id").in("verified", ["verified", "featured"]);
      providerIds = (data ?? []).map((p) => p.user_id);
      if (providerIds.length === 0) { setPosts([]); return; }
    }
    if (filter === "nearby") {
      if (!user) { toast.error("Sign in to see providers near you"); setPosts([]); return; }
      const { data: me } = await supabase.from("profiles").select("district").eq("id", user.id).maybeSingle();
      const district = me?.district?.trim();
      if (!district) { toast.info("Add your district in your profile to see nearby posts"); setPosts([]); return; }
      const { data } = await supabase.from("service_profiles").select("user_id").eq("district", district);
      providerIds = (data ?? []).map((p) => p.user_id);
      if (providerIds.length === 0) { setPosts([]); return; }
    }
    let q = supabase.from("timeline_posts").select("*").eq("hidden", false).order("created_at", { ascending: false }).limit(50);
    if (providerIds) q = q.in("provider_user_id", providerIds);
    if (category) q = q.eq("category_slug", category);
    if (postType) q = q.eq("post_type", postType);
    const { data: rows } = await q;
    const ids = Array.from(new Set((rows ?? []).map((r) => r.provider_user_id)));
    type AuthorLoc = { full_name: string; avatar_url: string | null; is_provider: boolean; district: string | null; town: string | null; area: string | null; latitude: number | null; longitude: number | null };
    const profMap = new Map<string, AuthorLoc>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url,is_provider,district,town,area,latitude,longitude").in("id", ids);
      (profs ?? []).forEach((p) => profMap.set(p.id, p as unknown as AuthorLoc));
    }
    let mapped = (rows ?? []).map((r) => ({ ...r, author: profMap.get(r.provider_user_id) })) as PostRow[];
    if (filter === "popular") {
      const { data: likes } = await supabase.from("post_likes").select("post_id");
      const tally = new Map<string, number>();
      (likes ?? []).forEach((l) => tally.set(l.post_id, (tally.get(l.post_id) ?? 0) + 1));
      mapped = mapped.sort((a, b) => (tally.get(b.id) ?? 0) - (tally.get(a.id) ?? 0));
    }
    setPosts(mapped);
  };

  const loadProviders = async () => {
    let q = supabase.from("service_profiles").select("user_id,business_name,subcategory,bio,town,district,area,latitude,longitude,service_radius_km,category_slug,verified,years_experience,areas_served,availability,cover_url,seeded_by_official,seeded_status,suspended,updated_at").eq("suspended", false).order("updated_at", { ascending: false }).limit(50);
    if (category) q = q.eq("category_slug", category);
    const { data } = await q;
    const ids = (data ?? []).map((p) => p.user_id);
    const profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      (profs ?? []).forEach((p) => profMap.set(p.id, p));
    }
    setProviders((data ?? []).map((p) => ({ ...p, profile: profMap.get(p.user_id) })));
  };


  const loadOfficial = async () => {
    const [{ data: acct }, { data: ops }] = await Promise.all([
      supabase.from("official_accounts").select("*").eq("is_active", true).limit(1).maybeSingle(),
      supabase.from("official_posts").select("*").eq("status", "published").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(filter === "official" ? 30 : 5),
    ]);
    setOfficialAccount(acct as OfficialAccountRow | null);
    setOfficialPosts((ops ?? []) as OfficialPostRow[]);
  };

  const load = async () => {
    setLoading(true);
    if (tab === "posts") { await Promise.all([loadPosts(), loadOfficial()]); }
    else if (tab === "services") await loadProviders();
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, filter, category, postType, user?.id]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "posts", label: "Posts" }, { id: "services", label: "Services" },
  ];
  const postFilters: { id: PostFilter; label: string }[] = [
    { id: "all", label: "All" }, { id: "following", label: "Following" }, { id: "nearby", label: "Nearby" }, { id: "popular", label: "Popular" }, { id: "verified", label: "Verified" }, { id: "official", label: "Official" },
  ];

  const pinnedOfficial = officialPosts.filter((p) => p.is_pinned);
  const officialToShow = filter === "official" ? officialPosts : pinnedOfficial;

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-0 py-6 sm:px-4 sm:py-8">
        <div className="px-4 sm:px-0">
        <h1 className="font-display text-3xl font-bold text-navy">Activity feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover work, providers, and updates on Tuungane.</p>
        </div>


        <div className="mt-5 flex gap-1 rounded-full border border-border bg-card p-1 mx-4 sm:mx-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? "bg-navy text-navy-foreground" : "text-muted-foreground hover:text-navy"}`}>{t.label}</button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 px-4 sm:px-0">
          {tab === "posts" && postFilters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}>{f.label}</button>
          ))}
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          {tab === "posts" && (
            <select value={postType} onChange={(e) => setPostType(e.target.value as PostTypeValue | "")} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
              <option value="">Any post type</option>
              {postTypes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          )}
        </div>

        <div className="mt-6 space-y-3 sm:space-y-4">

          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!loading && tab === "posts" && (() => {
            const sortedPosts = [...posts].sort((a, b) => Number(isBoostedPost(b.id)) - Number(isBoostedPost(a.id)));
            return (
              <>
                {officialToShow.map((p) => <OfficialPostCard key={`op-${p.id}`} post={p} account={officialAccount} />)}
                {filter !== "official" && (sortedPosts.length === 0 ? (
                  <Empty title="No posts yet" hint={filter === "following" ? "Follow providers to see their work here." : "Be the first to share work."} />
                ) : sortedPosts.map((p) => <PostCard key={p.id} post={p} onChanged={load} />))}
                {filter === "official" && officialToShow.length === 0 && (
                  <Empty title="No official posts yet" hint="Tuungane Official will post curated updates here soon." />
                )}
              </>
            );
          })()}

          {!loading && tab === "services" && (() => {
            const sortedProviders = [...providers].sort((a, b) => Number(isBoostedProvider(b.user_id)) - Number(isBoostedProvider(a.user_id)));
            return sortedProviders.length === 0 ? (
              <Empty title="No providers found" hint="Try a different category." />
            ) : sortedProviders.map((p) => (
              <Link key={p.user_id} to="/u/$id" params={{ id: p.user_id }} className={`mx-4 sm:mx-0 flex items-start gap-3 rounded-2xl border bg-card p-4 transition hover:border-orange ${isBoostedProvider(p.user_id) ? "border-orange/50" : "border-border"}`}>
                <img src={p.profile?.avatar_url || avatar(p.profile?.full_name || "T")} alt="" className="h-12 w-12 rounded-xl border border-border" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-navy">{p.business_name || p.profile?.full_name}</p>
                    {p.verified === "verified" && <BadgeCheck className="h-4 w-4 text-green" />}
                    {p.verified === "featured" && <Sparkles className="h-4 w-4 text-orange" />}
                    {isBoostedProvider(p.user_id) && <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-orange/15 px-1.5 py-0 text-[10px] font-semibold text-orange"><Sparkles className="h-2.5 w-2.5" /> Featured</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.subcategory}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{p.bio}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.town}, {p.district}</p>
                </div>
              </Link>
            ));
          })()}

          {/* opportunities tab removed — see /requests/browse */}
        </div>
      </section>
    </Layout>
  );
}

function Empty({ title, hint }: { title: string; hint: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <p className="font-semibold text-navy">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
