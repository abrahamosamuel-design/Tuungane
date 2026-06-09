import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, MessageSquare, Mail, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";

type Row = {
  provider_id: string;
  service_request_id: string;
  last_at: string;
  methods: Set<string>;
  profile?: { full_name: string; avatar_url: string | null };
};

const methodIcon = (m: string) => {
  if (m === "in_app") return <MessageSquare className="h-3 w-3" />;
  if (m === "call" || m === "phone") return <Phone className="h-3 w-3" />;
  if (m === "email") return <Mail className="h-3 w-3" />;
  return null;
};

export function ContactedProvidersList({ limit = 5 }: { limit?: number }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("contact_logs")
        .select("provider_id,service_request_id,contact_method,clicked_at")
        .eq("customer_id", user.id)
        .order("clicked_at", { ascending: false })
        .limit(100);
      const map = new Map<string, Row>();
      for (const r of (data ?? []) as Array<{ provider_id: string; service_request_id: string; contact_method: string; clicked_at: string }>) {
        const key = r.provider_id;
        const existing = map.get(key);
        if (existing) existing.methods.add(r.contact_method);
        else map.set(key, { provider_id: r.provider_id, service_request_id: r.service_request_id, last_at: r.clicked_at, methods: new Set([r.contact_method]) });
      }
      const list = Array.from(map.values()).slice(0, limit);
      const ids = list.map((r) => r.provider_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids)
        : { data: [] as Array<{ id: string; full_name: string; avatar_url: string | null }> };
      const pm = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
      setRows(list.map((r) => ({ ...r, profile: pm.get(r.provider_id) })));
      setLoaded(true);
    })();
  }, [user, limit]);

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-navy/10 p-2 text-navy"><Users className="h-4 w-4" /></div>
        <h2 className="font-display text-lg font-bold text-navy">Contacted providers</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Providers you reached after sending a service request.</p>

      <div className="mt-4 space-y-2">
        {!loaded && <p className="text-xs text-muted-foreground">Loading…</p>}
        {loaded && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No contact activity yet. Send a service request first.</p>
        )}
        {rows.map((r) => (
          <Link key={r.provider_id} to="/u/$id" params={{ id: r.provider_id }} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:border-orange">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy">{r.profile?.full_name ?? "Provider"}</p>
              <p className="truncate text-xs text-muted-foreground">Last contact {timeAgo(r.last_at)}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(r.methods).map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-navy">
                  {methodIcon(m)} {m}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
