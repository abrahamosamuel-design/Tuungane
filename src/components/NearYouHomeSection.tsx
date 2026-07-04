import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, ArrowRight, ClipboardList, BadgeCheck, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserLocation } from "@/hooks/use-user-location";
import { filterByRadius, proximityLabel, sortByProximity } from "@/lib/location";
import { useFeaturedLocations, isFeaturedTarget } from "@/hooks/use-featured-locations";
import { timeAgo } from "@/lib/format";
import { ProfileTrustBadge } from "@/components/trust/ProfileTrustBadge";
import { formatSubcategory } from "@/lib/format-category";


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
};

type NearbyProvider = {
  user_id: string;
  business_name: string | null;
  subcategory: string;
  town: string | null;
  district: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number | null;
  areas_served: string[] | null;
  verified: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
};

export function NearYouHomeSection() {
  const { location: userLoc } = useUserLocation();
  const { locations: featured } = useFeaturedLocations();
  const [requests, setRequests] = useState<NearbyRequest[]>([]);
  const [providers, setProviders] = useState<NearbyProvider[]>([]);
  const [loading, setLoading] = useState(true);

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
        const { data: rpcReqs } = await supabase.rpc("nearby_service_requests", {
          in_lat: lat,
          in_lng: lng,
          in_radius_km: 50,
          in_limit: 20,
        });
        reqs = (rpcReqs ?? null) as NearbyRequest[] | null;
        // Providers load from public_profiles below (RPC targets legacy table).
      }


      // Fallback (no coords, or RPC returned nothing): recent activity, text-hierarchy ranking client-side.
      const [{ data: rRows }, { data: pRows }, { data: spRowsRaw }] = await Promise.all([
        reqs
          ? Promise.resolve({ data: reqs })
          : supabase
              .from("service_requests")
              .select("id,title,service_needed,description,budget_range,urgent_flag,created_at,district,town,area,location")
              .eq("visibility", "public")
              .eq("status", "requested")
              .is("provider_id", null)
              .order("created_at", { ascending: false })
              .limit(40),
        supabase
          .from("public_profiles")
          .select("id,owner_id,name,subcategory,town,district,area,service_radius_km,areas_served,verified")
          .eq("suspended", false)
          .not("owner_id", "is", null)
          .order("updated_at", { ascending: false })
          .limit(40),
        supabase
          .from("service_profiles")
          .select("user_id,business_name,subcategory,town,district,area,service_radius_km,areas_served,verified")
          .eq("suspended", false)
          .order("updated_at", { ascending: false })
          .limit(40),
      ]);
      const rRaw = (rRows ?? []) as Array<NearbyRequest & { id: string }>;
      const pRaw = (pRows ?? []) as Array<{ id: string; owner_id: string; name: string; [k: string]: unknown }>;
      const spRaw = (spRowsRaw ?? []) as Array<{ user_id: string; business_name: string | null; [k: string]: unknown }>;
      const ppOwners = new Set(pRaw.map((r) => r.owner_id));
      const spNew = spRaw.filter((r) => !ppOwners.has(r.user_id));

      // Coordinates are gated at DB level — fetch via security-definer RPCs.
      const [{ data: reqCoords }, { data: provCoords }, { data: spCoords }] = await Promise.all([
        rRaw.length ? supabase.rpc("get_service_request_coords", { _ids: rRaw.map((r) => r.id) }) : Promise.resolve({ data: [] as Array<{ id: string; latitude: number | null; longitude: number | null }> }),
        pRaw.length ? supabase.rpc("get_public_profile_coords", { _ids: pRaw.map((r) => r.id) }) : Promise.resolve({ data: [] as Array<{ id: string; latitude: number | null; longitude: number | null }> }),
        spNew.length ? supabase.rpc("get_service_profile_coords", { _ids: spNew.map((r) => r.user_id) }) : Promise.resolve({ data: [] as Array<{ user_id: string; latitude: number | null; longitude: number | null }> }),
      ]);
      const reqCoordMap = new Map(((reqCoords ?? []) as Array<{ id: string; latitude: number | null; longitude: number | null }>).map((c) => [c.id, c]));
      const provCoordMap = new Map(((provCoords ?? []) as Array<{ id: string; latitude: number | null; longitude: number | null }>).map((c) => [c.id, c]));
      const spCoordMap = new Map(((spCoords ?? []) as Array<{ user_id: string; latitude: number | null; longitude: number | null }>).map((c) => [c.user_id, c]));

      reqs = rRaw.map((r) => ({ ...r, latitude: reqCoordMap.get(r.id)?.latitude ?? null, longitude: reqCoordMap.get(r.id)?.longitude ?? null }));
      const ppProvs = pRaw.map((r) => ({
        ...r,
        user_id: r.owner_id,
        business_name: r.name,
        latitude: provCoordMap.get(r.id)?.latitude ?? null,
        longitude: provCoordMap.get(r.id)?.longitude ?? null,
      }));
      const spProvs = spNew.map((r) => ({
        ...r,
        latitude: spCoordMap.get(r.user_id)?.latitude ?? null,
        longitude: spCoordMap.get(r.user_id)?.longitude ?? null,
      }));
      provs = [...ppProvs, ...spProvs] as unknown as NearbyProvider[];


      if (cancelled) return;
      const provIds = (provs ?? []).map((p) => p.user_id);
      const profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (provIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", provIds);
        (profs ?? []).forEach((p) => profMap.set(p.id, p));
      }
      setRequests(reqs ?? []);
      setProviders(
        (provs ?? []).map((p: NearbyProvider) => ({ ...p, profile: profMap.get(p.user_id) ?? null })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userLoc?.latitude, userLoc?.longitude]);


  const topRequests = useMemo(() => {
    const sorted = sortByProximity(requests, userLoc, (r) => r);
    // Featured-location boost: items in featured locations float to the top of the list.
    const boosted = [...sorted].sort((a, b) => {
      const af = isFeaturedTarget(a, featured) ? 1 : 0;
      const bf = isFeaturedTarget(b, featured) ? 1 : 0;
      return bf - af;
    });
    const withinDefault = filterByRadius(boosted, userLoc, (r) => r, 20);
    return (withinDefault.length >= 2 ? withinDefault : boosted).slice(0, 3);
  }, [requests, userLoc, featured]);

  const expandedRequests = userLoc && requests.length > 0 && topRequests.length > 0 &&
    filterByRadius(requests, userLoc, (r) => r, 20).length < 2;

  const topProviders = useMemo(() => {
    const sorted = sortByProximity(providers, userLoc, (p) => p);
    const boosted = [...sorted].sort((a, b) => {
      const af = isFeaturedTarget(a, featured) ? 1 : 0;
      const bf = isFeaturedTarget(b, featured) ? 1 : 0;
      return bf - af;
    });
    const withinDefault = filterByRadius(boosted, userLoc, (p) => p, 20);
    return (withinDefault.length >= 2 ? withinDefault : boosted).slice(0, 3);
  }, [providers, userLoc, featured]);

  if (loading) return null;

  const hasAnything = topRequests.length > 0 || topProviders.length > 0;
  if (!hasAnything) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-navy sm:text-xl">Near you</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {userLoc
              ? "Open requests and trusted providers close to your location."
              : "Set your location in Settings to see results near you. Showing recent activity."}
          </p>
        </div>
        <Link to="/requests/browse" className="hidden text-sm font-semibold text-navy hover:text-orange sm:inline">
          See all →
        </Link>
      </div>

      {expandedRequests && (
        <p className="mt-3 rounded-xl border border-orange/30 bg-orange/5 px-3 py-2 text-xs text-foreground/80">
          Not many results in your area yet. Showing nearby results.
        </p>
      )}

      {topRequests.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-navy/70">Open requests</h3>
          <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {topRequests.map((r) => {
              const near = proximityLabel(userLoc, r);
              const title = r.title?.trim() || r.service_needed || "Request";
              const loc = r.area || r.town || r.district || r.location || "Uganda";
              const feat = isFeaturedTarget(r, featured);
              return (
                <Link
                  to="/requests/$id"
                  params={{ id: r.id }}
                  key={r.id}
                  className="block w-[78%] shrink-0 snap-start rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-orange sm:w-auto sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    {r.urgent_flag ? (
                      <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[11px] font-semibold text-orange">Urgent</span>
                    ) : (
                      <span className="rounded-full bg-green/15 px-2 py-0.5 text-[11px] font-semibold text-green">Open</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </div>
                  <h4 className="mt-2 line-clamp-2 text-sm font-bold text-navy">{title}</h4>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {loc}
                  </p>
                  {r.budget_range && (
                    <p className="mt-1 text-xs font-semibold text-orange">{r.budget_range}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {near && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
                        <MapPin className="h-3 w-3" /> {near}
                      </span>
                    )}
                    {feat && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
                        <Star className="h-3 w-3" /> Featured area
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {topProviders.length > 0 && (
        <>
          <h3 className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-navy/70">
            <span>Skilled providers near you</span>
            <Link to="/services" className="text-[11px] font-semibold normal-case tracking-normal text-navy hover:text-orange">
              See all <ArrowRight className="inline h-3 w-3" />
            </Link>
          </h3>
          <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {topProviders.map((p) => {
              const near = proximityLabel(userLoc, p);
              const name = p.business_name || p.profile?.full_name || "Provider";
              const feat = isFeaturedTarget(p, featured);
              return (
                <Link
                  to="/u/$id"
                  params={{ id: p.user_id }}
                  key={p.user_id}
                  className="block w-[78%] shrink-0 snap-start rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-orange sm:w-auto sm:p-5"
                >
                  <div className="flex flex-wrap items-start gap-x-1.5 gap-y-1">
                    <h4 className="min-w-0 flex-1 text-sm font-bold leading-tight text-navy line-clamp-2">{name}</h4>
                    <ProfileTrustBadge kind="service_profile" id={p.user_id} size="sm" descriptive className="shrink-0" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatSubcategory(p.subcategory)}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.area || p.town || p.district || "Uganda"}

                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {near && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
                        <MapPin className="h-3 w-3" /> {near}
                      </span>
                    )}
                    {feat && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
                        <Star className="h-3 w-3" /> Featured area
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110"
        >
          <ClipboardList className="h-4 w-4" /> Post a service request
        </Link>
        <Link to="/services" className="text-sm font-semibold text-navy hover:text-orange">
          Browse providers <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
