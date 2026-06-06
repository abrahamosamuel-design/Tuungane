import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, ArrowRight, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { urgencyOptions, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { timeAgo } from "@/lib/format";
import { useUserLocation } from "@/hooks/use-user-location";
import { useFeaturedLocations, isFeaturedTarget } from "@/hooks/use-featured-locations";
import { proximityScore, haversineKm, type TargetLocation } from "@/lib/location";
import { NearYouBadge } from "@/components/NearYouBadge";
import { RadiusFilter, RADIUS_OPTIONS } from "@/components/RadiusFilter";
import { useOnlineStatus } from "@/components/OfflineBanner";

const targetOf = (r: ServiceRequestRow): TargetLocation => ({
  district: r.district,
  town: r.town,
  area: r.area,
});

const DEFAULT_RADIUS = 10;
const MEM_TTL = 60_000; // 1 min — fresh, no refetch
const DISK_TTL = 10 * 60_000; // 10 min — instant render after refresh, then revalidate

type CacheEntry = { at: number; rows: ServiceRequestRow[] };
const _mem = new Map<string, CacheEntry>();
const storageKey = (uid: string) => `tuungane:matching_requests:${uid}`;

function readDisk(uid: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.at || !Array.isArray(parsed.rows)) return null;
    if (Date.now() - parsed.at > DISK_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDisk(uid: string, entry: CacheEntry) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(entry));
  } catch {
    // Quota or private mode — non-fatal.
  }
}

function readCache(uid: string): CacheEntry | null {
  return _mem.get(uid) ?? readDisk(uid);
}

export function MatchingRequestsSection() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [items, setItems] = useState<ServiceRequestRow[]>(() => {
    if (!user) return [];
    return readCache(user.id)?.rows ?? [];
  });
  const [cachedAt, setCachedAt] = useState<number | null>(() => {
    if (!user) return null;
    return readCache(user.id)?.at ?? null;
  });
  const [loaded, setLoaded] = useState(() => {
    if (!user) return false;
    return !!readCache(user.id);
  });
  const [radius, setRadius] = useState<number | null>(DEFAULT_RADIUS);
  const { has: isBoostedReq } = useBoostedSet("service_request", ["urgent_request"]);
  const { location: userLoc } = useUserLocation();
  const { locations: featured } = useFeaturedLocations();

  useEffect(() => {
    if (!user) return;
    const cached = readCache(user.id);
    if (cached) {
      setItems(cached.rows);
      setCachedAt(cached.at);
      setLoaded(true);
      if (Date.now() - cached.at < MEM_TTL) return;
    }
    // Skip network when offline — render whatever cache we have.
    if (!online) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("matching_requests_for_provider", { _provider: user.id });
        if (cancelled) return;
        if (!error && data) {
          const rows = data as ServiceRequestRow[];
          const entry: CacheEntry = { at: Date.now(), rows };
          _mem.set(user.id, entry);
          writeDisk(user.id, entry);
          setItems(rows);
          setCachedAt(entry.at);
        }
      } catch {
        // Network blew up mid-request — keep cached items visible.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, online]);

  // Annotate each item once per data change — avoids recomputing on radius changes.
  const annotated = useMemo(() => {
    return items.map((r) => {
      const t = targetOf(r);
      const km = userLoc ? haversineKm(userLoc, t) : null;
      const feat = isFeaturedTarget(t, featured, r.category_slug);
      const score = (userLoc ? proximityScore(userLoc, t) : 0) + (feat ? 100 : 0);
      return { r, t, km, feat, score };
    });
  }, [items, userLoc, featured]);

  // Filter + sort recompute only when radius / boost set / annotations change. No network hit.
  const sorted = useMemo(() => {
    const userTown = userLoc?.town || userLoc?.city || null;
    const within = annotated.filter(({ km, t }) => {
      if (!userLoc || radius == null) return true;
      if (km != null) return km <= radius;
      if (userLoc.area && t.area && userLoc.area === t.area) return true;
      if (radius <= 5) return false;
      if (userTown && t.town && userTown === t.town) return true;
      if (radius <= 20) return false;
      if (userLoc.district && t.district && userLoc.district === t.district) return true;
      return false;
    });
    return within
      .sort((a, b) => {
        const ba = Number(isBoostedReq(a.r.id));
        const bb = Number(isBoostedReq(b.r.id));
        return bb * 200 + b.score - (ba * 200 + a.score);
      })
      .slice(0, 5);
  }, [annotated, radius, userLoc, isBoostedReq]);

  const expandRadius = () => {
    const radii = RADIUS_OPTIONS.map((o) => o.km).filter((k): k is number => k !== null);
    if (radius === null) return;
    const next = radii.find((k) => k > radius);
    setRadius(next ?? null);
  };

  if (!user || !loaded) return null;

  const empty = sorted.length === 0;
  const filteredOut = empty && items.length > 0 && userLoc && radius !== null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-navy/10 p-2 text-navy"><Briefcase className="h-4 w-4" /></div>
          <h2 className="font-display text-lg font-bold text-navy">Matching service requests</h2>
        </div>
        <Link to="/services/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline">Open feed <ArrowRight className="h-3 w-3" /></Link>
      </div>
      {userLoc && (
        <div className="mt-3">
          <RadiusFilter value={radius} onChange={setRadius} />
        </div>
      )}
      {empty ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          {filteredOut ? (
            <>
              <p>Not many results in your area yet. Showing nearby results.</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button onClick={expandRadius} className="rounded-full bg-orange px-3 py-1 text-xs font-semibold text-orange-foreground hover:bg-orange/90">
                  Expand radius
                </button>
                <button onClick={() => setRadius(null)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-navy hover:bg-muted">
                  Show all
                </button>
              </div>
            </>
          ) : (
            <>
              <p>No matching requests right now.</p>
              <p className="mt-2 text-xs">Update your category or service areas so customers can find you. <Link to="/me" className="font-semibold text-orange hover:underline">Edit profile</Link></p>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {sorted.map(({ r, t, feat }) => {
            const urg = urgencyOptions.find((u) => u.value === r.urgency)?.label ?? r.urgency;
            const boosted = isBoostedReq(r.id);
            return (
              <Link key={r.id} to="/requests/$id" params={{ id: r.id }} className={`flex items-center justify-between gap-3 rounded-xl border p-3 hover:border-orange ${boosted ? "border-orange/60 bg-orange/5" : "border-border"}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{r.title || r.service_needed}</p>
                  <p className="truncate text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.town ?? r.location} · {timeAgo(r.created_at)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {userLoc && <NearYouBadge user={userLoc} target={t} />}
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
