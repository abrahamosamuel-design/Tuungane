import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { categories } from "@/data/categories";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Activity Feed — Tuungane" }] }),
  component: Feed,
});

type Filter = "all" | "following" | "verified" | "popular" | "nearby";

function Feed() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let providerIds: string[] | null = null;

    if (filter === "following" && user) {
      const { data } = await supabase.from("follows").select("provider_user_id").eq("follower_id", user.id);
      providerIds = (data ?? []).map((f) => f.provider_user_id);
      if (providerIds.length === 0) { setPosts([]); setLoading(false); return; }
    }
    if (filter === "verified") {
      const { data } = await supabase.from("service_profiles").select("user_id").in("verified", ["verified", "featured"]);
      providerIds = (data ?? []).map((p) => p.user_id);
      if (providerIds.length === 0) { setPosts([]); setLoading(false); return; }
    }
    if (filter === "nearby") {
      if (!user) { toast.error("Sign in to see providers near you"); setPosts([]); setLoading(false); return; }
      const { data: me } = await supabase.from("profiles").select("district,town").eq("id", user.id).maybeSingle();
      const district = me?.district?.trim();
      if (!district) { toast.info("Add your district in your profile to see nearby posts"); setPosts([]); setLoading(false); return; }
      const { data } = await supabase.from("service_profiles").select("user_id").eq("district", district);
      providerIds = (data ?? []).map((p) => p.user_id);
      if (providerIds.length === 0) { setPosts([]); setLoading(false); return; }
    }

    let q = supabase.from("timeline_posts").select("*").eq("hidden", false).order("created_at", { ascending: false }).limit(50);
    if (providerIds) q = q.in("provider_user_id", providerIds);
    if (category) q = q.eq("category_slug", category);

    const { data: rows } = await q;
    const ids = Array.from(new Set((rows ?? []).map((r) => r.provider_user_id)));
    const profMap = new Map<string, { full_name: string; avatar_url: string | null; is_provider: boolean }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url,is_provider").in("id", ids);
      (profs ?? []).forEach((p) => profMap.set(p.id, p));
    }
    let mapped = (rows ?? []).map((r) => ({ ...r, author: profMap.get(r.provider_user_id) })) as PostRow[];
    if (filter === "popular") {
      const { data: likes } = await supabase.from("post_likes").select("post_id");
      const tally = new Map<string, number>();
      (likes ?? []).forEach((l) => tally.set(l.post_id, (tally.get(l.post_id) ?? 0) + 1));
      mapped = mapped.sort((a, b) => (tally.get(b.id) ?? 0) - (tally.get(a.id) ?? 0));
    }
    setPosts(mapped);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter, category, user?.id]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" }, { id: "following", label: "Following" }, { id: "nearby", label: "Nearby" }, { id: "popular", label: "Popular" }, { id: "verified", label: "Verified" },
  ];

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Activity feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent work from service providers on Tuungane.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}>{f.label}</button>
          ))}
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-semibold text-navy">No posts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">{filter === "following" ? "Follow some providers to see their work here." : "Be the first to share work on Tuungane."}</p>
            </div>
          )}
          {posts.map((p) => <PostCard key={p.id} post={p} onChanged={load} />)}
        </div>
      </section>
    </Layout>
  );
}
