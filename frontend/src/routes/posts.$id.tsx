import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { apiClient } from "@/lib/api";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { useUserLocation } from "@/hooks/use-user-location";

export const Route = createFileRoute("/posts/$id")({
  staticData: {
    hideBottomNav: true,
  },
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

  const { data: post, isLoading: loading, isError } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await apiClient<{ data: PostRow }>(`/social/posts/${id}`);
      return res.data;
    }
  });

  return (
    <>
      <div className="mx-auto max-w-2xl flex flex-col min-h-[100dvh]">
        <div className="px-4 pt-6 shrink-0 flex justify-start">
          <button
            onClick={() => window.history.length > 2 ? window.history.back() : window.location.href = '/'}
            className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
        <div className="flex-1 pb-0 px-4">
          {loading && !post ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading post...
            </div>
          ) : isError || !post ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              This post is no longer available.
            </div>
          ) : (
            <PostCard post={post} userLoc={userLoc} autoExpandComments={true} />
          )}
        </div>
      </div>
    </>
  );
}
