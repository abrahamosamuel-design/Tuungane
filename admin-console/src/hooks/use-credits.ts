import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
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
      try {
        const { data } = await apiClient("/credits/wallet");
        return data?.data?.balance ?? 0;
      } catch (e) {
        return 0;
      }
    },
  });

  // Fallback to polling instead of realtime since we removed Supabase client
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [userId, refetch]);

  return {
    balance: (data ?? null) as number | null,
    loading: isLoading,
    refresh: () => { void refetch(); },
  };
}
