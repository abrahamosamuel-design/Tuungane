import { supabase } from "@/integrations/supabase/client";

export type ProfileIdentity = "individual" | "institution";

export interface IdentityStatus {
  identity: ProfileIdentity;
  offersServices: boolean;
  requester: boolean;
  verified: boolean;
  organisationName?: string | null;
  organisationType?: string | null;
}

export const identityLabel = (id: ProfileIdentity) =>
  id === "institution" ? "Institution Profile" : "Individual Profile";

/**
 * Compute activity-derived status for a user. Cheap: three head-count queries.
 * Any auth/network failure is treated as "not present" so badges never falsely
 * appear.
 */
export async function fetchIdentityStatus(userId: string): Promise<IdentityStatus> {
  const [{ data: p }, servicesCount, requestsCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("profile_identity,organisation_name,organisation_type")
      .eq("id", userId)
      .maybeSingle(),
    countOffersServices(userId),
    countRequests(userId),
  ]);

  const row = (p ?? {}) as {
    profile_identity?: string | null;
    organisation_name?: string | null;
    organisation_type?: string | null;
  };

  return {
    identity: (row.profile_identity as ProfileIdentity) ?? "individual",
    offersServices: servicesCount > 0,
    requester: requestsCount > 0,
    verified: false,
    organisationName: row.organisation_name ?? null,
    organisationType: row.organisation_type ?? null,
  };
}

async function countOffersServices(userId: string): Promise<number> {
  const [{ count: pubCount }, { count: spCount }] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),
    supabase
      .from("service_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  return (pubCount ?? 0) + (spCount ?? 0);
}

async function countRequests(userId: string): Promise<number> {
  const { count } = await supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", userId);
  return count ?? 0;
}
