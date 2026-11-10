// Batch-fetch trust levels for a set of profiles (service_profile or business_page).
// Returns a Map keyed by profile_id → effective trust level (manual_level || auto_level).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TrustLevel } from "@/components/trust/TrustBadge";

export type ProfileKind = "service_profile" | "business_page";

export function useTrustBadges(kind: ProfileKind, ids: Array<string | null | undefined>) {
  const clean = Array.from(new Set(ids.filter((v): v is string => !!v))).sort();
  const key = clean.join(",");
  return useQuery({
    queryKey: ["trust-badges", kind, key],
    enabled: clean.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_trust_status")
        .select("profile_id,manual_level,auto_level")
        .eq("profile_kind", kind)
        .in("profile_id", clean);
      if (error) throw error;
      const map = new Map<string, TrustLevel>();
      for (const row of data ?? []) {
        map.set(row.profile_id as string, ((row.manual_level as TrustLevel | null) ?? (row.auto_level as TrustLevel | null) ?? "new"));
      }
      return map;
    },
  });
}

export function useTrustBadge(kind: ProfileKind, id: string | null | undefined) {
  const q = useTrustBadges(kind, [id]);
  return { ...q, level: id ? q.data?.get(id) ?? null : null };
}
