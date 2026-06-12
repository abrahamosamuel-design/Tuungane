import { useEffect, useState } from "react";
import { Star, ShieldCheck, ThumbsUp, Users, CheckCircle2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TrustStatsRow } from "@/data/serviceRequestTypes";

export function TrustStats({ providerId }: { providerId: string }) {
  const [s, setS] = useState<TrustStatsRow | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("provider_trust_stats")
        .select("*")
        .eq("provider_id", providerId)
        .maybeSingle();
      setS((data ?? null) as TrustStatsRow | null);
    })();
  }, [providerId]);

  const hasAny =
    !!s && (
      s.total_verified_reviews > 0 ||
      s.completed_service_requests > 0 ||
      s.total_recommendations > 0 ||
      s.total_followers > 0
    );

  const rating = s && s.average_rating > 0 ? Number(s.average_rating).toFixed(1) : null;
  const completed = s?.completed_service_requests ?? 0;
  const responseLabel = s && completed >= 3
    ? `${s.response_rate}%`
    : "New";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-navy">
          <ShieldCheck className="h-4 w-4 text-green" /> Trust on Tuungane
        </h3>
        {!hasAny && (
          <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">New provider</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        <Stat
          icon={<Star className="h-4 w-4 fill-orange text-orange" />}
          label="Rating"
          value={rating ?? "New"}
          muted={!rating}
        />
        <Stat
          icon={<ShieldCheck className="h-4 w-4 text-green" />}
          label="Verified reviews"
          value={s?.total_verified_reviews ?? 0}
        />
        <Stat
          icon={<CheckCircle2 className="h-4 w-4 text-navy" />}
          label="Completed"
          value={completed}
        />
        <Stat
          icon={<ThumbsUp className="h-4 w-4 text-orange" />}
          label="Recommendations"
          value={s?.total_recommendations ?? 0}
        />
        <Stat
          icon={<Users className="h-4 w-4 text-navy" />}
          label="Followers"
          value={s?.total_followers ?? 0}
        />
        <Stat
          icon={<Zap className="h-4 w-4 text-muted-foreground" />}
          label="Response"
          value={responseLabel}
          muted={completed < 3}
        />
      </div>
    </div>
  );
}

function Stat({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: number | string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background p-2 text-center">
      {icon}
      <span className={`font-display text-base font-bold ${muted ? "text-muted-foreground" : "text-navy"}`}>{value}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}
