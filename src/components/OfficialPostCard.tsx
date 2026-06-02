import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, Flag, MapPin, Calendar, ShieldAlert, ExternalLink, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { OfficialAttribution } from "./OfficialBadge";
import { officialPostTypeMap, type OfficialPostRow, type OfficialAccountRow } from "@/data/officialPostTypes";
import { getCategory } from "@/data/categories";
import { PostShell } from "./social/PostShell";
import { PostText } from "./social/PostText";
import { PostMedia } from "./social/PostMedia";

export function OfficialPostCard({ post, account, onChanged }: { post: OfficialPostRow; account?: OfficialAccountRow | null; onChanged?: () => void }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(0);
  const meta = officialPostTypeMap[post.post_type];
  const cat = post.category_slug ? getCategory(post.category_slug) : null;

  useEffect(() => {
    (async () => {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabase.from("official_post_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("official_post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
      ]);
      setLikes(lc ?? 0);
      setComments(cc ?? 0);
      if (user) {
        const { data } = await supabase.from("official_post_likes").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle();
        setLiked(!!data);
      }
    })();
  }, [post.id, user?.id]);

  const toggleLike = async () => {
    if (!user) return toast.error("Sign in to like posts");
    if (liked) {
      await supabase.from("official_post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setLikes((n) => n - 1); setLiked(false);
    } else {
      await supabase.from("official_post_likes").insert({ post_id: post.id, user_id: user.id });
      setLikes((n) => n + 1); setLiked(true);
    }
  };

  const share = () => {
    const url = `${window.location.origin}/official-posts/${post.id}`;
    if (navigator.share) navigator.share({ title: post.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };

  const report = async () => {
    if (!user) return toast.error("Sign in to report");
    await supabase.from("reports").insert({ reporter_id: user.id, target_type: "official_post", target_id: post.id, reason: "User reported" });
    toast.success("Reported. Thank you.");
  };

  const isOpportunity = post.post_type === "opportunity";
  const isProviderHighlight = ["featured_provider", "verified_provider", "service_highlight"].includes(post.post_type);

  return (
    <PostShell
      accent={post.is_pinned ? "pinned" : "official"}
      header={
        <div className="flex items-center justify-between gap-3">
          <OfficialAttribution logoUrl={account?.profile_image_url} />
          <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
        </div>
      }
      categoryBadge={
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta?.color ?? "bg-muted text-foreground"}`}>{meta?.label ?? post.post_type}</span>
          {post.is_pinned && <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange"><Pin className="h-2.5 w-2.5" /> Pinned</span>}
          {post.is_featured && <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold text-navy">⭐ Featured</span>}
          {post.source_verified && <span className="rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">Verified by Tuungane</span>}
        </div>
      }
      title={
        <Link to="/official-posts/$id" params={{ id: post.id }} className="block">
          <h3 className="font-display text-base font-bold text-navy hover:text-orange">{post.title}</h3>
        </Link>
      }
      message={post.content ? <PostText text={post.content} /> : null}
      media={post.image_url ? <PostMedia urls={[post.image_url]} alt={post.title} /> : null}
      meta={
        (cat || post.location || post.expires_at) ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {cat && <span>{cat.name}{post.subcategory ? ` · ${post.subcategory}` : ""}</span>}
            {post.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{post.location}</span>}
            {post.expires_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />by {new Date(post.expires_at).toLocaleDateString()}</span>}
          </div>
        ) : null
      }
      extras={
        <>
          {(isOpportunity || isProviderHighlight) && (post.linked_provider_id || post.linked_opportunity_id || post.contact_info) && (
            <div className="flex flex-wrap gap-2">
              {post.linked_provider_id && (
                <Link to="/u/$id" params={{ id: post.linked_provider_id }} className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-navy-foreground hover:brightness-110">
                  <ExternalLink className="h-3 w-3" /> View Profile
                </Link>
              )}
              {post.linked_opportunity_id && (
                <Link to="/opportunities/$id" params={{ id: post.linked_opportunity_id }} className="inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground hover:brightness-110">
                  <ExternalLink className="h-3 w-3" /> View Opportunity
                </Link>
              )}
              {post.contact_info && (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs text-navy">{post.contact_info}</span>
              )}
            </div>
          )}
          {(isOpportunity || post.safety_note) && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/5 p-3 text-[11px] text-foreground/80">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange" />
              <p>{post.safety_note || "Please verify details before paying money, sharing sensitive information, or accepting work. Report suspicious opportunities to Tuungane."}</p>
            </div>
          )}
          {isOpportunity && !post.source_verified && (
            <p className="mt-2 text-[10px] italic text-muted-foreground">Source not independently verified.</p>
          )}
        </>
      }
      actions={
        <div className="flex items-center gap-4 text-xs">
          <button onClick={toggleLike} className={`inline-flex items-center gap-1.5 font-medium transition ${liked ? "text-orange" : "text-muted-foreground hover:text-orange"}`}>
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes} <span className="hidden sm:inline">Like</span>
          </button>
          <Link to="/official-posts/$id" params={{ id: post.id }} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-navy">
            <MessageCircle className="h-4 w-4" /> {comments} <span className="hidden sm:inline">Comment</span>
          </Link>
          <button onClick={share} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-navy">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button onClick={report} className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive" title="Report">
            <Flag className="h-4 w-4" />
          </button>
        </div>
      }
    />
  );
}
