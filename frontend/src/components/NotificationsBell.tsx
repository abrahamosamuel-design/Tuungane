import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isTypeEnabled, loadNotifPrefs, type NotifPrefs, DEFAULT_PREFS } from "@/lib/notification-prefs";

export function NotificationsBell() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadNotifPrefs());
    const onChange = () => setPrefs(loadNotifPrefs());
    window.addEventListener("tuungane:notif-prefs-changed", onChange);
    return () => window.removeEventListener("tuungane:notif-prefs-changed", onChange);
  }, []);

  const { data: count = 0 } = useQuery({
    queryKey: ["notifications", "bell", user?.id, prefs],
    queryFn: async () => {
      if (!user) return 0;
      try {
        const { data } = await apiClient.get("/notifications", { params: { unread: 'true' } });
        return (data?.data ?? []).filter((n: any) => isTypeEnabled(prefs, n.type)).length;
      } catch (err) {
        return 0;
      }
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (!user) return null;
  return (
    <Link to="/notifications" aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-navy hover:bg-orange/20 hover:text-orange transition-colors">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-orange-foreground shadow-sm">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
