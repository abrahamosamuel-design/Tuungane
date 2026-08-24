import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, MoreHorizontal, Star, Wrench, Zap, Sparkles, Heart, MessageCircle, MessageSquare, Send, MapPin, ChevronRight, CalendarPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { FeedAvatar } from "@/components/feed/FeedAvatar";
import { Avatar } from "@/components/social/Avatar";
import { useUserLocation } from "@/hooks/use-user-location";
import { toast } from "sonner";

import { useQuery } from "@tanstack/react-query";

import { MobileSearchBar } from "@/components/MobileSearchBar";
import { CategoryScroll } from "@/components/CategoryScroll";

/* ---------- helpers ---------- */

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function timeSeed(): number {
  return Math.floor(Date.now() / (1000 * 60 * 10));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const POST_TYPE_LABELS: Record<string, string> = {
  work_update: "Work Update",
  available: "Available Now",
  new_service: "New Service",
  completed_job: "Completed Job",
  before_after: "Before & After",
  opportunity_shared: "Opportunity",
};

/* ---------- types ---------- */

type FeedItem =
  | { type: "provider"; id: string; data: any }
  | { type: "request"; id: string; data: any }
  | { type: "timeline_post"; id: string; data: any };

/* ---------- main component ---------- */

export function DashboardView() {
  const { user } = useAuth();
  const { location: userLoc } = useUserLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data", userLoc?.latitude, userLoc?.longitude],
    queryFn: async () => {
      const hasCoords = userLoc?.latitude != null && userLoc?.longitude != null;
      const params: any = {};
      if (hasCoords) {
        params.lat = userLoc!.latitude;
        params.lng = userLoc!.longitude;
      }

      const homeRes = await apiClient.get("/feed/home", { params }).catch(() => ({ data: {} }));
      const homeData = homeRes.data || {};

      const requestsData = homeData.requests || [];
      const formattedRequests = requestsData.map((r: any) => ({
        id: r.id,
        author: r.posted_as_name || r.customer_name || "A member",
        avatar: r.posted_as_avatar_url || r.customer_avatar_url || null,
        time: new Date(r.created_at).toLocaleDateString(),
        timeRaw: r.created_at,
        location: r.area || r.town || r.district || "Uganda",
        title: r.title || r.service_needed,
        budget: r.budget_range || (r.price ? `UGX ${r.price}` : "Negotiable"),
        content: (r.title || r.service_needed) + (r.description ? ` - ${r.description}` : ""),
      }));

      const formattedProfiles = (homeData.providers || []).map((p: any) => ({
        id: p.service_id,
        owner_id: p.user_id,
        slug: p.slug,
        name: p.business_name || p.name || p.profile?.full_name || "Provider",
        avatar_url: p.avatar_url || p.cover_url || p.profile?.avatar_url || null,
        category_slug: p.category_slug || "",
        subcategory: p.subcategory || p.category_slug || "Service Provider",
        bio: p.bio || "",
        town: p.town || "",
        district: p.district || "",
        area: p.area || "",
        verified: p.verified || "",
        availability: p.availability || "",
      }));

      const formattedTimeline = (homeData.timelinePosts || []).map((tp: any) => ({
        id: tp.id,
        authorName: tp.author?.full_name || "Service Provider",
        authorAvatar: tp.author?.avatar_url || null,
        text: tp.text || "",
        mediaUrls: tp.media_urls || [],
        postType: tp.post_type || "work_update",
        categorySlug: tp.category_slug || null,
        location: tp.area || tp.town || tp.district || tp.location || "",
        createdAt: tp.created_at,
        isVerified: tp.is_verified || false,
        providerId: tp.provider_user_id,
        serviceId: tp.service_id,
      }));

      return {
        profiles: formattedProfiles,
        requests: formattedRequests,
        timelinePosts: formattedTimeline,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const realProfiles = data?.profiles || [];
  const realRequests = data?.requests || [];
  const realTimeline = data?.timelinePosts || [];

  const mixedFeed = useMemo(() => {
    const feed: FeedItem[] = [];

    // Individual provider cards (not pairs)
    realProfiles.forEach((p: any, i: number) => {
      feed.push({ type: "provider", id: `prov-${p.id || i}`, data: p });
    });

    // Requests
    realRequests.forEach((r: any, i: number) => {
      feed.push({ type: "request", id: `req-${i}`, data: r });
    });

    // Timeline posts
    realTimeline.forEach((tp: any, i: number) => {
      feed.push({ type: "timeline_post", id: `tp-${tp.id || i}`, data: tp });
    });

    return shuffleArray(feed, timeSeed());
  }, [realProfiles, realRequests, realTimeline]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 md:pb-0">
      
      {/* MOBILE UI */}
      <div className="md:hidden bg-white">
        <MobileSearchBar placeholder="Search friend services" />
        <CategoryScroll 
          title="Services"
          categories={[
            { id: "1", name: "Plumbing", icon: <Wrench className="h-6 w-6" />, colorClass: "bg-navy" },
            { id: "2", name: "Electric", icon: <Zap className="h-6 w-6" />, colorClass: "bg-orange" },
            { id: "3", name: "Cleaning", icon: <Sparkles className="h-6 w-6" />, colorClass: "bg-green" },
            { id: "4", name: "More", icon: <MoreHorizontal className="h-6 w-6" />, colorClass: "bg-slate-800", isMore: true },
          ]} 
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 md:pt-8">
        {/* Section header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-navy md:text-2xl">Trusted providers near you</h1>
            <p className="text-xs text-muted-foreground mt-1">Find local providers offering services around your area.</p>
          </div>
          <Link to="/services" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-orange transition-colors">
            View all <span className="text-lg">→</span>
          </Link>
        </div>

        {/* Feed grid */}
        {isLoading && <div className="text-sm text-muted-foreground text-center py-12">Loading feed...</div>}
        {!isLoading && mixedFeed.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">No community posts yet.</div>}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
          {mixedFeed.map((item) => {
            if (item.type === "provider") {
              return <ProviderCard key={item.id} data={item.data} />;
            }
            if (item.type === "request") {
              return <RequestCard key={item.id} data={item.data} />;
            }
            if (item.type === "timeline_post") {
              return <TimelinePostCard key={item.id} data={item.data} />;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- provider card (matching reference design) ---------- */

function ProviderCard({ data }: { data: any }) {
  const location = data.area || data.town || data.district || "";
  const isVerified = data.verified === "verified" || data.verified === "featured";
  const isAvailable = data.availability === "available" || data.availability === "Available";
  const [expanded, setExpanded] = useState(false);
  const bioText = data.bio || "";
  const showMore = bioText.length > 120;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 flex-1">
        {/* Header: avatar + name + category */}
        <div className="flex items-start gap-3 mb-3">
          {data.avatar_url ? (
            <img src={data.avatar_url} className="h-11 w-11 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy font-bold text-sm">
              {(data.name || "?").charAt(0).toUpperCase()}{(data.name || "?").split(" ")[1]?.charAt(0)?.toUpperCase() || ""}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-navy truncate flex items-center gap-1">
              {data.name}
              {isVerified && (
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green text-[8px] text-white">✓</span>
              )}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {data.subcategory}{data.category_slug ? ` · ${data.category_slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}` : ""}
            </p>
          </div>
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
            <MapPin className="h-3 w-3 text-orange shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Badges: Availability & Price */}
        <div className="flex flex-wrap gap-2 mb-2">
          {isAvailable && (
            <span className="inline-block rounded-md bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
              Available
            </span>
          )}
          
          {(data.price_fixed_ugx || data.price_min_ugx || data.price_note) && (
            <span className="inline-block rounded-md bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
              {data.price_note ? data.price_note : (data.price_fixed_ugx ? `UGX ${data.price_fixed_ugx.toLocaleString()}` : `From UGX ${data.price_min_ugx?.toLocaleString()}`)}
            </span>
          )}
        </div>

        {/* Bio */}
        {bioText && (
          <div className="mb-2">
            <p className="text-xs text-navy/70 leading-relaxed whitespace-pre-line">
              {expanded || !showMore ? bioText : bioText.slice(0, 120) + "..."}
            </p>
            {showMore && (
              <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-semibold text-orange hover:underline mt-0.5">
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <Link
          to="/service/$id"
          params={{ id: data.id }}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-orange py-2.5 text-xs font-bold text-white hover:brightness-110 transition-all"
        >
          <CalendarPlus className="h-4 w-4" /> Request service
        </Link>
        <Link
          to="/messages"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-navy/50 hover:text-navy hover:bg-muted/50 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
        </Link>
        <Link
          to="/service/$id"
          params={{ id: data.id }}
          className="flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-navy hover:bg-muted/50 transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}

/* ---------- request card ---------- */

function RequestCard({ data }: { data: any }) {
  return (
    <div className="flex flex-col rounded-2xl border border-navy/20 bg-navy/[0.03] shadow-sm overflow-hidden">
      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-navy">
            <Search className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-navy">Service Request</span>
            <p className="text-[10px] text-muted-foreground truncate">{data.author} • {data.location}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{data.time}</span>
        </div>
        <h3 className="text-sm font-bold text-navy mb-1">{data.title}</h3>
        <p className="text-xs text-muted-foreground font-medium">Budget: {data.budget}</p>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <button className="w-full rounded-full bg-orange py-2.5 text-xs font-bold text-white hover:brightness-110 transition-all">
          Send Quote
        </button>
      </div>
    </div>
  );
}

/* ---------- timeline post card ---------- */

function TimelinePostCard({ data }: { data: any }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const label = POST_TYPE_LABELS[data.postType] || "Update";
  const hasImages = data.mediaUrls && data.mediaUrls.length > 0;

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; text: string; created_at: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await apiClient(`/social/posts/${data.id}/interactions`);
        if (res.data) {
          setLikes(res.data.likes);
          setLiked(res.data.liked);
          setCommentCount(res.data.commentCount);
        }
      } catch { /* ignore */ }
    })();
  }, [data.id, user]);

  const requireAuth = () => {
    if (!user) { nav({ to: "/login", search: { tab: "login", redirect: window.location.pathname } as never }); return false; }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth() || !user) return;
    try {
      const { data: res } = await apiClient.post(`/social/posts/${data.id}/likes`, {});
      if (res.liked !== liked) {
        setLiked(res.liked);
        setLikes(l => res.liked ? l + 1 : Math.max(0, l - 1));
      }
    } catch {
      toast.error("Failed to like post");
    }
  };

  const loadComments = async () => {
    try {
      const { data: res } = await apiClient(`/social/posts/${data.id}/comments`);
      setComments(res.data || []);
      setCommentCount((res.data || []).length);
    } catch { /* ignore */ }
  };

  const addComment = async () => {
    if (!requireAuth() || !user || !newComment.trim()) return;
    setCommentBusy(true);
    try {
      await apiClient.post(`/social/posts/${data.id}/comments`, { text: newComment.trim() });
      setNewComment("");
      loadComments();
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setCommentBusy(false);
    }
  };

  const toggleComments = () => {
    setShowComments(v => !v);
    if (!showComments) loadComments();
  };

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 flex-1">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <FeedAvatar src={data.authorAvatar} name={data.authorName} size={40} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-navy truncate flex items-center gap-1">
              {data.authorName}
              {data.isVerified && (
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green text-[8px] text-white">✓</span>
              )}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {timeAgo(data.createdAt)}
              {data.location ? ` • ${data.location}` : ""}
            </p>
          </div>
          <span className="rounded-md bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy/60 shrink-0">
            {label}
          </span>
        </div>

        {/* Text */}
        {data.text && (
          <p className="mb-3 text-xs leading-relaxed text-navy/70 whitespace-pre-line">
            {data.text.length > 180 ? data.text.slice(0, 180) + "…" : data.text}
          </p>
        )}

        {/* Media */}
        {hasImages && (
          <div className={`mb-3 overflow-hidden rounded-xl ${data.mediaUrls.length > 1 ? "grid grid-cols-2 gap-1" : ""}`}>
            {data.mediaUrls.slice(0, 4).map((url: string, i: number) => (
              <img
                key={i}
                src={url}
                alt="Post media"
                className={`w-full object-cover ${data.mediaUrls.length === 1 ? "max-h-52" : "h-28"}`}
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Like / comment summary */}
        {(likes > 0 || commentCount > 0) && (
          <div className="flex items-center justify-between pb-1 text-[11px] text-muted-foreground">
            <span>{likes > 0 && `${likes} like${likes === 1 ? "" : "s"}`}</span>
            <button onClick={toggleComments} className="hover:text-navy transition-colors">
              {commentCount > 0 && `${commentCount} comment${commentCount === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-stretch border-t border-border">
        <button
          onClick={toggleLike}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
            liked ? "bg-navy/5 text-navy" : "text-navy/60 hover:bg-muted/50"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> Like
        </button>
        <button
          onClick={toggleComments}
          className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-xs font-semibold text-navy/60 hover:bg-muted/50 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </button>
        {data.serviceId ? (
          <Link
            to="/service/$id"
            params={{ id: data.serviceId }}
            className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-xs font-semibold text-navy/60 hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" /> View
          </Link>
        ) : (
          <Link
            to="/u/$id"
            params={{ id: data.providerId }}
            className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-xs font-semibold text-navy/60 hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" /> View
          </Link>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border p-4 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground">No comments yet. Be the first to comment.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.profile?.full_name ?? "U"} url={c.profile?.avatar_url ?? null} size={28} />
              <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2">
                <p className="text-[11px] font-semibold text-navy">
                  {c.profile?.full_name ?? "User"}
                  <span className="ml-1 font-normal text-muted-foreground">· {timeAgo(c.created_at)}</span>
                </p>
                <p className="mt-0.5 text-xs text-navy/80">{c.text}</p>
              </div>
            </div>
          ))}
          {user && (
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !commentBusy && addComment()}
                placeholder="Write a comment..."
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-xs outline-none focus:border-navy transition-colors"
              />
              <button
                onClick={addComment}
                disabled={commentBusy || !newComment.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {!user && (
            <button
              onClick={() => nav({ to: "/login", search: { tab: "login", redirect: window.location.pathname } as never })}
              className="w-full rounded-full border border-navy/30 bg-navy/5 py-2 text-xs font-medium text-navy hover:bg-navy/10 transition-colors"
            >
              Sign in to comment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
