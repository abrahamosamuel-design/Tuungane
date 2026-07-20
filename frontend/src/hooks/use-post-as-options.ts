import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

export type PostAsOption = {
  key: string; // form value, e.g. "individual" or "business:<ref_type>:<id>"
  label: string;
  avatar_url: string | null;
  posted_as_type: "individual" | "business";
  posted_as_ref_type: "service_profile" | "business_page" | null;
  posted_as_ref_id: string | null;
  name: string;
};

/**
 * Returns identities the current user can post a request under:
 *   - Their personal profile (always first)
 *   - Any business/service brand they own
 */
export function usePostAsOptions(userId: string | null | undefined) {
  const [options, setOptions] = useState<PostAsOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient("/profiles/me/post-as-options");
        if (cancelled) return;
        const me = res?.me;
        const sp = res?.sp;
        const bp = res?.bp;
        const list: PostAsOption[] = [];
      list.push({
        key: "individual",
        label: `${me?.full_name || "My personal profile"} (personal)`,
        name: me?.full_name || "My profile",
        avatar_url: me?.avatar_url ?? null,
        posted_as_type: "individual",
        posted_as_ref_type: null,
        posted_as_ref_id: null,
      });
      if (sp?.business_name) {
        list.push({
          key: `business:service_profile:${sp.user_id}`,
          label: sp.business_name,
          name: sp.business_name,
          avatar_url: sp.cover_url ?? me?.avatar_url ?? null,
          posted_as_type: "business",
          posted_as_ref_type: "service_profile",
          posted_as_ref_id: sp.user_id,
        });
      }
      (bp ?? []).forEach((p: any) => {
        list.push({
          key: `business:business_page:${p.id}`,
          label: p.name,
          name: p.name,
          avatar_url: p.logo_url ?? null,
          posted_as_type: "business",
          posted_as_ref_type: "business_page",
          posted_as_ref_id: p.id,
        });
      });
      setOptions(list);
      } catch (err) {
        console.error("Failed to load post-as options", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { options, loading };
}

export function findOption(options: PostAsOption[], key: string): PostAsOption | undefined {
  return options.find((o) => o.key === key);
}

export function keyFromRow(row: {
  posted_as_type?: string | null;
  posted_as_ref_type?: string | null;
  posted_as_ref_id?: string | null;
}): string {
  if (!row?.posted_as_type || row.posted_as_type === "individual") return "individual";
  if (row.posted_as_ref_type && row.posted_as_ref_id) {
    return `business:${row.posted_as_ref_type}:${row.posted_as_ref_id}`;
  }
  return "individual";
}
