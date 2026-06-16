import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function creditWalletQueryKey(userId: string | undefined) {
  return ["credit-wallet", userId ?? "anon"] as const;
}

/**
 * Shared wallet balance hook. Backed by TanStack Query so multiple consumers
 * (Header, CreditBalanceChip, BoostDialog, Credits page) reuse a single fetch
 * and a single realtime channel.
 */
export function useCreditWallet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: creditWalletQueryKey(userId),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      return data?.balance ?? 0;
    },
  });

  // One realtime channel per user, regardless of how many components subscribe.
  useEffect(() => {
    if (!userId) return;
    let ch: ReturnType<typeof supabase.channel> | undefined;
    try {
      const uniqueSuffix =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      ch = supabase
        .channel(`wallet:${userId}:${uniqueSuffix}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "credit_wallets", filter: `user_id=eq.${userId}` },
          (payload) => {
            const next = (payload.new as { balance?: number })?.balance;
            if (typeof next === "number") {
              qc.setQueryData(creditWalletQueryKey(userId), next);
            }
          },
        )
        .subscribe();
    } catch (err) {
      console.warn("[use-credits] realtime subscription failed", err);
    }
    return () => {
      if (ch) {
        try { supabase.removeChannel(ch); } catch { /* ignore */ }
      }
    };
  }, [userId, qc]);

  return {
    balance: (data ?? null) as number | null,
    loading: isLoading,
    refresh: () => { void refetch(); },
  };
}
