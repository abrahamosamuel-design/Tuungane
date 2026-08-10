import { useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, Bell, Heart, MessageCircle, MoreHorizontal, Star, ChevronRight, Wrench, Zap, Sparkles, Calendar, GraduationCap, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { FeedAvatar } from "@/components/feed/FeedAvatar";
import { useUserLocation } from "@/hooks/use-user-location";

import { useQuery } from "@tanstack/react-query";

import { MobileSearchBar } from "@/components/MobileSearchBar";
import { CategoryScroll } from "@/components/CategoryScroll";
import { ServiceVerticalList } from "@/components/ServiceVerticalList";

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

      // Fetch providers and recent listings for stories and top jobs
      const homeRes = await apiClient.get("/feed/home", { params }).catch(() => ({ data: {} }));
      const homeData = homeRes.data || {};
      
      // The original "Community Feed" on the dashboard was designed to show "requests" 
      // (it used r.title and r.description in its mapping)
      const requestsData = homeData.requests || [];

      const formattedRequests = requestsData.map((r: any) => ({
        id: r.id,
        author: r.posted_as_name || r.customer_name || "A member",
        avatar: r.posted_as_avatar_url || r.customer_avatar_url || null,
        time: new Date(r.created_at).toLocaleDateString(),
        location: r.area || r.town || r.district || "Uganda",
        title: r.title || r.service_needed,
        budget: r.budget_range || (r.price ? `UGX ${r.price}` : "Negotiable"),
        content: (r.title || r.service_needed) + (r.description ? ` - ${r.description}` : ""),
      }));

      const formattedProfiles = (homeData.providers || []).map((p: any) => ({
        id: p.user_id,
        owner_id: p.user_id,
        slug: p.slug,
        name: p.business_name || p.profile?.full_name || "Provider",
        avatar_url: p.cover_url || p.profile?.avatar_url || null,
        category: p.subcategory || p.category || "Service Provider",
        rating: p.rating || (4 + Math.random()).toFixed(1),
        jobs: p.jobs_completed || Math.floor(Math.random() * 50) + 1,
      }));

      const topJobs = (homeData.recentListings || []).map((l: any) => ({
        owner_id: l.user_id,
        name: l.business_name || l.profile?.full_name || l.subcategory || "Service",
        cover_url: l.cover_url || l.avatar_url || l.profile?.avatar_url || null,
      }));

      return {
        profiles: formattedProfiles,
        topJobs,
        requests: formattedRequests
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const realProfiles = data?.profiles || [];
  const realTopJobs = data?.topJobs || [];
  const realRequests = data?.requests || [];
  const loadingJobs = isLoading;

  const mixedFeed = useMemo(() => {
    const feed: any[] = [];
    
    let profIdx = 0;
    let reqIdx = 0;
    let itemCount = 0;

    // Interleave real profiles and requests
    while (profIdx < realProfiles.length || reqIdx < realRequests.length) {
      // Alternate: inject provider pair, then request
      if (itemCount % 2 === 0 && profIdx + 1 < realProfiles.length) {
        const p1 = realProfiles[profIdx++];
        const p2 = realProfiles[profIdx++];
        feed.push({ type: 'provider_pair', id: `pair-${itemCount}`, providers: [p1, p2] });
      } else if (reqIdx < realRequests.length) {
        const r = realRequests[reqIdx++];
        feed.push({ type: 'request', id: `req-${itemCount}`, data: r });
      } else if (profIdx + 1 < realProfiles.length) {
        const p1 = realProfiles[profIdx++];
        const p2 = realProfiles[profIdx++];
        feed.push({ type: 'provider_pair', id: `pair-${itemCount}`, providers: [p1, p2] });
      } else if (profIdx < realProfiles.length) {
        // Single remaining provider
        const p1 = realProfiles[profIdx++];
        feed.push({ type: 'provider_pair', id: `pair-${itemCount}`, providers: [p1] });
      } else {
        break;
      }
      itemCount++;
    }
    
    return feed;
  }, [realProfiles, realRequests]);

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

      <div className="mx-auto flex w-full max-w-7xl px-4 sm:px-6 lg:px-8 gap-8 pt-2 md:pt-8">
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-6">

        {/* 4. Community Feed */}
        <section className="pb-6">
          <h2 className="mb-4 text-sm font-semibold text-navy">Community Feed</h2>
          
          <div className="space-y-6">
            {isLoading && <div className="text-sm text-muted-foreground text-center py-8">Loading posts...</div>}
            {!isLoading && mixedFeed.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No community posts yet.</div>}
            {mixedFeed.map((item) => {
              if (item.type === 'provider_pair') {
                return (
                  <div key={item.id} className="grid grid-cols-2 gap-4">
                    {item.providers.map((p: any) => (
                      <div key={p.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm text-center">
                         <img src={p.avatar} className="mx-auto h-12 w-12 rounded-full object-cover mb-2" />
                         <h4 className="font-semibold text-sm text-navy truncate">{p.name}</h4>
                         <p className="text-[10px] text-muted-foreground">{p.category}</p>
                         <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-medium text-orange">
                           <Star className="h-3 w-3 fill-current" /> {p.rating} ({p.jobs} jobs)
                         </div>
                         <Link 
                           to={p.slug ? "/p/$slug" : "/u/$id"}
                           params={p.slug ? { slug: p.slug } : { id: p.owner_id }}
                           className="mt-3 block w-full rounded-full bg-orange/10 py-1.5 text-center text-xs font-semibold text-orange hover:bg-orange/20 transition-colors"
                         >
                           View Profile
                         </Link>
                      </div>
                    ))}
                  </div>
                );
              }

              if (item.type === 'request') {
                return (
                  <div key={item.id} className="rounded-3xl border border-orange/30 bg-orange/5 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange/20 text-orange">
                           <Search className="h-4 w-4" />
                        </div>
                        <div>
                           <span className="text-xs font-semibold text-navy">Service Request</span>
                           <p className="text-[10px] text-muted-foreground">{item.data.author} • {item.data.location}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.data.time}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-navy mb-1">{item.data.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4 font-medium">Budget: {item.data.budget}</p>
                    <button className="w-full rounded-full bg-orange py-2 text-xs font-semibold text-white hover:bg-orange/90 transition-colors">
                      Send Quote
                    </button>
                  </div>
                );
              }

              const post = item.data;
              return (
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
              );
            })}
          </div>
        </section>

        </main>

        {/* Right Panel (Desktop Only) */}
        <aside className="hidden lg:block w-[320px] shrink-0 space-y-6 pb-20">
          
          {/* Service Categories */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-navy">Categories</h2>
            <div className="space-y-3">
               {[
                 { name: "Plumbing", providers: 12 },
                 { name: "Cleaning", providers: 8 },
                 { name: "Mechanics", providers: 5 },
                 { name: "Beauty & Hair", providers: 15 },
                 { name: "Tutoring", providers: 9 },
               ].map((cat) => (
                 <Link key={cat.name} to="/services" search={{ q: cat.name } as never} className="group flex items-center justify-between rounded-xl p-2 hover:bg-muted/50 transition-colors">
                   <div>
                     <span className="block text-sm font-medium text-navy group-hover:text-orange transition-colors">{cat.name}</span>
                     <span className="text-[10px] text-muted-foreground">{cat.providers} providers</span>
                   </div>
                   <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-orange transition-colors" />
                 </Link>
               ))}
               <Link to="/services" className="mt-2 block w-full text-center text-xs font-semibold text-orange hover:underline">
                 View all categories
               </Link>
            </div>
          </div>
          
          {/* Recent Reviews */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-navy">Recent Reviews</h2>
            <div className="space-y-5">
               <p className="text-xs text-muted-foreground text-center py-4">No reviews yet. Reviews from completed jobs will appear here.</p>
            </div>
          </div>
          
        </aside>
      </div>
    </div>
  );
}
