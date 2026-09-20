import { useEffect, useMemo, useState, forwardRef, Ref } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, MoreHorizontal, Star, Wrench, Zap, Sparkles, Heart, MessageCircle, MessageSquare, Send, MapPin, ChevronRight, CalendarPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { FeedAvatar } from "@/components/feed/FeedAvatar";
import { Avatar } from "@/components/social/Avatar";
import { useUserLocation } from "@/hooks/use-user-location";
import { toast } from "sonner";
import { PostMedia } from "@/components/social/PostMedia";

import { useInfiniteQuery } from "@tanstack/react-query";
import { MobileSearchBar } from "@/components/MobileSearchBar";
import { CategoryScroll } from "@/components/CategoryScroll";
import { getOptimizedImageUrl } from "@/lib/image";
import { useMyCounts } from "@/components/Header";
import { ClipboardList, TrendingUp } from "lucide-react";

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
  | { type: "timeline_post"; id: string; data: any }
  | { type: "carousel_services"; id: string; data: any[] }
  | { type: "carousel_requests"; id: string; data: any[] }
  | { type: "carousel_opportunities"; id: string; data: any[] };

export function DashboardView() {
  const { user } = useAuth();
  const { location: userLoc } = useUserLocation();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["dashboard-data", userLoc?.latitude, userLoc?.longitude],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const hasCoords = userLoc?.latitude != null && userLoc?.longitude != null;
      const params: any = { page: pageParam, limit: 15 };
      if (hasCoords) {
        params.latitude = userLoc!.latitude;
        params.longitude = userLoc!.longitude;
      }

      const homeRes = await apiClient.get("/feed/home", { params }).catch(() => ({ data: { data: {} } }));
      const homeData = homeRes.data?.data || homeRes.data || {};

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
        id: p.service_id || p.user_id,
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
        nextPage: (formattedProfiles.length + formattedRequests.length + formattedTimeline.length) > 0 ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 5,
  });

  const { carouselServices, carouselRequests, carouselOpportunities } = useMemo(() => {
    if (!data || !data.pages[0]) return { carouselServices: [], carouselRequests: [], carouselOpportunities: [] };
    const firstPage = data.pages[0];
    
    const services = firstPage.profiles.slice(0, 10);
    const requests = firstPage.requests.slice(0, 10);
    const opps = firstPage.timelinePosts.filter((tp: any) => {
      if (tp.postType === "opportunity_shared") return true;
      if (tp.text && typeof tp.text === 'string' && tp.text.trim().startsWith('{')) {
        try {
          const p = JSON.parse(tp.text);
          return p.type === 'job_opportunity' || p.type === 'job_request';
        } catch { return false; }
      }
      return false;
    }).slice(0, 10);
    
    return { carouselServices: services, carouselRequests: requests, carouselOpportunities: opps };
  }, [data]);

  const mixedFeed = useMemo(() => {
    if (!data) return [];
    
    const allPosts: FeedItem[] = [];
    data.pages.forEach((page) => {
        page.timelinePosts.forEach((tp: any) => allPosts.push({ type: "timeline_post", id: `tp-${tp.id}`, data: tp }));
    });
    
    const shuffledPosts = shuffleArray(allPosts, timeSeed());
    const finalFeed: FeedItem[] = [];
    
    shuffledPosts.forEach((post, index) => {
       finalFeed.push(post);
       if (index === 9 && carouselServices.length > 0) {
          finalFeed.push({ type: "carousel_services", id: "cs_1", data: carouselServices });
       }
       if (index === 19 && carouselRequests.length > 0) {
          finalFeed.push({ type: "carousel_requests", id: "cr_1", data: carouselRequests });
       }
       if (index === 29 && carouselOpportunities.length > 0) {
          finalFeed.push({ type: "carousel_opportunities", id: "co_1", data: carouselOpportunities });
       }
    });

    if (shuffledPosts.length <= 9 && carouselServices.length > 0) {
        finalFeed.push({ type: "carousel_services", id: "cs_1", data: carouselServices });
    }
    if (shuffledPosts.length <= 19 && carouselRequests.length > 0) {
        finalFeed.push({ type: "carousel_requests", id: "cr_1", data: carouselRequests });
    }
    if (shuffledPosts.length <= 29 && carouselOpportunities.length > 0) {
        finalFeed.push({ type: "carousel_opportunities", id: "co_1", data: carouselOpportunities });
    }
    
    return finalFeed;
  }, [data, carouselServices, carouselRequests, carouselOpportunities]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 md:pb-0">
      
      {/* MOBILE UI */}
      <div className="md:hidden bg-white">
        <MobileSearchBar placeholder="Search friend services" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 md:pt-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          
          {/* ================= LEFT COLUMN (Desktop Only) ================= */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 lg:sticky lg:top-24 h-fit">
             <LeftSidebar user={user} />
          </aside>

          {/* ================= CENTER COLUMN (Feed) ================= */}
          <section className="col-span-12 lg:col-span-6 space-y-6">
            
            {/* Carousels now injected natively into the feed */}

            {/* Main Feed Header */}
            <div className="mb-4 mt-6">
              <h2 className="font-display text-xl font-bold text-navy md:text-2xl">Community Feed</h2>
            </div>

            {/* Desktop Sticky Top Bar */}
            <div className="hidden lg:flex flex-col gap-6 sticky top-24 z-30 pb-4 pt-2 -mt-2 bg-background">
              {/* Desktop Post Creation Card (hidden on mobile) */}
              <div className="bg-surface-container-lowest rounded-2xl border border-border-hairline shadow-sm p-4">
                 <div className="flex items-center gap-3">
                   <FeedAvatar src={user?.profile?.avatar_url || ""} name={user?.profile?.full_name || user?.email || "User"} size={40} />
                   <button className="flex-1 text-left bg-surface-alt hover:bg-surface-container-low px-4 py-2.5 rounded-full text-sm text-outline border border-border-hairline/80 transition-colors">
                     What opportunity or service are you looking for today, {user?.profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "friend"}?
                   </button>
                 </div>
                 <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-hairline/70">
                   <Link to="/requests/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-orange hover:bg-orange/10 transition-all">
                     <Wrench className="h-4 w-4" /> Post a Project Need
                   </Link>
                   <Link to="/opportunities/new-request" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-navy hover:bg-surface-alt transition-all">
                     <Zap className="h-4 w-4 text-green" /> Share Opportunity
                   </Link>
                 </div>
              </div>

              {/* Desktop Feed Filter Tabs */}
              <div className="flex bg-surface-container-lowest rounded-2xl border border-border-hairline shadow-sm p-1.5 items-center overflow-x-auto gap-1">
                <button className="px-3.5 py-1.5 rounded-xl text-sm font-semibold bg-navy text-white shrink-0 shadow-sm">All Updates</button>
                <button className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-navy/70 hover:bg-surface-alt hover:text-navy transition-colors shrink-0">Service Requests & Inquiries</button>
                <button className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-navy/70 hover:bg-surface-alt hover:text-navy transition-colors shrink-0">Opportunities & Tenders</button>
              </div>
            </div>

            {/* Feed List */}
            {isLoading && <div className="text-sm text-muted-foreground text-center py-12">Loading feed...</div>}
            {!isLoading && mixedFeed.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">No community posts yet.</div>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-5 pb-8">
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
                if (item.type === "carousel_services") {
                  return <DashboardCarousel key={item.id} title="Services Near You" items={item.data} viewAllLink="/services" renderItem={(p: any) => <ProviderCard data={p} />} />;
                }
                if (item.type === "carousel_requests") {
                  return <DashboardCarousel key={item.id} title="Service Requests Near You" items={item.data} viewAllLink="/requests" renderItem={(r: any) => <RequestCard data={r} />} />;
                }
                if (item.type === "carousel_opportunities") {
                  return <DashboardCarousel key={item.id} title="Opportunities For You" items={item.data} viewAllLink="/opportunities" renderItem={(o: any) => <TimelinePostCard data={o} />} />;
                }
                return null;
              })}
            </div>
          </section>

          {/* ================= RIGHT COLUMN (Desktop Only) ================= */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 lg:sticky lg:top-24 h-fit pb-12">
             <RightSidebar />
          </aside>
        </div>

        {/* Infinite Scroll Trigger */}
        {hasNextPage && (
          <div 
            className="w-full py-8 text-center"
            ref={(el) => {
              if (!el) return;
              const observer = new IntersectionObserver(
                ([entry]) => {
                  if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                  }
                },
                { rootMargin: "200px" }
              );
              observer.observe(el);
              return () => observer.disconnect();
            }}
          >
            {isFetchingNextPage ? (
              <span className="text-sm text-muted-foreground">Loading more...</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Sidebar Components (Desktop Only) ---------- */

function LeftSidebar({ user }: { user: any }) {
  const counts = useMyCounts(); 
  
  return (
    <>
      <div className="bg-surface-container-lowest rounded-2xl border border-border-hairline shadow-sm overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-navy to-orange relative">
          <div className="absolute -bottom-6 left-4">
            <div className="w-14 h-14 rounded-full ring-4 ring-surface-container-lowest overflow-hidden bg-surface-alt">
              <FeedAvatar src={user?.profile?.avatar_url} name={user?.profile?.full_name || user?.email || "User"} size={56} />
            </div>
          </div>
        </div>
        <div className="pt-8 px-4 pb-4">
          <h3 className="text-sm font-bold text-navy leading-tight">{user?.profile?.full_name || user?.email?.split('@')[0]}</h3>
          <p className="text-xs text-outline mt-0.5">{user?.profile?.town || "Uganda"}</p>
          
          <div className="grid grid-cols-2 gap-1 py-2 my-3 border-y border-border-hairline/70 text-center">
            <Link to="/requests" className="hover:bg-surface-alt/80 p-1.5 rounded-xl transition-colors">
              <span className="block text-sm font-bold text-navy">{counts.activeRequests || 0}</span>
              <span className="text-xs text-outline block leading-tight">My Requests</span>
            </Link>
            <Link to="/messages" className="hover:bg-surface-alt/80 p-1.5 rounded-xl transition-colors border-l border-border-hairline/60">
              <span className="block text-sm font-bold text-orange">{counts.unreadMessages || 0}</span>
              <span className="text-xs text-outline block leading-tight">Unread Msgs</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="bg-surface-container-lowest rounded-2xl border border-border-hairline shadow-sm p-2">
        <div className="px-2 py-1.5">
          <span className="text-[10px] text-outline font-bold tracking-wider uppercase">Shortcuts & Hubs</span>
        </div>
        <nav className="space-y-0.5 mt-1">
          <Link to="/requests" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-navy hover:bg-surface-alt transition-all group">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-orange/15 text-orange flex items-center justify-center group-hover:scale-105 transition-transform">
                <ClipboardList className="h-4 w-4" />
              </span>
              <span>My Active Requests</span>
            </div>
          </Link>
          <Link to="/services" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-navy hover:bg-surface-alt transition-all group">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-navy/10 text-navy flex items-center justify-center group-hover:scale-105 transition-transform">
                <Search className="h-4 w-4" />
              </span>
              <span>Services Directory</span>
            </div>
          </Link>
          <Link to="/opportunities" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-navy hover:bg-surface-alt transition-all group">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-green/15 text-green flex items-center justify-center group-hover:scale-105 transition-transform">
                <Zap className="h-4 w-4" />
              </span>
              <span>Opportunities</span>
            </div>
          </Link>
        </nav>
      </div>
    </>
  );
}

function RightSidebar() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-border-hairline shadow-sm p-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange" />
          <h3 className="text-sm font-bold text-navy">Trending Opps</h3>
        </div>
        <Link to="/opportunities" className="text-xs text-orange font-semibold hover:underline">View All</Link>
      </div>
      <div className="divide-y divide-border-hairline/70 mt-2">
        <div className="py-3 group">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-orange uppercase tracking-wider">CIVIC TENDER</span>
            <span className="text-xs text-outline">2d left</span>
          </div>
          <Link to="/opportunities" className="text-sm font-semibold text-navy group-hover:text-orange transition-colors line-clamp-2 mt-1">
            Supply of Commercial Cold Storage Units for Market
          </Link>
        </div>
        <div className="py-3 group">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-green uppercase tracking-wider">COOPERATIVE GIG</span>
            <span className="text-xs text-outline">5h left</span>
          </div>
          <Link to="/opportunities" className="text-sm font-semibold text-navy group-hover:text-orange transition-colors line-clamp-2 mt-1">
            Chartered Agronomy Surveyor for Macadamia Cooperative
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- provider card (matching reference design) ---------- */

function ProviderCard({ data }: { data: any }) {
  const name = data.business_name || data.name || data.profile?.full_name || "Provider";
  const isVerified = data.verified === "verified" || data.verified === "featured";
  const location = data.town || data.district || data.area || "";
  
  const rawCover = data.cover_url || (data.media_urls && data.media_urls.length > 0 ? data.media_urls[0] : null) || data.avatar_url;
  const coverImage = getOptimizedImageUrl(rawCover, 400, 300, 'cover');

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-border/40 relative">
      <Link to="/u/$id" params={{ id: data.owner_id || data.id }} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted block">
        {coverImage ? (
          <img src={coverImage} alt={name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface absolute inset-0">
            <span className="font-display text-3xl font-bold uppercase text-muted-foreground/30">{name.substring(0, 2)}</span>
          </div>
        )}
        {isVerified && (
          <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-white/95 p-1.5 shadow-sm backdrop-blur-sm">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green text-[8px] text-white">✓</span>
          </div>
        )}
      </Link>
      
      <div className="p-3 flex flex-col flex-1">
         <div className="flex items-start justify-between gap-1">
            <Link to="/u/$id" params={{ id: data.owner_id || data.id }} className="font-display text-[16px] font-bold leading-tight text-[#1A1A1A] line-clamp-1 block tracking-tight">
               {name}
            </Link>
         </div>
         
         <p className="text-[12px] font-medium text-[#8F8F8F] line-clamp-1 mt-0.5">{data.subcategory || "Service Provider"}</p>
         
         {/* Meta Row */}
         {location && (
           <div className="mt-1.5 flex items-center gap-2 text-[11px] font-bold text-[#4A4A4A] truncate">
             <div className="flex items-center gap-1">
               <MapPin className="h-3 w-3 text-[#8F8F8F] shrink-0" />
               <span className="truncate">{location}</span>
             </div>
           </div>
         )}
         
         {/* Action Row */}
         <div className="mt-auto pt-3 flex items-center gap-1.5">
            <Link 
              to="/service/$id" params={{ id: data.id }}
              className="flex h-[36px] flex-1 items-center justify-center rounded-xl bg-orange text-[12.5px] font-bold text-white hover:brightness-110 transition-all shadow-sm"
            >
               View Details
            </Link>
            <Link 
              to="/messages"
              className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl border border-border text-navy/50 hover:bg-muted/50 transition-colors"
            >
               <MessageSquare className="h-4 w-4" />
            </Link>
         </div>
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

  let parsedJob: any = null;
  let customLabel = label;
  let isJobPost = false;
  if (data.text && typeof data.text === 'string' && data.text.trim().startsWith('{') && data.text.trim().endsWith('}')) {
    try {
      const p = JSON.parse(data.text);
      if (p.type === 'job_opportunity' || p.type === 'job_request') {
        parsedJob = p;
        isJobPost = true;
        customLabel = p.type === 'job_opportunity' ? 'Hiring' : 'Need a job';
      }
    } catch { /* ignore */ }
  }

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
        const res = await apiClient(`/social/posts/${data.id}/interactions`);
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
      const res = await apiClient.post(`/social/posts/${data.id}/likes`, {});
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
      const res = await apiClient(`/social/posts/${data.id}/comments`);
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
    } catch (err: any) {
      toast.error(err.message || "Failed to add comment");
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
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold shrink-0 ${isJobPost ? 'bg-green text-white' : 'bg-navy/5 text-navy/60'}`}>
            {customLabel}
          </span>
        </div>

        {/* Text */}
        {(() => {
          if (!data.text) return null;
          
          if (isJobPost && parsedJob) {
            return (
              <div className="mb-3 rounded-xl border border-border bg-muted/20 p-3">
                <h4 className="font-semibold text-navy text-sm mb-1">{parsedJob.job_title}</h4>
                <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  {parsedJob.company_name && <p><span className="font-medium text-navy/70">Company:</span> {parsedJob.company_name}</p>}
                  {parsedJob.location && <p><span className="font-medium text-navy/70">Location:</span> {parsedJob.location}</p>}
                  {parsedJob.salary && <p><span className="font-medium text-navy/70">Salary:</span> {parsedJob.salary}</p>}
                  {parsedJob.qualification && <p><span className="font-medium text-navy/70">Qualification:</span> {parsedJob.qualification}</p>}
                </div>
              </div>
            );
          }

          return (
            <p className="mb-3 text-xs leading-relaxed text-navy/70 whitespace-pre-line">
              {data.text.length > 180 ? data.text.slice(0, 180) + "…" : data.text}
            </p>
          );
        })()}

        {/* Media */}
        {hasImages && (
          <div className="mb-3">
            <PostMedia urls={data.mediaUrls} alt={data.authorName} />
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
      {isJobPost ? (
        <div className="p-3 border-t border-border">
          <Link
            to="/opportunities/$jobId"
            params={{ jobId: data.id }}
            className="flex w-full items-center justify-center rounded-xl bg-orange py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-100"
          >
            {parsedJob.type === 'job_opportunity' ? 'Apply for this job' : 'Hire this professional'}
          </Link>
        </div>
      ) : (
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
          <Link
            to="/posts/$id"
            params={{ id: data.id }}
            className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-xs font-semibold text-navy/60 hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" /> View
          </Link>
        </div>
      )}

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

/* ---------- Dashboard Carousel ---------- */

function DashboardCarousel({ title, items, renderItem, viewAllLink }: any) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-sm font-semibold text-orange hover:underline">
            View All →
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {items.map((item: any, idx: number) => (
          <div key={item.id || idx} className="snap-start shrink-0 w-[280px] md:w-[320px]">
            {renderItem(item)}
          </div>
        ))}
        {viewAllLink && items.length >= 3 && (
          <div className="snap-start shrink-0 w-[150px] flex items-center justify-center">
             <Link to={viewAllLink} className="flex flex-col items-center gap-2 text-navy/60 hover:text-orange transition-colors">
               <div className="h-12 w-12 rounded-full bg-surface-alt flex items-center justify-center">
                 <ChevronRight className="h-6 w-6" />
               </div>
               <span className="text-sm font-semibold">See More</span>
             </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- carousel section ---------- */

function CarouselSection({ title, items, renderItem, moreLink }: { title: string, items: any[], renderItem: (item: any) => React.ReactNode, moreLink: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
        <Link to={moreLink} className="text-xs font-semibold text-navy hover:text-orange transition-colors">
          View all <span className="text-sm">→</span>
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item, i) => (
          <div key={i} className="w-[280px] shrink-0 snap-start flex flex-col items-stretch">
            {renderItem(item)}
          </div>
        ))}
        <div className="w-[200px] shrink-0 snap-start flex items-center justify-center py-2">
          <Link to={moreLink} className="flex flex-col items-center justify-center gap-2 text-navy hover:text-orange transition-colors h-full min-h-[160px] w-full rounded-2xl border-2 border-dashed border-border hover:border-orange bg-muted/20">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/5">
              <MoreHorizontal className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">View More</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
