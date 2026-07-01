import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { useUserLocation } from "@/hooks/use-user-location";

export const Route = createFileRoute("/posts/$id")({
  head: () => ({ meta: [{ title: "Post — Tuungane" }] }),
  component: PostDetail,
});

function PostDetail() {
  const { id } = useParams({ from: "/posts/$id" });
  const { location: userLoc } = useUserLocation();
  const [post, setPost] = useState<PostRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("timeline_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!mounted) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, is_provider, district, town, area, latitude, longitude")
        .eq("id", (data as any).provider_user_id)
        .maybeSingle();
      setPost({ ...(data as any), author: prof ?? undefined } as PostRow);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/feed"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Loading post…
          </div>
        ) : notFound || !post ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            This post is no longer available.
          </div>
        ) : (
          <PostCard post={post} userLoc={userLoc} />
        )}
      </div>
    </Layout>
  );
}
