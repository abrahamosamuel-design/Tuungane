import { Sparkles, Flame, Zap, Star, Rocket, Trophy } from "lucide-react";
import type { BoostType } from "@/hooks/use-boosts";

const map: Record<BoostType, { label: string; cls: string; Icon: typeof Sparkles }> = {
  boost_profile:          { label: "Boosted",            cls: "bg-orange/15 text-orange",      Icon: Sparkles },
  feature_post:           { label: "Featured",           cls: "bg-orange/15 text-orange",      Icon: Star },
  urgent_request:         { label: "Urgent",             cls: "bg-destructive/15 text-destructive", Icon: Flame },
  priority_response:      { label: "Priority response",  cls: "bg-navy/15 text-navy",          Icon: Zap },
  feature_business_page:  { label: "Featured business",  cls: "bg-orange/15 text-orange",      Icon: Trophy },
  feature_opportunity:    { label: "Featured",           cls: "bg-orange/15 text-orange",      Icon: Star },
  promote_completed_work: { label: "Promoted",           cls: "bg-green/15 text-green",        Icon: Rocket },
};

export function BoostBadge({ type }: { type: BoostType }) {
  const cfg = map[type];
  if (!cfg) return null;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}
