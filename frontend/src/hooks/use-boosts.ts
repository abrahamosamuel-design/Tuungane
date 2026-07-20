import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

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
      try {
        const { data } = await apiClient(`/credits/boost-pricing${boostType ? `?type=${boostType}` : ""}`);
        setPricing((data?.data ?? []) as BoostPricingRow[]);
      } catch (err) {
        console.error("Failed to fetch boost pricing", err);
      }
    })();
  }, [boostType]);
  return pricing;
}

export function useActiveBoosts(entityType: string, entityId: string | null | undefined) {
  const [boosts, setBoosts] = useState<BoostRow[]>([]);
  const refresh = useCallback(async () => {
    if (!entityId) { setBoosts([]); return; }
    try {
      const { data } = await apiClient(`/credits/active-boosts?entity_type=${entityType}&entity_id=${entityId}`);
      setBoosts(((data?.data ?? []) as unknown) as BoostRow[]);
    } catch (err) {
      console.error("Failed to fetch active boosts", err);
    }
  }, [entityType, entityId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { boosts, refresh, has: (t: BoostType) => boosts.some((b) => b.boost_type === t) };
}

export async function activateBoost(pricingId: string, entityType: string, entityId: string) {
  try {
    const { data } = await apiClient.post("/credits/activate-boost", {
      pricingId,
      entityType,
      entityId,
    });
    return data.data as string;
  } catch (error: any) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("requires_verification")) {
      throw new Error("Boosts are currently limited to verified profiles. Request verification from your profile to unlock boosting.");
    }
    if (msg.includes("suspended")) {
      throw new Error("This profile is suspended and cannot be boosted. Contact support for help.");
    }
    if (msg.includes("insufficient")) {
      throw new Error("Insufficient credits");
    }
    throw error;
  }
}
