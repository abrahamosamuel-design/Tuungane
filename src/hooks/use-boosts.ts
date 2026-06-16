import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BoostType =
  | "boost_profile"
  | "feature_post"
  | "urgent_request"
  | "priority_response"
  | "feature_business_page"
  | "feature_opportunity"
  | "promote_completed_work";

export type BoostPricingRow = {
  id: string;
  boost_type: BoostType;
  label: string;
  credits_required: number;
  duration_hours: number;
  sort_order: number;
  active: boolean;
};

export type BoostRow = {
  id: string;
  user_id: string;
  boost_type: BoostType;
  entity_type: string;
  entity_id: string;
  credits_spent: number;
  status: string;
  starts_at: string;
  expires_at: string;
};

export function useBoostPricing(boostType?: BoostType) {
  const [pricing, setPricing] = useState<BoostPricingRow[]>([]);
  useEffect(() => {
    (async () => {
      let q = supabase.from("boost_pricing").select("*").eq("active", true).order("sort_order");
      if (boostType) q = q.eq("boost_type", boostType);
      const { data } = await q;
      setPricing((data ?? []) as BoostPricingRow[]);
    })();
  }, [boostType]);
  return pricing;
}

export function useActiveBoosts(entityType: string, entityId: string | null | undefined) {
  const [boosts, setBoosts] = useState<BoostRow[]>([]);
  const refresh = useCallback(async () => {
    if (!entityId) { setBoosts([]); return; }
    const { data } = await supabase
      .from("active_boosts_public" as never)
      .select("id,boost_type,entity_type,entity_id,starts_at,expires_at,status")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());
    setBoosts(((data ?? []) as unknown) as BoostRow[]);
  }, [entityType, entityId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { boosts, refresh, has: (t: BoostType) => boosts.some((b) => b.boost_type === t) };
}

export async function activateBoost(pricingId: string, entityType: string, entityId: string) {
  const { data, error } = await supabase.rpc("create_boost", {
    _pricing_id: pricingId,
    _entity_type: entityType,
    _entity_id: entityId,
  });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("boost_requires_verification")) {
      throw new Error("Boosts are currently limited to verified profiles. Request verification from your profile to unlock boosting.");
    }
    if (msg.includes("profile_suspended")) {
      throw new Error("This profile is suspended and cannot be boosted. Contact support for help.");
    }
    throw error;
  }
  return data as string;
}
