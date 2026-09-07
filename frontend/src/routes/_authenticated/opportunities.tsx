import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Briefcase, Loader2, SlidersHorizontal, MapPin, LayoutGrid, ArrowDownUp, ChevronDown } from "lucide-react";
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

  const filteredItems = opportunities.filter(item => {
    // Filter by type
    if (activeFilter !== "all" && item.type !== activeFilter) return false;
    
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

  return (
    <section className="mx-auto max-w-4xl w-full overflow-x-hidden px-4 pt-0 pb-20 flex flex-col min-h-screen">
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

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 pb-2">
        <button className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] sm:text-xs font-medium text-navy hover:bg-muted/50 transition">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          All Locations
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        <button className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] sm:text-xs font-medium text-navy hover:bg-muted/50 transition">
          <LayoutGrid className="h-3 w-3 text-muted-foreground" />
          All Categories
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        <button className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] sm:text-xs font-medium text-navy hover:bg-muted/50 transition">
          <ArrowDownUp className="h-3 w-3 text-muted-foreground" />
          Sort
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-border/50 pb-4">
        <p className="text-sm font-semibold text-navy">
          {filteredItems.length} opportunities found
        </p>
        <button className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition">
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </button>
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
  );
}
