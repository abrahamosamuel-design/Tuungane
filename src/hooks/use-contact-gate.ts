import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Returns whether the current signed-in user (customer) has a tracked
 * service_request with `providerId` that unlocks contact options.
 *
 * Unlock rule (UI-side mirror of `can_reveal_contact` RPC):
 * a service_request exists between auth.uid() and providerId whose status is
 * in (requested, accepted, in_progress, completed).
 */
export function useContactGate(providerId: string | null | undefined) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user || !providerId || user.id === providerId) {
      setUnlocked(false);
      setRequestId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("service_requests")
      .select("id,status,selected_provider_id")
      .eq("customer_id", user.id)
      .eq("provider_id", providerId)
      .in("status", ["requested", "accepted", "in_progress", "completed"])
      .order("created_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    setUnlocked(!!row);
    setRequestId(row?.id ?? null);
    setLoading(false);
  }, [user, providerId]);

  useEffect(() => { check(); }, [check]);

  return { unlocked, requestId, loading, refresh: check };
}

export async function logContactClick(args: {
  customerId: string;
  providerId: string;
  serviceRequestId: string;
  method: "whatsapp" | "call" | "in_app" | "message";
}) {
  try {
    // If the request has progressed beyond "requested" it counts as an active job.
    // Populate service_job_id so contact analytics can split request-phase vs
    // job-phase contacts. (No separate service_jobs table — the request id
    // doubles as the job id once status is accepted/in_progress/completed.)
    let serviceJobId: string | null = null;
    const { data: r } = await supabase
      .from("service_requests")
      .select("status")
      .eq("id", args.serviceRequestId)
      .maybeSingle();
    if (r && ["accepted", "in_progress", "completed"].includes(r.status as string)) {
      serviceJobId = args.serviceRequestId;
    }

    await supabase.from("contact_logs").insert({
      customer_id: args.customerId,
      provider_id: args.providerId,
      service_request_id: args.serviceRequestId,
      service_job_id: serviceJobId,
      contact_method: args.method,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });
  } catch {
    // best-effort; don't block the user from contacting
  }
}

export async function logContactReveal(args: {
  customerId: string;
  providerId: string;
  serviceRequestId: string;
  revealedPhone?: string | null;
  revealedWhatsapp?: string | null;
  reason?: string;
}) {
  try {
    await supabase.from("contact_reveals").insert({
      customer_id: args.customerId,
      provider_id: args.providerId,
      service_request_id: args.serviceRequestId,
      revealed_phone: args.revealedPhone ?? null,
      revealed_whatsapp: args.revealedWhatsapp ?? null,
      reveal_reason: args.reason ?? "request_unlocked",
    });
  } catch {
    // best-effort
  }
}
