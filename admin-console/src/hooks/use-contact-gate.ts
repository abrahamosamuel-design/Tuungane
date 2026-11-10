import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
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
    try {
      const { data: res } = await apiClient(`/requests/contact_gate/${providerId}`);
      const row = res.data;
      setUnlocked(!!row);
      setRequestId(row?.id ?? null);
    } catch (err) {
      console.error("Failed to check contact gate", err);
      setUnlocked(false);
      setRequestId(null);
    }
    setLoading(false);
  }, [user, providerId]);

  useEffect(() => { check(); }, [check]);

  return { unlocked, requestId, loading, refresh: check };
}

export async function logContactClick(args: {
  customerId: string;
  providerId: string;
  serviceRequestId?: string | null;
  serviceId?: string | null;
  source?: "request_response" | "provider_profile" | "service_listing" | "search_result" | "request_detail" | "message_thread";
  method: "whatsapp" | "call" | "in_app" | "message";
}) {
  try {
    await apiClient.post("/requests/log_contact_click", args);
  } catch {
    // best-effort; don't block the user from contacting
  }
}

/**
 * Fetch a provider's phone if their phone_visibility allows the current
 * (signed-in) customer to see it. Returns null when hidden / messages-first / no phone.
 */
export async function getRevealablePhone(providerId: string): Promise<string | null> {
  try {
    // get_provider_contact is a SECURITY DEFINER RPC that enforces
    // phone_visibility + the active service-request contact gate
    // server-side. Returns no row when the viewer is not allowed.
    const { data: res } = await apiClient(`/requests/provider_contact/${providerId}`);
    return (res.data as { phone?: string | null } | null)?.phone ?? null;
  } catch {
    return null;
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
    await apiClient.post("/requests/log_contact_reveal", args);
  } catch {
    // best-effort
  }
}
