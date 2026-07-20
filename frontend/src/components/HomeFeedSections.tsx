import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  MessageSquare,
  Star,
  BadgeCheck,
  Briefcase,
  Send,
  Wallet,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { useUserLocation } from "@/hooks/use-user-location";
import { useFeaturedLocations, isFeaturedTarget } from "@/hooks/use-featured-locations";
import { filterByRadius, proximityLabel, sortByProximity } from "@/lib/location";
import { timeAgo } from "@/lib/format";
import { formatSubcategory } from "@/lib/format-category";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { useCategory } from "@/hooks/use-categories";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderResponseDialog } from "@/components/ProviderResponseDialog";
import { EditRequestDialog } from "@/components/EditRequestDialog";
import { FeedAvatar } from "@/components/feed/FeedAvatar";
import { ExpandableText } from "@/components/feed/ExpandableText";
import { MediaGrid } from "@/components/feed/MediaGrid";
import { useAuthGate } from "@/components/RequireAuthDialog";




type NearbyRequest = {
  id: string;
  customer_id?: string | null;
  title: string | null;
  service_needed: string | null;
  description: string | null;
  budget_range: string | null;
  urgent_flag: boolean;
  created_at: string;
  district: string | null;
  town: string | null;
  area: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  category_slug?: string | null;
  subcategory?: string | null;
  media_urls?: string[] | null;
  customer_name?: string | null;
  customer_avatar_url?: string | null;
  posted_as_type?: string | null;
  posted_as_name?: string | null;
  posted_as_avatar_url?: string | null;
  posted_as_ref_type?: string | null;
  posted_as_ref_id?: string | null;
};


type NearbyProvider = {
  user_id: string;
  slug?: string | null;
  business_name: string | null;
  category_slug?: string | null;
  subcategory: string;
  bio?: string | null;
  town: string | null;
  district: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number | null;
  areas_served: string[] | null;
  verified: string;
  availability?: string | null;
  years_experience?: number | null;
  cover_url?: string | null;
  media_urls?: string[] | null;
  profile?: { full_name: string; avatar_url: string | null } | null;
};

type RecentListing = {
  id: string;
  slug: string | null;
  user_id: string;
  business_name: string | null;
  avatar_url?: string | null;
  category_slug: string | null;
  subcategory: string;
  bio: string | null;
  town: string | null;
  district: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: string;
  availability?: string | null;
  cover_url?: string | null;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
};

const SECTION_WRAP = "mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10";
// Removed SCROLLER and CARD_W as we are using CSS grid now

import { useQuery, useQueryClient } from "@tanstack/react-query";

export function HomeFeedSections() {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const { location: userLoc } = useUserLocation();
  const { locations: featured } = useFeaturedLocations();
  const queryClient = useQueryClient();

  const [respondTo, setRespondTo] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["home-feed", userLoc?.latitude, userLoc?.longitude, user?.id],
    queryFn: async () => {
      const hasCoords = userLoc?.latitude != null && userLoc?.longitude != null;
      const params: any = {};
      if (hasCoords) {
        params.lat = userLoc!.latitude;
        params.lng = userLoc!.longitude;
      }
      
      const res = await apiClient.get("/feed/home", { params });
      return res.data || {
        requests: [],
        hasNearbyReqs: false,
        providers: [],
        recentListings: [],
        isProvider: false,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const { requests = [], hasNearbyReqs = false, providers = [], recentListings = [], isProvider = false } = data ?? {};

  const topRequests = useMemo(() => {
    const sorted = sortByProximity(requests, userLoc, (r) => r);
    const boosted = [...sorted].sort((a, b) => {
      const af = isFeaturedTarget(a, featured) ? 1 : 0;
      const bf = isFeaturedTarget(b, featured) ? 1 : 0;
      if (bf !== af) return bf - af;
      return (b.urgent_flag ? 1 : 0) - (a.urgent_flag ? 1 : 0);
    });
    const withinDefault = filterByRadius(boosted, userLoc, (r) => r, 20);
    return (withinDefault.length >= 3 ? withinDefault : boosted).slice(0, 3);
  }, [requests, userLoc, featured]);

  const topProviders = useMemo(() => {
    const sorted = sortByProximity(providers, userLoc, (p) => p);
    const boosted = [...sorted].sort((a, b) => {
      const av = a.verified === "verified" ? 1 : 0;
      const bv = b.verified === "verified" ? 1 : 0;
      if (bv !== av) return bv - av;
      const aa = (a.availability || "available").toLowerCase() === "available" ? 1 : 0;
      const ba = (b.availability || "available").toLowerCase() === "available" ? 1 : 0;
      if (ba !== aa) return ba - aa;
      const af = isFeaturedTarget(a, featured) ? 1 : 0;
      const bf = isFeaturedTarget(b, featured) ? 1 : 0;
      return bf - af;
    });
    const withinDefault = filterByRadius(boosted, userLoc, (p) => p, 20);
    return (withinDefault.length >= 3 ? withinDefault : boosted).slice(0, 6);
  }, [providers, userLoc, featured]);

  const topListings = useMemo(() => {
    // Strict "Recently listed" order: newest created_at first.
    // Stable tiebreak on user_id (most recent insertion tends to have a higher uuid lex order;
    // we just need determinism — never reorder by rating, verification, availability, or proximity).
    return [...recentListings]
      .sort((a, b) => {
        const tb = new Date(b.created_at).getTime();
        const ta = new Date(a.created_at).getTime();
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      })
      .slice(0, 6);
  }, [recentListings]);


  const requestsTitle = hasNearbyReqs ? "Open requests near you" : "Latest open requests";

  return (
    <div className="overflow-x-hidden">
      {/* OPEN REQUESTS */}
      <section className={SECTION_WRAP}>
        <SectionTitle
          title={requestsTitle}
          subtitle="See what people nearby need help with today."
          link={{ label: "View all", to: "/requests/browse" }}
        />
        {loading ? (
          <CardSkeletonRow />
        ) : topRequests.length === 0 ? (
          <CompactEmptyState
            message="No open requests near you yet."
            hint="Create the first request in your area."
            cta={{ label: "Post a Service Request", to: "/requests/new" }}
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topRequests.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                userLoc={userLoc}
                featured={Boolean(isFeaturedTarget(r, featured))}
                isProvider={isProvider}
                currentUserId={user?.id ?? null}
                onEdit={() => setEditingRequest(r.id)}
                onRespond={() => requireAuth(() => setRespondTo(r.id), { title: "Sign in to respond", message: "Create a free Tuungane account to send quotes and respond to service requests." })}
              />
            ))}
          </div>
        )}
        <MobileViewAll to="/requests/browse" label="View all open requests" />
      </section>

      {/* TRUSTED PROVIDERS */}
      <section className={SECTION_WRAP}>
        <SectionTitle
          title="Trusted providers near you"
          subtitle="Find local providers offering services around your area."
          link={{ label: "View all", to: "/services" }}
        />
        {loading ? (
          <CardSkeletonRow />
        ) : topProviders.length === 0 ? (
          <CompactEmptyState
            message="No providers listed near you yet."
            hint="Be among the first to list your service."
            cta={{ label: "List Your Service", to: "/profiles/new" }}
          />
        ) : (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topProviders.map((p) => (
              <ProviderCard key={p.user_id} p={p} userLoc={userLoc} />
            ))}
          </div>
        )}
        <MobileViewAll to="/services" label="View all providers" />
      </section>

      {/* RECENTLY LISTED SERVICES — hidden when none exist */}
      {!loading && topListings.length > 0 && (
        <section className={SECTION_WRAP}>
          <SectionTitle
            title="Recently listed services"
            subtitle="New services added by providers on Tuungane."
            link={{ label: "View all", to: "/services", search: { sort: "recent" } }}
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topListings.map((l) => (
              <ServiceListingCard key={l.id} l={l} userLoc={userLoc} />
            ))}
          </div>
          <MobileViewAll to="/services" label="View all services" search={{ sort: "recent" }} />
        </section>
      )}


      {respondTo && (
        <ProviderResponseDialog
          open
          onClose={() => setRespondTo(null)}
          requestId={respondTo}
        />
      )}
      <EditRequestDialog
        open={!!editingRequest}
        requestId={editingRequest}
        onClose={() => setEditingRequest(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["home-feed"] })}
      />
    </div>
  );
}

function SectionTitle({ title, subtitle, link }: { title: string; subtitle?: string; link?: { label: string; to: string; search?: Record<string, any> } }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-navy sm:text-xl">
          {title}
          <span className="mt-1 block h-1 w-10 rounded-full bg-green/80" />
        </h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link.to} search={link.search as any} className="hidden shrink-0 text-sm font-semibold text-navy hover:text-orange sm:inline">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

function MobileViewAll({ to, label, search }: { to: string; label: string; search?: Record<string, any> }) {
  return (
    <div className="mt-2 sm:hidden">
      <Link to={to} search={search as any} className="inline-flex text-sm font-semibold text-navy hover:text-orange">
        {label} →
      </Link>
    </div>
  );
}


function CardSkeletonRow() {
  return (
    <div className="-mx-4 mt-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-[85%] shrink-0 sm:w-auto">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function CompactEmptyState({ message, hint, cta }: { message: string; hint: string; cta: { label: string; to: string } }) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy">{message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Link
        to={cta.to}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-orange px-4 py-2.5 text-center text-sm font-semibold text-orange-foreground hover:brightness-110 sm:py-2 sm:text-xs"
      >
        {cta.label}
      </Link>
    </div>
  );
}

function urgencyMeta(r: NearbyRequest) {
  if (r.urgent_flag) return { label: "Today", cls: "bg-orange/15 text-orange" };
  return { label: "Flexible", cls: "bg-green/15 text-green" };
}

function RequestCard({
  r,
  userLoc,
  featured,
  isProvider,
  currentUserId,
  onRespond,
  onEdit,
}: {
  r: NearbyRequest;
  userLoc: ReturnType<typeof useUserLocation>["location"];
  featured: boolean;
  isProvider: boolean;
  currentUserId?: string | null;
  onRespond: () => void;
  onEdit?: () => void;
}) {
  const cat = useCategory(r.category_slug ?? undefined);
  const near = proximityLabel(userLoc, r);
  const title = r.title?.trim() || r.service_needed || "Request";
  const loc = r.area || r.town || r.district || r.location || "Uganda";
  const urg = urgencyMeta(r);
  const media = (r.media_urls ?? []).filter(Boolean) as string[];
  const isOwner = !!currentUserId && !!r.customer_id && currentUserId === r.customer_id;
  const isBusinessPost = r.posted_as_type === "business" && !!r.posted_as_name;
  const requesterName = isBusinessPost
    ? (r.posted_as_name as string)
    : (r.customer_name?.trim() || (currentUserId ? "A member" : "Open request"));
  const requesterAvatar = isBusinessPost
    ? (r.posted_as_avatar_url ?? r.customer_avatar_url ?? null)
    : (r.customer_avatar_url ?? null);


  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)] transition hover:border-orange ${
        r.urgent_flag ? "border-orange/40" : "border-border"
      }`}
    >
      {/* Header — requester name + meta (or anonymous for guests) */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <FeedAvatar src={requesterAvatar} name={requesterName} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-[13px] font-semibold text-navy">
            <span className="truncate">{requesterName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-[12px] font-medium text-muted-foreground">{timeAgo(r.created_at)}</span>
            {isOwner && (
              <span className="rounded-full bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-navy">You</span>
            )}
          </div>
          <p className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {loc}
            {near ? (
              <span className="rounded-full bg-green/10 px-1.5 py-[1px] text-[9px] font-semibold leading-tight text-green">{near}</span>
            ) : null}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${urg.cls}`}>{urg.label}</span>
      </div>


      <div className="flex flex-wrap items-center gap-1.5 px-4">
        {featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
            <Star className="h-3 w-3" /> Featured
          </span>
        )}
        {r.urgent_flag && (
          <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange">Urgent</span>
        )}
      </div>

      <Link to="/requests/$id" params={{ id: r.id }} className="block px-4 pt-2">
        <h3 className="font-display text-[15px] font-bold leading-snug text-navy line-clamp-2 break-words">{title}</h3>
        {cat ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {cat.name}{r.subcategory ? ` · ${formatSubcategory(r.subcategory)}` : ""}
          </p>
        ) : null}
        {r.description ? <ExpandableText text={r.description} clampLines={3} maxLines={8} className="mt-2" /> : null}
      </Link>

      {media.length > 0 && (
        <div className="px-4">
          <MediaGrid urls={media} alt={title} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 text-[11px] text-muted-foreground">
        {r.budget_range ? (
          <span className="inline-flex items-center gap-1 font-bold text-orange">
            <Wallet className="h-3 w-3" /> {r.budget_range}
          </span>
        ) : null}
      </div>

      <div className={`mt-auto grid ${isOwner ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_auto]"} items-stretch gap-2 border-t border-border bg-surface px-3 py-2.5`}>
        {isOwner ? (
          <>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="inline-flex h-9 items-center justify-center rounded-full bg-navy px-4 text-xs font-semibold text-navy-foreground hover:brightness-110"
            >
              Manage request
            </Link>
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-navy hover:border-navy"
              >
                Edit
              </button>
            ) : null}
          </>
        ) : (
          <>
            {isProvider ? (
              <button
                type="button"
                onClick={onRespond}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-orange px-4 text-xs font-semibold text-orange-foreground hover:brightness-110"
              >
                <Send className="h-3.5 w-3.5" /> Send quote
              </button>
            ) : (
              <Link
                to="/requests/$id"
                params={{ id: r.id }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-orange px-4 text-xs font-semibold text-orange-foreground hover:brightness-110"
              >
                <Send className="h-3.5 w-3.5" /> Respond
              </Link>
            )}
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-navy hover:border-navy"
              aria-label="Message"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/requests/$id"
              params={{ id: r.id }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-navy hover:border-navy"
            >
              View
            </Link>
          </>
        )}
      </div>

    </article>
  );
}


function availabilityMeta(a?: string | null) {
  switch ((a || "available").toLowerCase()) {
    case "available": return { label: "Available", cls: "bg-green/15 text-green" };
    case "busy": return { label: "Busy", cls: "bg-amber-100 text-amber-700" };
    case "unavailable":
    case "not_available": return { label: "Not available", cls: "bg-muted text-muted-foreground" };
    default: return { label: "Available", cls: "bg-green/15 text-green" };
  }
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
}

function ProviderCard({ p, userLoc }: { p: NearbyProvider; userLoc: ReturnType<typeof useUserLocation>["location"] }) {
  const name = p.business_name || p.profile?.full_name || "Provider";
  const isVerified = p.verified === "verified" || p.verified === "featured";
  
  const coverImage = p.cover_url || (p.media_urls && p.media_urls.length > 0 ? p.media_urls[0] : null) || p.profile?.avatar_url;
  const linkProps = p.slug ? ({ to: "/p/$slug", params: { slug: p.slug } } as const) : ({ to: "/u/$id", params: { id: p.user_id } } as const);

  return (
    <div className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-md hover:border-orange transition-all relative`}>
      <Link {...linkProps} className="flex flex-col flex-1 relative z-10">
        {/* Top Image */}
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface">
              <span className="text-muted-foreground/30 text-4xl font-bold font-display uppercase">{name.substring(0, 2)}</span>
            </div>
          )}
          {isVerified && (
            <div className="absolute top-2 left-2 bg-green/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified
            </div>
          )}
          <div className="absolute right-2 top-2">
            <ProfileTrustBadge kind="service_profile" id={p.user_id} size="sm" />
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="font-display text-base font-bold leading-tight text-navy line-clamp-1">{name}</h3>
          <p className="mt-1 text-sm font-medium text-foreground/80 line-clamp-1">{formatSubcategory(p.subcategory)}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.area || p.town || p.district || "Location not provided"}</span>
          </p>
        </div>
      </Link>

      <div className="p-4 pt-0 mt-auto relative z-10">
        <Link
          {...linkProps}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-orange/10 hover:bg-orange px-4 py-2 text-sm font-bold text-orange hover:text-white transition-colors"
        >
          Contact
        </Link>
      </div>
    </div>
  );
}



function ServiceListingCard({
  l,
  userLoc,
}: {
  l: RecentListing;
  userLoc: ReturnType<typeof useUserLocation>["location"];
}) {
  const cat = useCategory(l.category_slug ?? undefined);
  const name = l.business_name || l.profile?.full_name || formatSubcategory(l.subcategory) || cat?.name || "Service";
  const isVerified = l.verified === "verified" || l.verified === "featured";
  
  const coverImage = l.cover_url || l.avatar_url || l.profile?.avatar_url;
  const linkProps = l.slug ? ({ to: "/p/$slug", params: { slug: l.slug } } as const) : ({ to: "/u/$id", params: { id: l.user_id } } as const);

  return (
    <div className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-md hover:border-orange transition-all relative`}>
      <Link {...linkProps} className="flex flex-col flex-1 relative z-10">
        {/* Top Image */}
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface">
              <span className="text-muted-foreground/30 text-4xl font-bold font-display uppercase">{name.substring(0, 2)}</span>
            </div>
          )}
          {isVerified && (
            <div className="absolute top-2 left-2 bg-green/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified
            </div>
          )}
          <div className="absolute right-2 top-2">
            <ProfileTrustBadge kind="service_profile" id={l.user_id} size="sm" />
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="font-display text-base font-bold leading-tight text-navy line-clamp-1">{name}</h3>
          <p className="mt-1 text-sm font-medium text-foreground/80 line-clamp-1">{formatSubcategory(l.subcategory) || cat?.name}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{l.area || l.town || l.district || "Location not provided"}</span>
          </p>
        </div>
      </Link>

      <div className="p-4 pt-0 mt-auto relative z-10">
        <Link
          {...linkProps}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-orange/10 hover:bg-orange px-4 py-2 text-sm font-bold text-orange hover:text-white transition-colors"
        >
          View service
        </Link>
      </div>
    </div>
  );
}
