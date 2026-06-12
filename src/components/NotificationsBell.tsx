import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function NotificationsBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const load = async () => {
    if (!user) return;
    const { count: c } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
    setCount(c ?? 0);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel(`notif-${user.id}-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;
  return (
    <Link to="/notifications" className="relative inline-flex items-center justify-center rounded-full p-2 text-navy hover:bg-muted" aria-label="Notifications">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-orange-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
