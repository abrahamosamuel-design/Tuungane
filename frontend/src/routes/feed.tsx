import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, MapPin, Sparkles } from "lucide-react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { PostCard, type PostRow } from "@/components/social/PostCard";

import { OfficialPostCard } from "@/components/OfficialPostCard";
import { useCategories } from "@/hooks/use-categories";
import { formatSubcategory } from "@/lib/format-category";

import { postTypes, type PostTypeValue } from "@/data/postTypes";
import type { OfficialAccountRow, OfficialPostRow } from "@/data/officialPostTypes";
import { useUserLocation } from "@/hooks/use-user-location";
import { sortByProximity, type TargetLocation } from "@/lib/location";
import { NearYouBadge } from "@/components/NearYouBadge";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { ExpandableText } from "@/components/feed/ExpandableText";

const FEED_TITLE = "Activity Feed — Tuungane";
const FEED_DESC = "See the latest updates from providers, businesses and neighbours near you on Tuungane — posts, completed jobs, and community news.";
const FEED_URL = "https://tuungane.com/feed";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: FEED_TITLE },
      { name: "description", content: FEED_DESC },
      { property: "og:title", content: FEED_TITLE },
      { property: "og:description", content: FEED_DESC },
      { property: "og:url", content: FEED_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: FEED_URL }],
  }),
  component: Feed,
});

type Tab = "posts" | "services";
type PostFilter = "all" | "following" | "verified" | "popular" | "nearby" | "official";

const avatar = (s: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s || "T")}&backgroundColor=1e3a8a,f97316,16a34a&fontFamily=Plus%20Jakarta%20Sans`;

function Feed() {
  const { user } = useAuth();
  const { location: userLoc } = useUserLocation();
  const { categories } = useCategories();
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
    try {
      const searchParams = new URLSearchParams();
      if (filter) searchParams.set("filter", filter);
      if (category) searchParams.set("category", category);
      if (postType) searchParams.set("postType", postType);
      
      const res = await apiClient<{ data: PostRow[] }>(`/feed/posts?${searchParams.toString()}`);
      setPosts(res.data || []);
    } catch (err) {
      console.error("Failed to load posts", err);
      setPosts([]);
    }
  };

  const loadProviders = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (category) searchParams.set("category", category);
      
      const res = await apiClient<{ data: any[] }>(`/feed/services?${searchParams.toString()}`);
      setProviders(res.data || []);
    } catch (err) {
      console.error("Failed to load providers", err);
      setProviders([]);
    }
  };

  const loadOfficial = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (filter) searchParams.set("filter", filter);
      
      const res = await apiClient<{ data: { account: OfficialAccountRow, posts: OfficialPostRow[] } }>(`/feed/official?${searchParams.toString()}`);
      
      setOfficialAccount(res?.account || null);
      setOfficialPosts(res?.posts || []);
    } catch (err) {
      console.error("Failed to load official feed", err);
      setOfficialAccount(null);
      setOfficialPosts([]);
    }
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
    <>
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
            const byProx = sortByProximity(posts, userLoc, (p) => {
              const a = (p as PostRow & { author?: { district?: string | null; town?: string | null; area?: string | null; latitude?: number | null; longitude?: number | null } }).author;
              const t: TargetLocation = {
                district: (p as PostRow & { district?: string | null }).district ?? a?.district ?? null,
                town: (p as PostRow & { town?: string | null }).town ?? a?.town ?? null,
                area: (p as PostRow & { area?: string | null }).area ?? a?.area ?? null,
                latitude: (p as PostRow & { latitude?: number | null }).latitude ?? a?.latitude ?? null,
                longitude: (p as PostRow & { longitude?: number | null }).longitude ?? a?.longitude ?? null,
              };
              return t;
            });
            const sortedPosts = [...byProx].sort((a, b) => Number(isBoostedPost(b.id)) - Number(isBoostedPost(a.id)));
            return (
              <>
                {officialToShow.map((p) => <OfficialPostCard key={`op-${p.id}`} post={p} account={officialAccount} />)}
                {filter !== "official" && (sortedPosts.length === 0 ? (
                  <Empty title="No posts yet" hint={filter === "following" ? "Follow providers to see their work here." : "Be the first to share work."} />
                ) : sortedPosts.map((p) => <PostCard key={p.id} post={p} onChanged={load} userLoc={userLoc} />))}
                {filter === "official" && officialToShow.length === 0 && (
                  <Empty title="No official posts yet" hint="Tuungane Official will post curated updates here soon." />
                )}
              </>
            );
          })()}

          {!loading && tab === "services" && (() => {
            const byProx = sortByProximity(providers, userLoc, (p) => p as TargetLocation);
            const sortedProviders = [...byProx].sort((a, b) => Number(isBoostedProvider(b.user_id)) - Number(isBoostedProvider(a.user_id)));
            return sortedProviders.length === 0 ? (
              <Empty title="No providers found" hint="Try a different category." />
            ) : sortedProviders.map((p) => (
              <Link key={p.user_id} to="/u/$id" params={{ id: p.user_id }} className={`mx-4 sm:mx-0 flex items-start gap-3 rounded-2xl border bg-card p-4 transition hover:border-orange ${isBoostedProvider(p.user_id) ? "border-orange/50" : "border-border"}`}>
                <img src={p.profile?.avatar_url || avatar(p.profile?.full_name || "T")} alt="" className="h-12 w-12 rounded-xl border border-border" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-navy">{p.business_name || p.profile?.full_name}</p>
                    <ProfileTrustBadge kind="service_profile" id={p.user_id} />
                    {p.verified === "featured" && <Sparkles className="h-4 w-4 text-orange" />}
                    {isBoostedProvider(p.user_id) && <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-orange/15 px-1.5 py-0 text-[10px] font-semibold text-orange"><Sparkles className="h-2.5 w-2.5" /> Featured</span>}
                    <NearYouBadge user={userLoc} target={p as TargetLocation} className="ml-1" />
                  </div>
                  <p className="text-xs text-muted-foreground">{formatSubcategory(p.subcategory)}</p>
                  {p.bio && <ExpandableText text={p.bio} clampLines={3} maxLines={8} className="mt-1" />}
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.town}, {p.district}</p>
                </div>
              </Link>
            ));
          })()}

          {/* opportunities tab removed — see /requests/browse */}
        </div>
      </section>
    </>
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
