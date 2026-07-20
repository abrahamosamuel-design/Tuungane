import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { apiClient } from "@/lib/api";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { useUserLocation } from "@/hooks/use-user-location";

export const Route = createFileRoute("/posts/$id")({
  head: ({ params }) => {
    const url = `https://tuungane.com/posts/${params.id}`;
    const title = "Post — Tuungane";
    const desc = "Read this update from a provider on Tuungane and see photos, reactions and comments from the community.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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
      try {
        const res = await apiClient<{ data: PostRow }>(`/social/posts/${id}`);
        if (!mounted) return;
        setPost(res.data);
      } catch (err) {
        if (!mounted) return;
        setNotFound(true);
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <>
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
    </>
  );
}
