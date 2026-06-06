import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, ArrowRight, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { urgencyOptions, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { timeAgo } from "@/lib/format";
import { useUserLocation } from "@/hooks/use-user-location";
import { useFeaturedLocations, isFeaturedTarget } from "@/hooks/use-featured-locations";
import { proximityScore, type TargetLocation } from "@/lib/location";
import { NearYouBadge } from "@/components/NearYouBadge";

const targetOf = (r: ServiceRequestRow): TargetLocation => ({
  district: r.district,
  town: r.town,
  area: r.area,
});

export function MatchingRequestsSection() {
  const { user } = useAuth();
  const [items, setItems] = useState<ServiceRequestRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { has: isBoostedReq } = useBoostedSet("service_request", ["urgent_request"]);
  const { location: userLoc } = useUserLocation();
  const { locations: featured } = useFeaturedLocations();

  const sorted = [...items].sort((a, b) => {
    const fa = isFeaturedTarget(targetOf(a), featured, a.category_slug) ? 1 : 0;
    const fb = isFeaturedTarget(targetOf(b), featured, b.category_slug) ? 1 : 0;
    const boostA = Number(isBoostedReq(a.id));
    const boostB = Number(isBoostedReq(b.id));
    const scoreA = boostA * 200 + fa * 100 + (userLoc ? proximityScore(userLoc, targetOf(a)) : 0);
    const scoreB = boostB * 200 + fb * 100 + (userLoc ? proximityScore(userLoc, targetOf(b)) : 0);
    return scoreB - scoreA;
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("matching_requests_for_provider", { _provider: user.id });
      if (!error && data) setItems(data as ServiceRequestRow[]);
      setLoaded(true);
    })();
  }, [user]);

  if (!user || !loaded) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-navy/10 p-2 text-navy"><Briefcase className="h-4 w-4" /></div>
          <h2 className="font-display text-lg font-bold text-navy">Matching service requests</h2>
        </div>
        <Link to="/services/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline">Open feed <ArrowRight className="h-3 w-3" /></Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <p>No matching requests right now.</p>
          <p className="mt-2 text-xs">Update your category or service areas so customers can find you. <Link to="/me" className="font-semibold text-orange hover:underline">Edit profile</Link></p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {sorted.slice(0, 5).map((r) => {
            const urg = urgencyOptions.find((u) => u.value === r.urgency)?.label ?? r.urgency;
            const boosted = isBoostedReq(r.id);
            const target = targetOf(r);
            const feat = isFeaturedTarget(target, featured, r.category_slug);
            return (
              <Link key={r.id} to="/requests/$id" params={{ id: r.id }} className={`flex items-center justify-between gap-3 rounded-xl border p-3 hover:border-orange ${boosted ? "border-orange/60 bg-orange/5" : "border-border"}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{r.title || r.service_needed}</p>
                  <p className="truncate text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.town ?? r.location} · {timeAgo(r.created_at)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {userLoc && <NearYouBadge user={userLoc} target={target} />}
                    {feat && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
                        <Star className="h-3 w-3" /> Featured area
                      </span>
                    )}
                  </div>
                </div>
                {boosted && <span className="shrink-0 rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase text-orange">Urgent</span>}
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-navy">{urg}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
