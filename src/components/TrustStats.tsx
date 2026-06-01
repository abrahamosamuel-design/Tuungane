import { useEffect, useState } from "react";
import { Star, ShieldCheck, ThumbsUp, Users, CheckCircle2, Briefcase } from "lucide-react";
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
      if (data) setS(data as TrustStatsRow);
    })();
  }, [providerId]);

  if (!s) return null;
  const hasAny =
    s.total_verified_reviews > 0 ||
    s.completed_service_requests > 0 ||
    s.total_recommendations > 0 ||
    s.total_followers > 0;
  if (!hasAny) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold text-navy">
        <ShieldCheck className="h-4 w-4 text-green" /> Trust on Tuungane
      </h3>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Stat icon={<Star className="h-4 w-4 fill-orange text-orange" />} label="Rating" value={s.average_rating > 0 ? Number(s.average_rating).toFixed(1) : "—"} />
        <Stat icon={<ShieldCheck className="h-4 w-4 text-green" />} label="Verified reviews" value={s.total_verified_reviews} />
        <Stat icon={<CheckCircle2 className="h-4 w-4 text-navy" />} label="Completed" value={s.completed_service_requests} />
        <Stat icon={<ThumbsUp className="h-4 w-4 text-orange" />} label="Recommends" value={s.total_recommendations} />
        <Stat icon={<Users className="h-4 w-4 text-navy" />} label="Followers" value={s.total_followers} />
        <Stat icon={<Briefcase className="h-4 w-4 text-muted-foreground" />} label="Response" value={`${s.response_rate}%`} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background p-2 text-center">
      {icon}
      <span className="font-display text-base font-bold text-navy">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
