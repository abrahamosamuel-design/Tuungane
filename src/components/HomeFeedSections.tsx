import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  ArrowRight,
  ClipboardList,
  MessageSquare,
  Star,
  BadgeCheck,
  Briefcase,
  Send,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserLocation } from "@/hooks/use-user-location";
import { useFeaturedLocations, isFeaturedTarget } from "@/hooks/use-featured-locations";
import { filterByRadius, proximityLabel, sortByProximity } from "@/lib/location";
import { timeAgo } from "@/lib/format";
import { formatSubcategory } from "@/lib/format-category";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { useCategory } from "@/hooks/use-categories";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderResponseDialog } from "@/components/ProviderResponseDialog";

type NearbyRequest = {
  id: string;
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
};

type NearbyProvider = {
  user_id: string;
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
  profile?: { full_name: string; avatar_url: string | null } | null;
};

type RecentPost = {
  id: string;
  provider_user_id: string;
  text: string;
  category_slug: string | null;
  media_urls: string[];
  town: string | null;
  district: string | null;
  area: string | null;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
};

const SECTION_WRAP = "mx-auto max-w-6xl px-4 pt-10 sm:px-6";

export function HomeFeedSections() {
  const { user } = useAuth();
  const { location: userLoc } = useUserLocation();
  const { locations: featured } = useFeaturedLocations();

  const [requests, setRequests] = useState<NearbyRequest[]>([]);
  const [providers, setProviders] = useState<NearbyProvider[]>([]);
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProvider, setIsProvider] = useState(false);
  const [respondTo, setRespondTo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const hasCoords = userLoc?.latitude != null && userLoc?.longitude != null;
      let reqs: NearbyRequest[] | null = null;
      let provs: NearbyProvider[] | null = null;

      if (hasCoords) {
        const lat = userLoc!.latitude as number;
        const lng = userLoc!.longitude as number;
        const [{ data: rpcReqs }, { data: rpcProvs }] = await Promise.all([
          supabase.rpc("nearby_service_requests", { in_lat: lat, in_lng: lng, in_radius_km: 50, in_limit: 24 }),
          supabase.rpc("nearby_service_profiles", { in_lat: lat, in_lng: lng, in_radius_km: 50, in_limit: 24 }),
        ]);
        reqs = (rpcReqs ?? null) as NearbyRequest[] | null;
        provs = (rpcProvs ?? null) as NearbyProvider[] | null;
      }

      if (!reqs || reqs.length === 0) {
        const { data } = await supabase
          .from("service_requests")
          .select("id,title,service_needed,description,budget_range,urgent_flag,created_at,district,town,area,location,latitude,longitude,category_slug,subcategory")
          .eq("visibility", "public")
          .eq("status", "requested")
          .is("provider_id", null)
          .order("urgent_flag", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(24);
        reqs = (data ?? []) as NearbyRequest[];
      }

      if (!provs || provs.length === 0) {
        const { data } = await supabase
          .from("service_profiles")
          .select("user_id,business_name,category_slug,subcategory,bio,town,district,area,latitude,longitude,service_radius_km,areas_served,verified,availability,years_experience,cover_url")
          .eq("suspended", false)
          .order("verified", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(24);
        provs = (data ?? []) as NearbyProvider[];
      }

      const { data: postsRows } = await supabase
        .from("timeline_posts")
        .select("id,provider_user_id,text,category_slug,media_urls,town,district,area,created_at")
        .eq("hidden", false)
        .not("media_urls", "eq", "{}")
        .order("created_at", { ascending: false })
        .limit(8);
      const posts = (postsRows ?? []) as RecentPost[];

      if (cancelled) return;

      // Enrich providers + posts with profile names/avatars
      const ids = Array.from(new Set([
        ...(provs ?? []).map((p) => p.user_id),
        ...posts.map((p) => p.provider_user_id),
      ]));
      const profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,avatar_url")
          .in("id", ids);
        (profs ?? []).forEach((p) => profMap.set(p.id, p));
      }

      // Check if current user has a service profile (= provider role on the home feed)
      let provider = false;
      if (user) {
        const { data: sp } = await supabase
          .from("service_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        provider = !!sp;
      }

      if (cancelled) return;

      setRequests(reqs ?? []);
      setProviders(
        (provs ?? []).map((p) => ({ ...p, profile: profMap.get(p.user_id) ?? null })),
      );
      setRecent(posts.map((p) => ({ ...p, profile: profMap.get(p.provider_user_id) ?? null })));
      setIsProvider(provider);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userLoc?.latitude, userLoc?.longitude, user?.id]);

  const topRequests = useMemo(() => {
    const sorted = sortByProximity(requests, userLoc, (r) => r);
    const boosted = [...sorted].sort((a, b) => {
      const af = isFeaturedTarget(a, featured) ? 1 : 0;
      const bf = isFeaturedTarget(b, featured) ? 1 : 0;
      if (bf !== af) return bf - af;
      return (b.urgent_flag ? 1 : 0) - (a.urgent_flag ? 1 : 0);
    });
    const withinDefault = filterByRadius(boosted, userLoc, (r) => r, 20);
    return (withinDefault.length >= 3 ? withinDefault : boosted).slice(0, 6);
  }, [requests, userLoc, featured]);

  const topProviders = useMemo(() => {
    const sorted = sortByProximity(providers, userLoc, (p) => p);
    const boosted = [...sorted].sort((a, b) => {
      // verified first, then featured area
      const av = a.verified === "verified" ? 1 : 0;
      const bv = b.verified === "verified" ? 1 : 0;
      if (bv !== av) return bv - av;
      const af = isFeaturedTarget(a, featured) ? 1 : 0;
      const bf = isFeaturedTarget(b, featured) ? 1 : 0;
      return bf - af;
    });
    const withinDefault = filterByRadius(boosted, userLoc, (p) => p, 20);
    return (withinDefault.length >= 3 ? withinDefault : boosted).slice(0, 6);
  }, [providers, userLoc, featured]);

  return (
    <>
      {/* OPEN REQUESTS NEAR YOU */}
      <section className={SECTION_WRAP}>
        <SectionTitle
          title="Open requests near you"
          subtitle="See what people nearby need help with today."
          link={{ label: "Browse all", to: "/requests/browse" }}
        />
        {loading ? (
          <CardSkeletonRow />
        ) : topRequests.length === 0 ? (
          <EmptyState
            message="No open requests near you yet."
            hint="Check again soon or create the first request in your area."
            cta={{ label: "Create a Request", to: "/requests/new" }}
          />
        ) : (
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {topRequests.map((r) => (
              <RequestCard key={r.id} r={r} userLoc={userLoc} featured={Boolean(isFeaturedTarget(r, featured))} isProvider={isProvider} onRespond={() => setRespondTo(r.id)} />
            ))}
          </div>
        )}
      </section>

      {/* SKILLED PEOPLE NEAR YOU */}
      <section className={SECTION_WRAP}>
        <SectionTitle
          title="Skilled people near you"
          subtitle="Find trusted providers offering services around your area."
          link={{ label: "Browse all", to: "/services" }}
        />
        {loading ? (
          <CardSkeletonRow />
        ) : topProviders.length === 0 ? (
          <EmptyState
            message="No service providers listed near you yet."
            hint="Be the first to list your skill and get discovered."
            cta={{ label: "List Your Skill", to: "/list-skill" }}
          />
        ) : (
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {topProviders.map((p) => (
              <ProviderCard key={p.user_id} p={p} userLoc={userLoc} />
            ))}
          </div>
        )}
      </section>

      {/* RECENT WORK */}
      {(!loading && recent.length > 0) && (
        <section className={SECTION_WRAP}>
          <SectionTitle
            title="Recent work from providers"
            subtitle="See services being offered by people on Tuungane."
            link={{ label: "Open feed", to: "/feed" }}
          />
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {recent.map((p) => (
              <RecentWorkCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SectionTitle({ title, subtitle, link }: { title: string; subtitle?: string; link?: { label: string; to: string } }) {
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
        <Link to={link.to} className="hidden shrink-0 text-sm font-semibold text-navy hover:text-orange sm:inline">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

function CardSkeletonRow() {
  return (
    <div className="-mx-4 mt-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-[78%] shrink-0 sm:w-auto">
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message, hint, cta }: { message: string; hint: string; cta: { label: string; to: string } }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <p className="text-sm font-semibold text-navy">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <Link
        to={cta.to}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110"
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
  onRespond,
}: {
  r: NearbyRequest;
  userLoc: ReturnType<typeof useUserLocation>["location"];
  featured: boolean;
  isProvider: boolean;
  onRespond: () => void;
}) {
  const cat = useCategory(r.category_slug ?? undefined);
  const near = proximityLabel(userLoc, r);
  const title = r.title?.trim() || r.service_needed || "Request";
  const loc = r.area || r.town || r.district || r.location || "Uganda";
  const urg = urgencyMeta(r);

  return (
    <article
      className={`block w-[78%] shrink-0 snap-start rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-orange sm:w-auto ${
        r.urgent_flag ? "border-orange/40" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green">Open</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${urg.cls}`}>{urg.label}</span>
        {featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
            <Star className="h-3 w-3" /> Featured
          </span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">Posted {timeAgo(r.created_at)}</span>
      </div>

      <Link to="/requests/$id" params={{ id: r.id }} className="mt-2 block">
        <h3 className="line-clamp-2 font-display text-sm font-bold text-navy">{title}</h3>
        {cat && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {cat.name}{r.subcategory ? ` · ${formatSubcategory(r.subcategory)}` : ""}
          </p>
        )}
        {r.description && <p className="mt-1.5 line-clamp-2 text-xs text-foreground/80">{r.description}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {loc}</span>
          {r.budget_range && <span className="font-semibold text-orange">{r.budget_range}</span>}
          {near && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-green">
              {near}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 flex gap-2">
        <Link
          to="/requests/$id"
          params={{ id: r.id }}
          className="flex-1 rounded-full border border-border px-3 py-2 text-center text-xs font-semibold text-navy hover:border-navy"
        >
          View request
        </Link>
        {isProvider && (
          <Link
            to="/requests/$id"
            params={{ id: r.id }}
            className="inline-flex items-center justify-center gap-1 rounded-full bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground hover:brightness-110"
          >
            <Send className="h-3 w-3" /> Send quote
          </Link>
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
  const cat = useCategory(p.category_slug ?? undefined);
  const name = p.business_name || p.profile?.full_name || "Provider";
  const near = proximityLabel(userLoc, p);
  const avail = availabilityMeta(p.availability);
  const verified = p.verified === "verified";
  const avatar = p.profile?.avatar_url;

  return (
    <article className="flex w-[78%] shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-orange sm:w-auto">
      <div className="flex items-start gap-3">
        {avatar ? (
          <img src={avatar} alt={name} loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">
            {initialsOf(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-navy">{name}</h3>
            {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-green" />}
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {formatSubcategory(p.subcategory)}{cat ? ` · ${cat.name}` : ""}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {p.area || p.town || p.district || "Uganda"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${avail.cls}`}>{avail.label}</span>
        <ProfileTrustBadge kind="service_profile" id={p.user_id} size="sm" className="shrink-0" />
        {p.years_experience && p.years_experience > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-navy">
            {p.years_experience} yrs experience
          </span>
        )}
        {near && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
            {near}
          </span>
        )}
      </div>

      {p.bio && <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{p.bio}</p>}

      <div className="mt-auto pt-3 flex flex-wrap gap-2">
        <Link
          to="/u/$id"
          params={{ id: p.user_id }}
          className="flex-1 rounded-full bg-orange px-3 py-2 text-center text-xs font-semibold text-orange-foreground hover:brightness-110"
        >
          View profile
        </Link>
        <Link
          to="/requests/new"
          className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-navy hover:border-navy"
        >
          <Briefcase className="h-3 w-3" /> Request
        </Link>
        <Link
          to="/u/$id"
          params={{ id: p.user_id }}
          className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-navy hover:border-navy"
          aria-label={`Message ${name}`}
        >
          <MessageSquare className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}

function RecentWorkCard({ p }: { p: RecentPost }) {
  const cat = useCategory(p.category_slug ?? undefined);
  const name = p.profile?.full_name || "Provider";
  const img = p.media_urls?.[0];
  const loc = p.area || p.town || p.district;

  return (
    <Link
      to="/u/$id"
      params={{ id: p.provider_user_id }}
      className="block w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:border-orange sm:w-auto"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {img ? (
          <img src={img} alt={p.text.slice(0, 80)} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <UserPlus className="h-8 w-8" />
          </div>
        )}
        {cat && (
          <span className="absolute left-2 top-2 rounded-md bg-navy px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            {cat.name}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-xs text-foreground/80">{p.text}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-navy">{name}</span>
          {loc && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {loc}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
