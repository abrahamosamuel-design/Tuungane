import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Briefcase, Loader2, SlidersHorizontal, MapPin, LayoutGrid, ArrowDownUp, ChevronDown, PlusCircle, Search, FileText, HelpCircle, User, Handshake, Bookmark, Send, ArrowRight } from "lucide-react";
import { MobileSearchBar } from "@/components/MobileSearchBar";
import { OpportunityCard, OpportunityItem, OpportunityType } from "@/components/OpportunityCard";

export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities — Tuungane" }] }),
  component: OpportunitiesPage,
});

type FilterType = "all" | OpportunityType;

function OpportunitiesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: "/opportunities" } as never });
  }, [loading, user, nav]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [requestsRes, jobsRes, jobRequestsRes] = await Promise.allSettled([
        apiClient<{ data: any[] }>("/requests/browse"),
        apiClient<{ data: any[] }>("/opportunities/jobs"),
        apiClient<{ data: any[] }>("/opportunities/job-requests")
      ]);

      const items: OpportunityItem[] = [];

      // Process Service Requests
      if (requestsRes.status === "fulfilled" && requestsRes.value.data) {
        requestsRes.value.data.forEach(req => {
          items.push({
            id: req.id,
            type: "need_service",
            title: req.title,
            description: req.description,
            location: req.location || req.district || "",
            date: req.created_at,
            author: {
              name: req.posted_as_name || "Client",
              avatar_url: req.posted_as_avatar_url,
              type: req.posted_as_type === "business" ? "Business" : "Individual"
            },
            originalData: req
          });
        });
      }

      // Process Job Opportunities (Hiring)
      if (jobsRes.status === "fulfilled" && jobsRes.value.data) {
        jobsRes.value.data.forEach(job => {
          items.push({
            id: job.id,
            type: "hiring",
            title: job.job_title,
            description: job.qualification || "",
            location: job.location || "",
            date: job.created_at,
            author: {
              name: job.company_name || "Company",
              avatar_url: job.profile?.avatar_url,
              type: "Business" // Assume hiring posts are businesses for now
            },
            originalData: job
          });
        });
      }

      // Process Job Requests (Looking for a Job)
      if (jobRequestsRes.status === "fulfilled" && jobRequestsRes.value.data) {
        jobRequestsRes.value.data.forEach(req => {
          items.push({
            id: req.id,
            type: "job_request",
            title: req.job_title,
            description: req.resume_summary || "",
            location: req.location || "",
            date: req.created_at,
            author: {
              name: req.full_name || req.profile?.full_name || "Professional",
              avatar_url: (req.media_urls && req.media_urls.length > 0) ? req.media_urls[0] : req.profile?.avatar_url,
              type: "Individual"
            },
            originalData: req
          });
        });
      }

      // Sort all combined items by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setOpportunities(items);
    } catch (err) {
      toast.error("Failed to load opportunities");
    } finally {
      setLoadingData(false);
    }
  };

  const [locationFilter, setLocationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const uniqueLocations = Array.from(new Set(opportunities.map(o => o.location).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(opportunities.map(o => o.originalData?.category_slug).filter(Boolean)));

  let filteredItems = opportunities.filter(item => {
    // Filter by type
    if (activeFilter !== "all" && item.type !== activeFilter) return false;
    
    // Filter by location
    if (locationFilter !== "all" && item.location !== locationFilter) return false;

    // Filter by category
    if (categoryFilter !== "all" && item.originalData?.category_slug !== categoryFilter) return false;

    // Filter by search query
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!item.title?.toLowerCase().includes(sq) && 
          !item.description?.toLowerCase().includes(sq) &&
          !item.author.name?.toLowerCase().includes(sq)) {
        return false;
      }
    }
    
    return true;
  });

  if (sortBy === "oldest") {
    filteredItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else {
    // default is newest
    filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  return (
    <div className="flex flex-col min-h-screen bg-background flex-1 w-full min-w-0">
      
      {/* --- DESKTOP VIEW (Civic Momentum Design) --- */}
      <div className="hidden lg:flex flex-col flex-1 w-full pb-20">
        
        {/* HEADER & CORE VALUE PROPOSITION */}
        <section className="bg-white text-[#0B1F3A] py-6 border-b border-slate-200 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-xs font-medium text-[#FF6B1A] border border-orange-200 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A]"></span>
                  Tuungane MVP Connect Hub
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1F3A]">
                  Opportunities
                </h1>
                <p className="text-base text-slate-500 mt-1 max-w-xl">
                  Find what people are looking for. Post what you need.
                </p>
              </div>
              <div className="flex flex-col sm:items-end items-start gap-2">
                <button onClick={() => nav({ to: "/opportunities/new-request" })} className="inline-flex items-center gap-2 bg-[#FF6B1A] hover:bg-[#e85b0d] text-white px-5 py-3 rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                  <PlusCircle className="w-5 h-5 pt-0.5" />
                  <span>+ Post an Opportunity</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  Need a Service · Looking for a Job · Hiring
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT WRAPPER */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
          
          {/* TYPE TABS / QUICK FILTERS */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 space-y-4">
            {/* Primary Segmented Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              <button onClick={() => setActiveFilter("all")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeFilter === "all" ? "bg-[#0B1F3A] text-white shadow-sm font-bold" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"}`}>
                <span>All Opportunities</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === "all" ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>{opportunities.length}</span>
              </button>
              <button onClick={() => setActiveFilter("need_service")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeFilter === "need_service" ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm" : "bg-slate-50 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 border border-slate-200"}`}>
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Need a Service</span>
              </button>
              <button onClick={() => setActiveFilter("job_request")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeFilter === "job_request" ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" : "bg-slate-50 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-700 border border-slate-200"}`}>
                <span className="w-2 h-2 rounded-full bg-[#22A652]"></span>
                <span>Looking for a Job</span>
              </button>
              <button onClick={() => setActiveFilter("hiring")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeFilter === "hiring" ? "bg-orange-50 text-[#FF6B1A] border-orange-200 shadow-sm" : "bg-slate-50 hover:bg-orange-50/50 text-slate-700 hover:text-[#FF6B1A] border border-slate-200"}`}>
                <span className="w-2 h-2 rounded-full bg-[#FF6B1A]"></span>
                <span>Hiring</span>
              </button>
            </div>

            {/* Secondary Streamlined Filters Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#FF6B1A] transition-all"
                  />
                </div>
                {/* Location */}
                <div className="relative">
                  <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#FF6B1A]">
                    <option value="all">All Locations</option>
                    {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {/* Category */}
                <div className="relative">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#FF6B1A]">
                    <option value="all">All Categories</option>
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{String(cat).charAt(0).toUpperCase() + String(cat).slice(1)}</option>)}
                  </select>
                  <LayoutGrid className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              
              {/* Sort Control */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-xs text-slate-500">Sort by:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#0B1F3A] focus:outline-none focus:border-[#FF6B1A]">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* OPPORTUNITY FEED & CARDS (8 COLS) */}
            <section className="lg:col-span-8 space-y-4">
              {loadingData ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B1A]" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1F3A]">No opportunities found</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">Try adjusting your filters, location, or search query to see more results.</p>
                </div>
              ) : (
                filteredItems.map(item => <DesktopOpportunityCard key={item.id} item={item} onRespond={() => nav({ to: `/requests/${item.id}` })} />)
              )}
            </section>

            {/* SIDEBAR / CONTEXT WIDGETS (4 COLS) */}
            <aside className="lg:col-span-4 space-y-5 sticky top-[80px]">
              <OpportunitiesDesktopSidebar onPost={() => nav({ to: "/opportunities/new-request" })} />
            </aside>

          </div>
        </main>
      </div>

      {/* --- MOBILE VIEW (Preserved exactly as before) --- */}
      <div className="lg:hidden flex flex-col flex-1 w-full">      <section className="mx-auto max-w-4xl w-full overflow-x-hidden px-4 pt-0 pb-20 flex flex-col min-h-screen">
      <div className="-mx-4">
        <MobileSearchBar 
          placeholder="Search opportunities..." 
          value={searchQuery} 
          onChange={(e: any) => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-1.5 pb-1">
        <button
          onClick={() => setActiveFilter("all")}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors ${
            activeFilter === "all" ? "bg-navy text-white shadow-sm" : "bg-muted/60 text-navy hover:bg-muted"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter("need_service")}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors ${
            activeFilter === "need_service" ? "bg-navy text-white shadow-sm" : "bg-muted/60 text-navy hover:bg-muted"
          }`}
        >
          Need a Service
        </button>
        <button
          onClick={() => setActiveFilter("job_request")}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors ${
            activeFilter === "job_request" ? "bg-navy text-white shadow-sm" : "bg-muted/60 text-navy hover:bg-muted"
          }`}
        >
          Looking for a Job
        </button>
        <button
          onClick={() => setActiveFilter("hiring")}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors ${
            activeFilter === "hiring" ? "bg-navy text-white shadow-sm" : "bg-muted/60 text-navy hover:bg-muted"
          }`}
        >
          Hiring
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar w-full">
        <select 
          className="flex-1 min-w-0 shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] sm:text-xs font-medium text-navy hover:bg-muted/50 transition outline-none"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="all">All Locations</option>
          {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>

        <select 
          className="flex-1 min-w-0 shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] sm:text-xs font-medium text-navy hover:bg-muted/50 transition outline-none"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{String(cat).charAt(0).toUpperCase() + String(cat).slice(1)}</option>
          ))}
        </select>

        <select 
          className="flex-1 min-w-0 shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] sm:text-xs font-medium text-navy hover:bg-muted/50 transition outline-none"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-border/50 pb-4">
        <p className="text-sm font-semibold text-navy">
          {filteredItems.length} opportunities found
        </p>
      </div>

      <div className="mt-4 flex-1 flex flex-col gap-4">
        {loadingData ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No opportunities found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          filteredItems.map((item) => (
            <OpportunityCard key={`${item.type}-${item.id}`} item={item} />
          ))
        )}
      </div>
    </section>
      </div>
    </div>
  );
}

function OpportunitiesDesktopSidebar({ onPost }: { onPost: () => void }) {
  return (
    <>
      {/* 1. Post an Opportunity Quick Card */}
      <div className="bg-gradient-to-br from-[#0B1F3A] to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-[#FF6B1A]/40 flex items-center justify-center text-[#FF6B1A] mb-3">
          <FileText className="w-6 h-6 text-[#FF6B1A]" />
        </div>
        <h3 className="text-base font-bold text-white">Post an Opportunity</h3>
        <p className="text-xs text-slate-300 mt-1">Connect with verified people and businesses across Kenya in 3 clear ways:</p>
        
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-blue-400 mt-1 flex-shrink-0"></span>
            <div>
              <span className="font-bold text-white">Need a Service:</span>
              <span className="text-slate-300 ml-1">Post tasks, gigs, or projects you need done.</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 flex-shrink-0"></span>
            <div>
              <span className="font-bold text-white">Looking for a Job:</span>
              <span className="text-slate-300 ml-1">Declare availability and skills for hire.</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#FF6B1A] mt-1 flex-shrink-0"></span>
            <div>
              <span className="font-bold text-white">Hiring:</span>
              <span className="text-slate-300 ml-1">List open jobs or contracts for your business.</span>
            </div>
          </div>
        </div>

        <button onClick={onPost} className="mt-4 w-full bg-[#FF6B1A] hover:bg-[#e85b0d] text-white py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]">
          <PlusCircle className="w-4 h-4 pt-0.5" />
          <span>+ Create Opportunity Now</span>
        </button>
      </div>

      {/* 2. How Opportunities Work Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          <h4 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">How Opportunities Work</h4>
        </div>
        <div className="space-y-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">1</span>
            <div>
              <strong className="text-[#0B1F3A] block">Profiles</strong>
              <span className="text-slate-500 text-[11px]">Who you are (credentials, bio, verification status).</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">2</span>
            <div>
              <strong className="text-[#0B1F3A] block">Services</strong>
              <span className="text-slate-500 text-[11px]">What you offer (catalog of standard listings you sell).</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-orange-50/60 border border-orange-100 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#FF6B1A] text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">3</span>
            <div>
              <strong className="text-[#FF6B1A] block">Opportunities</strong>
              <span className="text-slate-600 text-[11px]">What you need (work requests, job availability, or hiring).</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DesktopOpportunityCard({ item, onRespond }: { item: OpportunityItem, onRespond: () => void }) {
  const isNeedService = item.type === "need_service";
  const isLookingJob = item.type === "job_request";
  const isHiring = item.type === "hiring";

  const getBadgeColors = () => {
    if (isNeedService) return "bg-blue-50 text-blue-700 border-blue-200";
    if (isLookingJob) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-orange-50 text-orange-700 border-orange-200";
  };
  
  const getBadgeIcon = () => {
    if (isNeedService) return <Handshake className="w-3.5 h-3.5" />;
    if (isLookingJob) return <User className="w-3.5 h-3.5" />;
    return <Briefcase className="w-3.5 h-3.5" />;
  };

  const getLabel = () => {
    if (isNeedService) return "Need a Service";
    if (isLookingJob) return "Looking for a Job";
    return "Hiring";
  };

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff/60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`;
    return `${Math.floor(diff/86400)} days ago`;
  };

  const nameInitial = item.author.name?.charAt(0).toUpperCase() || "?";

  return (
    <article className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Type Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${getBadgeColors()}`}>
              {getBadgeIcon()}
              {getLabel()}
            </span>
            {item.location && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {item.location}
              </span>
            )}
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">{timeAgo(item.date)}</span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Open
            </span>
          </div>

          {/* Title */}
          <h2 onClick={onRespond} className="text-lg font-bold text-[#0B1F3A] hover:text-[#FF6B1A] transition-colors cursor-pointer pt-1">
            {item.title}
          </h2>
        </div>
        
        <button className="text-slate-400 hover:text-[#FF6B1A] p-1 rounded-lg hover:bg-slate-50 transition-colors" title="Bookmark Opportunity">
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mt-2.5 leading-relaxed line-clamp-3">
        {item.description}
      </p>

      {/* Extra Metadata Row */}
      {(item.originalData?.budget_min || item.originalData?.salary_min) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            {isNeedService ? "Budget:" : "Salary:"} <strong className="ml-1 text-[#0B1F3A]">UGX {(item.originalData.budget_min || item.originalData.salary_min).toLocaleString()}</strong>
          </span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-100 my-4"></div>

      {/* Card Footer: Poster Metadata + Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {item.author.avatar_url ? (
            <img src={item.author.avatar_url} alt={item.author.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#0B1F3A] text-xs">
              {nameInitial}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0B1F3A]">{item.author.name}</span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded">{item.author.type}</span>
            </div>
            <p className="text-[11px] text-slate-500">Verified Member</p>
          </div>
        </div>
        
        {/* Primary Action */}
        <button onClick={onRespond} className="inline-flex items-center justify-center gap-1.5 bg-[#FF6B1A] hover:bg-[#e85b0d] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98]">
          <span>{isHiring ? "Apply Now" : isLookingJob ? "Connect" : "Respond / Quote"}</span>
          {isLookingJob ? <User className="w-4 h-4" /> : isHiring ? <Send className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </article>
  );
}
