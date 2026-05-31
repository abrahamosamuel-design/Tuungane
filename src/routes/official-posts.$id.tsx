import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OfficialPostCard } from "@/components/OfficialPostCard";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import type { OfficialAccountRow, OfficialPostRow } from "@/data/officialPostTypes";

export const Route = createFileRoute("/official-posts/$id")({
  head: () => ({ meta: [{ title: "Official post — Tuungane" }] }),
  component: OfficialPostDetail,
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
    const { data: p } = await supabase.from("official_posts").select("*").eq("id", id).maybeSingle();
    setPost(p as OfficialPostRow | null);
    if (p) {
      const { data: a } = await supabase.from("official_accounts").select("*").eq("id", p.official_account_id).maybeSingle();
      setAccount(a as OfficialAccountRow | null);
    }
    const { data: cs } = await supabase.from("official_post_comments").select("id,text,created_at,user_id").eq("post_id", id).eq("hidden", false).order("created_at", { ascending: true });
    const ids = Array.from(new Set((cs ?? []).map((c) => c.user_id)));
    let pm = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = new Map((ps ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    setComments((cs ?? []).map((c) => ({ ...c, profile: pm.get(c.user_id) })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const submit = async () => {
    if (!user) return toast.error("Sign in to comment");
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("official_post_comments").insert({ post_id: id, user_id: user.id, text: text.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); load();
  };

  if (!post) return <Layout><div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div></Layout>;

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/official" className="text-xs text-orange hover:underline">← Tuungane Official</Link>
        <div className="mt-4">
          <OfficialPostCard post={post} account={account} onChanged={load} />
        </div>

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
                <Avatar src={c.profile?.avatar_url} name={c.profile?.full_name ?? "User"} size={28} />
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
    </Layout>
  );
}
