import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      const { count: c } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("provider_user_id", providerUserId);
      setCount(c ?? 0);
      if (user) {
        const { data } = await supabase.from("follows").select("follower_id").eq("provider_user_id", providerUserId).eq("follower_id", user.id).maybeSingle();
        setFollowing(!!data);
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
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("provider_user_id", providerUserId);
      setFollowing(false); setCount((c) => c - 1); onChange?.(count - 1);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, provider_user_id: providerUserId });
      if (error) toast.error(error.message); else { setFollowing(true); setCount((c) => c + 1); onChange?.(count + 1); }
    }
    setBusy(false);
  };

  return (
    <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${following ? "border border-border bg-surface text-navy hover:border-destructive hover:text-destructive" : "bg-navy text-navy-foreground hover:brightness-110"}`}>
      {following ? "Following" : "Follow"} <span className="text-xs opacity-80">· {count}</span>
    </button>
  );
}
