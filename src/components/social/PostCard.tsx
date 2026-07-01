import { useEffect, useState } from "react";
import { Heart, MessageCircle, ThumbsUp, Share2, Flag, MapPin, Trash2, EyeOff, Pencil } from "lucide-react";
import { EditPostDialog } from "@/components/EditPostDialog";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";
import { toast } from "sonner";
import { ReportDialog } from "./ReportDialog";
import { RecommendDialog } from "./RecommendDialog";
import { postTypeMap, type PostTypeValue } from "@/data/postTypes";
import { useActiveBoosts } from "@/hooks/use-boosts";
import { BoostBadge } from "@/components/BoostBadge";
import { BoostButton } from "@/components/BoostButton";
import { PostShell } from "./PostShell";
import { PostText } from "./PostText";
import { PostMedia } from "./PostMedia";
import { NearYouBadge } from "@/components/NearYouBadge";
import type { TargetLocation, UserLocation } from "@/lib/location";

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
  post_type?: PostTypeValue | null;
  title?: string | null;
  district?: string | null;
  town?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  author?: {
    full_name: string;
    avatar_url: string | null;
    is_provider: boolean;
    district?: string | null;
    town?: string | null;
    area?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

interface Props { post: PostRow; onChanged?: () => void; userLoc?: UserLocation | null }

export function PostCard({ post, onChanged, userLoc }: Props) {
  const { user, isModerator } = useAuth();
  const nav = useNavigate();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; text: string; created_at: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [newComment, setNewComment] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { boosts, refresh: refreshBoosts, has: hasBoost } = useActiveBoosts("post", post.id);

  useEffect(() => {
    (async () => {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id).eq("hidden", false),
      ]);
      setLikes(lc ?? 0);
      setCommentCount(cc ?? 0);
      if (user) {
        const { data } = await supabase.from("post_likes").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle();
        setLiked(!!data);
      }
    })();
  }, [post.id, user]);

  const loadComments = async () => {
    const { data: rows } = await supabase
      .from("post_comments").select("id,user_id,text,created_at").eq("post_id", post.id).eq("hidden", false).order("created_at", { ascending: true });
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      profMap = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    setComments((rows ?? []).map((c) => ({ ...c, profile: profMap.get(c.user_id) })));
    setCommentCount((rows ?? []).length);
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
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
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

  const ptMeta = post.post_type ? postTypeMap[post.post_type] : null;
  const authorType = post.author?.is_provider ? "Service Provider" : null;

  return (
    <>
      <PostShell
        header={
          <div className="flex items-start justify-between gap-3">
            <Link to="/u/$id" params={{ id: post.provider_user_id }} className="flex items-center gap-3">
              <Avatar name={post.author?.full_name ?? "Provider"} url={post.author?.avatar_url ?? null} size={44} />
              <div className="leading-tight">
                <p className="font-semibold text-navy">{post.author?.full_name ?? "Service Provider"}</p>
                {authorType && <p className="text-[11px] font-medium text-orange">{authorType}</p>}
                <p className="text-xs text-muted-foreground">
                  {post.location && <><MapPin className="mr-0.5 inline h-3 w-3" />{post.location} · </>}
                  {timeAgo(post.created_at)}
                </p>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              {userLoc && (
                <NearYouBadge
                  user={userLoc}
                  target={{
                    district: post.district ?? post.author?.district ?? null,
                    town: post.town ?? post.author?.town ?? null,
                    area: post.area ?? post.author?.area ?? null,
                    latitude: post.latitude ?? post.author?.latitude ?? null,
                    longitude: post.longitude ?? post.author?.longitude ?? null,
                  } as TargetLocation}
                />
              )}
              {post.featured && <span className="rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">Featured</span>}
              {boosts.map((b) => <BoostBadge key={b.id} type={b.boost_type} />)}
              {post.hidden && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Hidden</span>}
            </div>
          </div>
        }
        categoryBadge={
          (ptMeta || post.category_slug) ? (
            <div className="flex flex-wrap items-center gap-2">
              {ptMeta && <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ptMeta.color}`}>{ptMeta.label}</span>}
              {post.category_slug && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{post.category_slug.replace(/-/g, " ")}</span>}
            </div>
          ) : null
        }
        title={post.title ? <h3 className="font-display text-base font-bold text-navy">{post.title}</h3> : null}
        message={post.text ? <PostText text={post.text} /> : null}
        media={post.media_urls?.length ? <PostMedia urls={post.media_urls} alt={post.author?.full_name ?? "Post"} /> : null}
        actions={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {(likes > 0 || commentCount > 0) && (
              <div className="flex w-full items-center justify-between pb-1 text-xs text-muted-foreground">
                <span>{likes > 0 && `${likes} like${likes === 1 ? "" : "s"}`}</span>
                <button onClick={() => { setShowComments((v) => !v); if (!showComments) loadComments(); }} className="hover:text-orange">
                  {commentCount > 0 && `${commentCount} comment${commentCount === 1 ? "" : "s"}`}
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <ActionBtn onClick={toggleLike} active={liked} icon={<Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />} label="Like" />
              <ActionBtn onClick={() => { setShowComments((v) => !v); if (!showComments) loadComments(); }} icon={<MessageCircle className="h-4 w-4" />} label="Comment" />
              <ActionBtn onClick={() => { if (requireAuth()) setRecOpen(true); }} icon={<ThumbsUp className="h-4 w-4" />} label="Recommend" />
              <ActionBtn onClick={share} icon={<Share2 className="h-4 w-4" />} label="Share" />
            </div>
            <div className="flex items-center gap-1">
              {user?.id === post.provider_user_id && (() => {
                const isCompleted = post.post_type === "completed_job" || post.post_type === "before_after";
                return (
                  <BoostButton
                    boostType={isCompleted ? "promote_completed_work" : "feature_post"}
                    entityType="post"
                    entityId={post.id}
                    label={isCompleted ? "Promote" : "Feature"}
                    isActive={hasBoost("feature_post") || hasBoost("promote_completed_work")}
                    dialogTitle={isCompleted ? "Promote this completed work" : "Feature this post"}
                    dialogDescription="Highlight this post across Tuungane so more people see it."
                    onActivated={refreshBoosts}
                  />
                );
              })()}
              <ActionBtn onClick={() => { if (requireAuth()) setReportOpen(true); }} icon={<Flag className="h-4 w-4" />} label="" small />
              {user?.id === post.provider_user_id && <ActionBtn onClick={deletePost} icon={<Trash2 className="h-4 w-4 text-destructive" />} label="" small />}
              {isModerator && <ActionBtn onClick={hidePost} icon={<EyeOff className="h-4 w-4 text-amber-600" />} label="" small />}
            </div>

            {showComments && (
              <div className="mt-2 w-full space-y-3 border-t border-border pt-3">
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
          </div>
        }
      />

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post.id} />
      <RecommendDialog open={recOpen} onClose={() => setRecOpen(false)} providerUserId={post.provider_user_id} />
    </>
  );
}

function ActionBtn({ onClick, icon, label, active, small }: { onClick: () => void; icon: React.ReactNode; label: string; active?: boolean; small?: boolean }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted ${active ? "text-orange" : "text-muted-foreground"} ${small ? "" : "sm:px-3"}`}>
      {icon} {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
