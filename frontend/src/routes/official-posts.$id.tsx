import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { OfficialPostCard } from "@/components/OfficialPostCard";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import type { OfficialAccountRow, OfficialPostRow } from "@/data/officialPostTypes";
import { SafetyNote, SAFETY_TIPS } from "@/components/SafetyNote";

import { RouteErrorCard, RouteNotFoundCard } from "@/lib/route-boundaries";

export const Route = createFileRoute("/official-posts/$id")({
  head: ({ params }) => {
    const url = `https://tuungane.com/official-posts/${params.id}`;
    const title = "Official post — Tuungane";
    const desc = "An official announcement from a verified organization on Tuungane — read the update and join the discussion.";
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
  component: OfficialPostDetail,
  errorComponent: ({ error, reset }) => <RouteErrorCard error={error} reset={reset} title="Couldn't load this post" />,
  notFoundComponent: () => <RouteNotFoundCard title="Post not found" message="This official post may have been removed." homeHref="/official" homeLabel="Back to Official" />,
});

function OfficialPostDetail() {
  const { id } = useParams({ from: "/official-posts/$id" });
  const { user } = useAuth();
  const [post, setPost] = useState<OfficialPostRow | null>(null);
  const [account, setAccount] = useState<OfficialAccountRow | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; text: string; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await apiClient<{ data: { post: OfficialPostRow, account: OfficialAccountRow, comments: any[] } }>(`/feed/official/${id}`);
      setPost(res.data.post || null);
      setAccount(res.data.account || null);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Failed to load official post:", err);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const submit = async () => {
    if (!user) return toast.error("Sign in to comment");
    if (!text.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(`/feed/official/${id}/comments`, { text: text.trim() });
      setText(""); 
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to post comment");
    } finally {
      setBusy(false);
    }
  };

  if (!post) return <><div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div></>;

  return (
    <>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/official" className="text-xs text-orange hover:underline">← Tuungane Official</Link>
        <div className="mt-4">
          <OfficialPostCard post={post} account={account} onChanged={load} />
        </div>

        <div className="mt-4"><SafetyNote tone="info" title="From Tuungane Official">{SAFETY_TIPS.official}</SafetyNote></div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-bold text-navy">Comments ({comments.length})</h2>
          {user ? (
            <div className="mt-3 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm" />
              <button onClick={submit} disabled={busy} className="rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground disabled:opacity-50">Post</button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground"><Link to="/login" className="text-orange">Sign in</Link> to comment.</p>
          )}
          <div className="mt-4 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar url={c.profile?.avatar_url} name={c.profile?.full_name ?? "User"} size={28} />
                <div className="flex-1 rounded-xl bg-surface px-3 py-2">
                  <p className="text-xs font-semibold text-navy">{c.profile?.full_name ?? "User"} <span className="ml-1 font-normal text-muted-foreground">· {timeAgo(c.created_at)}</span></p>
                  <p className="text-sm text-foreground/80">{c.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
          </div>
        </div>
      </section>
    </>
  );
}
