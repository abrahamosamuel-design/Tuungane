import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, ArrowRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { urgencyOptions, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { timeAgo } from "@/lib/format";

export function MatchingRequestsSection() {
  const { user } = useAuth();
  const [items, setItems] = useState<ServiceRequestRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await (supabase as any).rpc("matching_requests_for_provider", { _provider: user.id });
      if (!error && data) setItems(data as ServiceRequestRow[]);
      setLoaded(true);
    })();
  }, [user]);

  if (!user || !loaded) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-navy/10 p-2 text-navy"><Briefcase className="h-4 w-4" /></div>
          <h2 className="font-display text-lg font-bold text-navy">Matching service requests</h2>
        </div>
        <Link to="/services/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline">Open feed <ArrowRight className="h-3 w-3" /></Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <p>No matching requests right now.</p>
          <p className="mt-2 text-xs">Update your category or service areas so customers can find you. <Link to="/me" className="font-semibold text-orange hover:underline">Edit profile</Link></p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.slice(0, 5).map((r) => {
            const urg = urgencyOptions.find((u) => u.value === r.urgency)?.label ?? r.urgency;
            return (
              <Link key={r.id} to="/requests/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:border-orange">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{r.title || r.service_needed}</p>
                  <p className="truncate text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.town ?? r.location} · {timeAgo(r.created_at)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-navy">{urg}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
