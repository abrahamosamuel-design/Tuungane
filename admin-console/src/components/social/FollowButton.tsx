import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useAuthGate } from "@/components/RequireAuthDialog";

export function FollowButton({ providerUserId, onChange }: { providerUserId: string; onChange?: (followers: number) => void }) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient<{ data: { following: boolean; count: number } }>(`/social/follows/${providerUserId}`);
        setCount(data?.count || 0);
        setFollowing(data?.following || false);
      } catch (err) {
        console.error("Failed to load follow status", err);
      }
    })();
  }, [providerUserId, user]);

  const toggle = async () => {
    if (!user) {
      requireAuth(undefined, {
        title: "Sign in to follow providers",
        message: "Create a free Tuungane account to follow providers and see their updates in your feed.",
      });
      return;
    }
    if (user.id === providerUserId) { toast.info("You can't follow yourself"); return; }
    setBusy(true);
    
    try {
      const { following: newStatus } = await apiClient<{ following: boolean }>(`/social/follows/toggle`, {
        method: 'POST',
        body: JSON.stringify({ provider_user_id: providerUserId })
      });
      
      setFollowing(newStatus);
      const diff = newStatus ? 1 : -1;
      setCount((c) => c + diff);
      onChange?.(count + diff);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle follow");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${following ? "border border-border bg-surface text-navy hover:border-destructive hover:text-destructive" : "bg-navy text-navy-foreground hover:brightness-110"}`}>
      {following ? "Following" : "Follow"} <span className="text-xs opacity-80">· {count}</span>
    </button>
  );
}
