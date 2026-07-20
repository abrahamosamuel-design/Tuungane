import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, Bell, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { FeedAvatar } from "@/components/feed/FeedAvatar";
import { useUserLocation } from "@/hooks/use-user-location";

import { useQuery } from "@tanstack/react-query";

export function DashboardView() {
  const { user } = useAuth();
  const { location: userLoc } = useUserLocation();
  const [emblaRef] = useEmblaCarousel({ dragFree: true });
  const [jobsRef] = useEmblaCarousel({ dragFree: true });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data", userLoc?.latitude, userLoc?.longitude],
    queryFn: async () => {
      const hasCoords = userLoc?.latitude != null && userLoc?.longitude != null;
      const params: any = {};
      if (hasCoords) {
        params.lat = userLoc!.latitude;
        params.lng = userLoc!.longitude;
      }

      // Fetch providers and recent listings for stories and top jobs
      const homeRes = await apiClient.get("/feed/home", { params }).catch(() => ({ data: {} }));
      const homeData = homeRes.data || {};
      
      // The original "Community Feed" on the dashboard was designed to show "requests" 
      // (it used r.title and r.description in its mapping)
      const requestsData = homeData.requests || [];

      const formattedPosts = requestsData.map((r: any) => ({
        id: r.id,
        author: r.posted_as_name || r.customer_name || "A member",
        avatar: r.posted_as_avatar_url || r.customer_avatar_url || null,
        time: new Date(r.created_at).toLocaleDateString(),
        location: r.area || r.town || r.district || "Uganda",
        content: (r.title || r.service_needed) + (r.description ? ` - ${r.description}` : ""),
        images: r.media_urls || [],
        likes: Math.floor(Math.random() * 50) + 1,
        comments: Math.floor(Math.random() * 20),
      }));

      const profiles = (homeData.providers || []).map((p: any) => ({
        owner_id: p.user_id,
        slug: p.slug,
        name: p.business_name || p.profile?.full_name || "Provider",
        avatar_url: p.cover_url || p.profile?.avatar_url || null,
      }));

      const topJobs = (homeData.recentListings || []).map((l: any) => ({
        owner_id: l.user_id,
        name: l.business_name || l.profile?.full_name || l.subcategory || "Service",
        cover_url: l.cover_url || l.avatar_url || l.profile?.avatar_url || null,
      }));

      return {
        profiles,
        topJobs,
        posts: formattedPosts
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const profiles = data?.profiles || [];
  const realTopJobs = data?.topJobs || [];
  const realPosts = data?.posts || [];
  const loadingJobs = isLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 md:pb-0">

      <main className="flex-1 space-y-6 pt-16">
        
        {/* 2. Profile Stories Carousel */}
        <section>
          <div className="overflow-hidden px-4" ref={emblaRef}>
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <Link to="/me" className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-orange p-1 hover:bg-orange/5">
                  <FeedAvatar src={null} name={user?.email || "Me"} size={56} />
                  <div className="absolute -bottom-1 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-orange text-white">
                    <span className="text-xs font-bold leading-none">+</span>
                  </div>
                </Link>
                <span className="text-[10px] font-medium text-muted-foreground">Your Story</span>
              </div>

              {profiles.map((p) => (
                <div key={p.owner_id} className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <Link 
                    to={p.slug ? "/p/$slug" : "/u/$id"} 
                    params={p.slug ? { slug: p.slug } : { id: p.owner_id }}
                    className="rounded-full border-2 border-orange p-0.5 hover:opacity-80 transition-opacity"
                  >
                    <FeedAvatar src={p.avatar_url} name={p.name} size={56} />
                  </Link>
                  <span className="w-full truncate text-center text-[10px] font-medium text-navy">{p.name}</span>
                </div>
              ))}
              
              {/* Mock fallback profiles if none loaded */}
              {!isLoading && profiles.length === 0 && [1,2,3].map(i => (
                <div key={i} className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <div className="rounded-full border-2 border-orange p-0.5">
                     <FeedAvatar src={`https://i.pravatar.cc/150?u=${i}`} name={`User ${i}`} size={56} />
                  </div>
                  <span className="w-full truncate text-center text-[10px] font-medium text-navy">User {i}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Top Jobs Done Slider (Dating App style stacked/slider cards) */}
        <section className="px-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Top jobs done</h2>
          <div className="overflow-hidden rounded-2xl" ref={jobsRef}>
            <div className="flex gap-4">
              {realTopJobs.map((job) => (
                <div key={job.owner_id} className="relative h-48 w-40 shrink-0 overflow-hidden rounded-2xl shadow-sm">
                  <img src={job.cover_url || undefined} alt={job.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-xs font-medium">{job.name}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="text-xs text-muted-foreground p-4">Loading top jobs...</div>
              )}
              {!isLoading && realTopJobs.length === 0 && [1,2,3].map(i => (
                <div key={`mock-${i}`} className="relative h-48 w-40 shrink-0 overflow-hidden rounded-2xl shadow-sm">
                  <img src={`https://picsum.photos/seed/${i}/300/400`} alt={`Example Job ${i}`} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-xs font-medium">Job Example {i}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Community Feed */}
        <section className="px-4 pb-6">
          <h2 className="mb-4 text-sm font-semibold text-navy">Community Feed</h2>
          
          <div className="space-y-6">
            {isLoading && <div className="text-sm text-muted-foreground text-center py-8">Loading posts...</div>}
            {!isLoading && realPosts.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No community posts yet.</div>}
            {realPosts.map((post) => (
              <div key={post.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                
                {/* Author Info */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FeedAvatar src={post.avatar} name={post.author} size={40} />
                    <div>
                      <h3 className="text-sm font-semibold text-navy flex items-center gap-1">
                        {post.author}
                        <span className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white">✓</span>
                      </h3>
                      <p className="text-[10px] text-muted-foreground">{post.time} • {post.location}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-navy">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className="mb-3 overflow-hidden rounded-2xl">
                    <img src={post.images[0]} alt="Post content" className="w-full object-cover max-h-64" />
                  </div>
                )}
                
                {/* Content */}
                <p className="mb-4 text-xs leading-relaxed text-navy-muted">
                  {post.content}
                </p>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-muted/50 py-2 text-xs font-medium text-navy transition-colors hover:bg-muted">
                    <Heart className="h-4 w-4" />
                    {post.likes}
                  </button>
                  <button className="flex flex-[2] items-center justify-center gap-2 rounded-full border border-border bg-muted/50 py-2 px-4 text-xs font-medium text-navy transition-colors hover:bg-muted w-full">
                    <MessageCircle className="h-4 w-4" />
                    Comments here
                  </button>
                </div>

              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
