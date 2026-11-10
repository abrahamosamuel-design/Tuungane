import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, MessageSquare, Mail, Users } from "lucide-react";
import { apiClient } from "@/lib/api";
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
      try {
        const res = await apiClient.get("/profiles/me/customer-contacts", { params: { limit } });
        const list = res.data || [];
        // The backend returns methods as arrays, let's map them to Sets since the UI expects Sets
        setRows(list.map((r: any) => ({ ...r, methods: new Set(r.methods) })));
      } catch (err) {
        console.error(err);
      }
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
