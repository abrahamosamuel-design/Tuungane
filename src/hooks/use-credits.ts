import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useCreditWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setBalance(null); return; }
    setLoading(true);
    const { data } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime updates on wallet
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wallet:${user.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "credit_wallets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance?: number })?.balance;
          if (typeof next === "number") setBalance(next);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return { balance, loading, refresh };
}
