import { useEffect, useState } from "react";
import { Heart, MessageCircle, ThumbsUp, Share2, Flag, MapPin, Trash2, EyeOff } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";
import { toast } from "sonner";
import { ReportDialog } from "./ReportDialog";
import { RecommendDialog } from "./RecommendDialog";

export interface PostRow {
  id: string;
  provider_user_id: string;
  text: string;
  category_slug: string | null;
  location: string | null;
  media_urls: string[];
  hidden: boolean;
  featured: boolean;
  created_at: string;
  author?: { full_name: string; avatar_url: string | null; is_provider: boolean };
}

interface Props { post: PostRow; onChanged?: () => void; }

export function PostCard({ post, onChanged }: Props) {
  const { user, isModerator } = useAuth();
  const nav = useNavigate();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; text: string; created_at: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [newComment, setNewComment] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id);
      setLikes(count ?? 0);
      if (user) {
        const { data } = await supabase.from("post_likes").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle();
        setLiked(!!data);
      }
    })();
  }, [post.id, user]);

  const loadComments = async () => {
    const { data: rows } = await supabase
      .from("post_comments")
      .select("id,user_id,text,created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      profMap = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    setComments((rows ?? []).map((c) => ({ ...c, profile: profMap.get(c.user_id) })));
  };

  const requireAuth = () => {
    if (!user) { nav({ to: "/login", search: { tab: "login", redirect: window.location.pathname } as never }); return false; }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth() || !user) return;
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setLiked(false); setLikes((l) => l - 1);
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      if (!error) { setLiked(true); setLikes((l) => l + 1); }
    }
  };

  const addComment = async () => {
    if (!requireAuth() || !user || !newComment.trim()) return;
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: user.id, text: newComment.trim() });
    if (error) { toast.error(error.message); return; }
    setNewComment("");
    loadComments();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("post_comments").delete().eq("id", id);
    loadComments();
  };

  const deletePost = async () => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("timeline_posts").delete().eq("id", post.id);
    toast.success("Post deleted");
    onChanged?.();
  };

  const hidePost = async () => {
    await supabase.from("timeline_posts").update({ hidden: !post.hidden }).eq("id", post.id);
    toast.success(post.hidden ? "Post restored" : "Post hidden");
    onChanged?.();
  };

  const share = async () => {
    const url = `${window.location.origin}/u/${post.provider_user_id}`;
    if (navigator.share) {
      navigator.share({ title: "Tuungane", text: post.text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    }
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <header className="flex items-start justify-between gap-3">
        <Link to="/u/$id" params={{ id: post.provider_user_id }} className="flex items-center gap-3">
          <Avatar name={post.author?.full_name ?? "Provider"} url={post.author?.avatar_url ?? null} size={44} />
          <div>
            <p className="font-semibold text-navy">{post.author?.full_name ?? "Service Provider"}</p>
            <p className="text-xs text-muted-foreground">
              {post.category_slug && <span className="capitalize">{post.category_slug.replace(/-/g, " ")} · </span>}
              {post.location && <><MapPin className="mr-0.5 inline h-3 w-3" />{post.location} · </>}
              {timeAgo(post.created_at)}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {post.featured && <span className="rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">Featured</span>}
          {post.hidden && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Hidden</span>}
        </div>
      </header>

      {post.text && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{post.text}</p>}

      {post.media_urls.length > 0 && (
        <div className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.media_urls.slice(0, 4).map((u, i) => (
            <img key={i} src={u} alt="" className="aspect-square w-full object-cover" loading="lazy" />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <ActionBtn onClick={toggleLike} active={liked} icon={<Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />} label={`${likes}`} />
          <ActionBtn onClick={() => { setShowComments((v) => !v); if (!showComments) loadComments(); }} icon={<MessageCircle className="h-4 w-4" />} label="Comment" />
          <ActionBtn onClick={() => { if (requireAuth()) setRecOpen(true); }} icon={<ThumbsUp className="h-4 w-4" />} label="Recommend" />
          <ActionBtn onClick={share} icon={<Share2 className="h-4 w-4" />} label="Share" />
        </div>
        <div className="flex items-center gap-1">
          <ActionBtn onClick={() => { if (requireAuth()) setReportOpen(true); }} icon={<Flag className="h-4 w-4" />} label="" small />
          {user?.id === post.provider_user_id && <ActionBtn onClick={deletePost} icon={<Trash2 className="h-4 w-4 text-destructive" />} label="" small />}
          {isModerator && <ActionBtn onClick={hidePost} icon={<EyeOff className="h-4 w-4 text-amber-600" />} label="" small />}
        </div>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet. Be the first to comment.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.profile?.full_name ?? "U"} url={c.profile?.avatar_url ?? null} size={32} />
              <div className="flex-1 rounded-xl bg-surface px-3 py-2">
                <p className="text-xs font-semibold text-navy">{c.profile?.full_name ?? "User"} <span className="ml-1 font-normal text-muted-foreground">· {timeAgo(c.created_at)}</span></p>
                <p className="mt-0.5 text-sm">{c.text}</p>
              </div>
              {(user?.id === c.user_id || isModerator) && (
                <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          {user && (
            <div className="flex gap-2">
              <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Write a comment..." className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-orange" />
              <button onClick={addComment} className="rounded-full bg-orange px-4 text-sm font-semibold text-orange-foreground">Post</button>
            </div>
          )}
        </div>
      )}

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post.id} />
      <RecommendDialog open={recOpen} onClose={() => setRecOpen(false)} providerUserId={post.provider_user_id} />
    </article>
  );
}

function ActionBtn({ onClick, icon, label, active, small }: { onClick: () => void; icon: React.ReactNode; label: string; active?: boolean; small?: boolean }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted ${active ? "text-orange" : "text-muted-foreground"} ${small ? "" : "sm:px-3"}`}>
      {icon} {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
