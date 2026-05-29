import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function SaveButton({ providerUserId, variant = "icon" }: { providerUserId: string; variant?: "icon" | "full" }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setSaved(false); return; }
    (async () => {
      const { data } = await supabase
        .from("saved_providers")
        .select("provider_user_id")
        .eq("user_id", user.id)
        .eq("provider_user_id", providerUserId)
        .maybeSingle();
      setSaved(!!data);
    })();
  }, [user, providerUserId]);

  const toggle = async () => {
    if (!user) { nav({ to: "/login", search: { tab: "login" } as never }); return; }
    if (user.id === providerUserId) { toast.info("You can't save your own profile"); return; }
    setBusy(true);
    if (saved) {
      const { error } = await supabase.from("saved_providers").delete().eq("user_id", user.id).eq("provider_user_id", providerUserId);
      if (error) toast.error(error.message); else { setSaved(false); toast.success("Removed from saved"); }
    } else {
      const { error } = await supabase.from("saved_providers").insert({ user_id: user.id, provider_user_id: providerUserId });
      if (error) toast.error(error.message); else { setSaved(true); toast.success("Saved"); }
    }
    setBusy(false);
  };

  if (variant === "full") {
    return (
      <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${saved ? "border-orange bg-orange/10 text-orange" : "border-border text-navy hover:border-orange"}`}>
        <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-orange" : ""}`} /> {saved ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button onClick={toggle} disabled={busy} title={saved ? "Saved" : "Save provider"} className={`inline-flex items-center justify-center rounded-full border p-2 transition ${saved ? "border-orange bg-orange/10 text-orange" : "border-border text-muted-foreground hover:border-orange hover:text-orange"}`}>
      <Bookmark className={`h-4 w-4 ${saved ? "fill-orange" : ""}`} />
    </button>
  );
}
