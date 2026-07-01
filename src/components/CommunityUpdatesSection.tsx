import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Heart, MessageCircle, BadgeCheck, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserLocation } from "@/hooks/use-user-location";
import { proximityLabel, sortByProximity } from "@/lib/location";
import { timeAgo } from "@/lib/format";
import { FeedAvatar } from "@/components/feed/FeedAvatar";
import { postTypeMap, type PostTypeValue } from "@/data/postTypes";
import { useCategory } from "@/hooks/use-categories";

// Post types acceptable for homepage community updates.
const ALLOWED_TYPES: PostTypeValue[] = [
  "work_update",
  "available",
  "new_service",
  "completed_job",
  "before_after",
  "opportunity_shared",
];

type CUPost = {
  id: string;
  provider_user_id: string;
  text: string | null;
  category_slug: string | null;
  location: string | null;
  media_urls: string[] | null;
  featured: boolean;
  created_at: string;
  post_type: PostTypeValue | null;
  district: string | null;
  town: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  author?: { full_name: string; avatar_url: string | null } | null;
  is_provider?: boolean;
  is_verified?: boolean;
  likes?: number;
  comments?: number;
};

// Bare-bones phone-like sequence detector (7+ consecutive digits, tolerating spaces/dashes)
const PHONE_RE = /(?:\+?\d[\s\-().]?){7,}\d/;

// Very light quality filter — drop tiny/empty posts w/ no media.
function isQuality(p: CUPost) {
  const text = (p.text ?? "").trim();
  const hasMedia = (p.media_urls ?? []).length > 0;
  if (!text && !hasMedia) return false;
  if (text && text.length < 12 && !hasMedia) return false;
  if (PHONE_RE.test(text)) return false;
  return true;
}

export function CommunityUpdatesSection() {
  const { location: userLoc } = useUserLocation();
  const [posts, setPosts] = useState<CUPost[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("timeline_posts")
        .select("id,provider_user_id,text,category_slug,location,media_urls,featured,created_at,post_type,district,town,area,latitude,longitude")
        .eq("hidden", false)
        .in("post_type", ALLOWED_TYPES as unknown as never)
        .order("created_at", { ascending: false })
        .limit(40);

      const raw = ((data ?? []) as CUPost[]).filter(isQuality);
      if (!raw.length) { if (!cancelled) setPosts([]); return; }

      const ids = Array.from(new Set(raw.map((p) => p.provider_user_id)));
      const [{ data: profs }, { data: sps }, { data: pps }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url,is_provider").in("id", ids),
        supabase.from("service_profiles").select("user_id,business_name,verified,suspended,cover_url").in("user_id", ids),
        supabase.from("public_profiles").select("owner_id,name,avatar_url,cover_url,verified").in("owner_id", ids),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const spMap = new Map((sps ?? []).map((s: any) => [s.user_id, s]));
      const ppMap = new Map((pps ?? []).filter((p: any) => p.owner_id).map((p: any) => [p.owner_id, p]));

      // Fetch like/comment counts in parallel per post (cheap for ~40).
      const counts = await Promise.all(
        raw.map(async (p) => {
          const [{ count: lc }, { count: cc }] = await Promise.all([
            supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", p.id).eq("hidden", false),
          ]);
          return { id: p.id, likes: lc ?? 0, comments: cc ?? 0 };
        })
      );
      const countMap = new Map(counts.map((c) => [c.id, c]));

      const enriched: CUPost[] = raw
        .map((p) => {
          const prof = profMap.get(p.provider_user_id) as any;
          const sp = spMap.get(p.provider_user_id) as any;
          const pp = ppMap.get(p.provider_user_id) as any;
          if (sp?.suspended) return null;
          const c = countMap.get(p.id);
          const fullName =
            sp?.business_name ||
            pp?.name ||
            prof?.full_name ||
            "Service Provider";
          const avatar = prof?.avatar_url || pp?.avatar_url || pp?.cover_url || sp?.cover_url || null;
          const isProvider = !!prof?.is_provider || !!sp || !!pp;
          const isVerified = sp?.verified === "verified" || pp?.verified === "verified";
          return {
            ...p,
            author: { full_name: fullName, avatar_url: avatar },
            is_provider: isProvider,
            is_verified: isVerified,
            likes: c?.likes ?? 0,
            comments: c?.comments ?? 0,
          } as CUPost;
        })
        .filter(Boolean) as CUPost[];

      if (!cancelled) setPosts(enriched);
    })();
    return () => { cancelled = true; };
  }, []);

  const top = useMemo(() => {
    if (!posts) return [];
    const withLoc = posts.map((p) => ({
      ...p,
      _loc: {
        district: p.district,
        town: p.town,
        area: p.area,
        latitude: p.latitude,
        longitude: p.longitude,
      },
    }));
    const sorted = sortByProximity(withLoc, userLoc, (p) => p._loc);
    // Newest first, tiebreak by id for stability.
    const ranked = [...sorted].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (tb !== ta) return tb - ta;
      return a.id < b.id ? 1 : -1;
    });
    return ranked.slice(0, 10);
  }, [posts, userLoc]);


  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const pausedUntilRef = useRef(0);
  const RESUME_DELAY = 7000;

  const pauseInteraction = () => {
    pausedUntilRef.current = Date.now() + RESUME_DELAY;
  };

  // Track active card via scroll position (for dots)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || top.length === 0) return;
    const onScroll = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-cu-card]"));
      if (!cards.length) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const cCenter = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(cCenter - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActiveIdx(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [top.length]);

  // Auto-scroll every 4s, pause on interaction, respect reduced-motion
  useEffect(() => {
    if (top.length < 2) return;
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;
    const el = scrollerRef.current;
    if (!el) return;

    const id = window.setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-cu-card]"));
      if (!cards.length) return;
      // If near end, loop back to start.
      const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (nearEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const next = Math.min(activeIdx + 1, cards.length - 1);
      const target = cards[next];
      if (target) {
        el.scrollTo({ left: target.offsetLeft - 16, behavior: "smooth" });
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [top.length, activeIdx]);

  if (posts === null) return null;
  if (top.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-navy sm:text-xl">
            Community updates
            <span className="mt-1 block h-1 w-10 rounded-full bg-green/80" />
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            See what people and providers are sharing on Tuungane.
          </p>
        </div>
        <Link to="/feed" className="shrink-0 text-sm font-semibold text-navy hover:text-orange">
          View all →
        </Link>
      </div>

      <div
        ref={scrollerRef}
        onPointerDown={pauseInteraction}
        onTouchStart={pauseInteraction}
        onMouseEnter={pauseInteraction}
        onFocusCapture={pauseInteraction}
        onWheel={pauseInteraction}
        className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {top.map((p) => (
          <div key={p.id} data-cu-card className="w-[85vw] max-w-[340px] shrink-0 snap-start sm:w-[320px]">
            <CommunityCard p={p} userLoc={userLoc} />
          </div>
        ))}
        <div aria-hidden className="shrink-0 w-1" />
      </div>

      {top.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
          {top.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? "w-4 bg-orange" : "w-1.5 bg-navy/20"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}


function CommunityCard({ p, userLoc }: { p: CUPost; userLoc: ReturnType<typeof useUserLocation>["location"] }) {
  const cat = useCategory(p.category_slug ?? undefined);
  const near = proximityLabel(userLoc, {
    district: p.district,
    town: p.town,
    area: p.area,
    latitude: p.latitude,
    longitude: p.longitude,
  });
  const authorName = p.author?.full_name || "Member";
  const loc = p.area || p.town || p.district || p.location || null;
  const typeMeta = p.post_type ? postTypeMap[p.post_type] : null;
  const firstImg = (p.media_urls ?? []).find((u) => u && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) || null;
  const isServiceLike = p.post_type === "available" || p.post_type === "new_service" || p.post_type === "completed_job";

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:border-orange">
      <div className="flex items-start gap-3 p-4 pb-2">
        <Link to="/u/$id" params={{ id: p.provider_user_id }} className="shrink-0">
          <FeedAvatar src={p.author?.avatar_url ?? null} name={authorName} size={40} ring={p.is_verified} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5">
            <Link to="/u/$id" params={{ id: p.provider_user_id }} className="truncate text-[14px] font-semibold text-navy hover:underline">
              {authorName}
            </Link>
            {p.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-green" aria-label="Verified" /> : null}
          </div>
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            {loc ? (<><MapPin className="h-3 w-3" /> {loc}{near ? <span className="ml-1 rounded-full bg-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-green">{near}</span> : null} · </>) : null}
            {timeAgo(p.created_at)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-4">
        {typeMeta && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeMeta.color}`}>
            {typeMeta.label}
          </span>
        )}
        {cat && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-navy">{cat.name}</span>
        )}
      </div>

      {p.text ? (
        <Link to="/u/$id" params={{ id: p.provider_user_id }} className="block px-4 pt-2">
          <p className="line-clamp-2 text-sm text-navy/90">{p.text}</p>
        </Link>
      ) : null}

      <Link
        to="/u/$id"
        params={{ id: p.provider_user_id }}
        className="mt-3 block aspect-[16/9] w-full overflow-hidden bg-navy/5"
      >
        {firstImg ? (
          <img
            src={firstImg}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-center"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = "none";
              const parent = img.parentElement;
              if (parent) parent.classList.add("cu-fallback");
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy/90 via-navy to-green/70 text-white">
            <span className="font-display text-base font-bold tracking-wide">Tuungane</span>
          </div>
        )}
      </Link>

      {((p.likes ?? 0) > 0 || (p.comments ?? 0) > 0) && (
        <div className="flex items-center gap-3 px-4 pt-2 text-[11px] text-muted-foreground">
          {(p.likes ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likes}</span>
          )}
          {(p.comments ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {p.comments}</span>
          )}
        </div>
      )}


      <div className="mt-auto flex items-center gap-2 border-t border-border bg-surface px-3 py-2.5">
        <Link
          to="/u/$id"
          params={{ id: p.provider_user_id }}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground hover:brightness-110"
        >
          View post
        </Link>
        {p.is_provider && (
          <Link
            to="/u/$id"
            params={{ id: p.provider_user_id }}
            className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-navy hover:border-navy"
          >
            View profile
          </Link>
        )}
        {isServiceLike && (
          <Link
            to="/requests/new"
            search={{ providerId: p.provider_user_id } as never}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-navy hover:border-navy"
            aria-label="Request service"
          >
            <Briefcase className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}
