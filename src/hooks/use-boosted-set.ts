import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BoostType } from "@/hooks/use-boosts";

/**
 * Fetch the set of entity IDs (of a given entity_type) that have an active
 * boost of any of the requested boost types. Used to softly float boosted
 * items to the top of discovery lists — trust/recency still wins inside
 * each bucket, boosts only decide which bucket you land in.
 */
export function useBoostedSet(entityType: string, boostTypes: BoostType[]) {
  const key = boostTypes.slice().sort().join(",");
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (boostTypes.length === 0) { setIds(new Set()); setLoaded(true); return; }
      const { data } = await supabase
        .from("boosts")
        .select("entity_id")
        .eq("entity_type", entityType)
        .in("boost_type", boostTypes)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());
      if (cancelled) return;
      setIds(new Set((data ?? []).map((b) => b.entity_id)));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, key]);

  return { ids, loaded, has: (id: string) => ids.has(id) };
}
