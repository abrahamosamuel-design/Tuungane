import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, MessageSquare, Mail, Inbox } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";

type Row = {
  customer_id: string;
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

export function ProviderContactsList({ limit = 5 }: { limit?: number }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: res } = await apiClient("/profiles/me/provider-contacts");
        let list = res.data ?? [];
        if (limit) list = list.slice(0, limit);
        // Map back to Set for UI logic
        list = list.map((r: any) => ({
          ...r,
          methods: new Set(r.methods)
        }));
        setRows(list);
      } catch (err) {
        console.error("Failed to load provider contacts", err);
      }
      setLoaded(true);
    })();
  }, [user, limit]);

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-orange/10 p-2 text-orange"><Inbox className="h-4 w-4" /></div>
        <h2 className="font-display text-lg font-bold text-navy">Recent customer contacts</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Customers who contacted you through a tracked Tuungane request.</p>

      <div className="mt-4 space-y-2">
        {!loaded && <p className="text-xs text-muted-foreground">Loading…</p>}
        {loaded && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No customer contact activity yet.</p>
        )}
        {rows.map((r) => {
          const allowCall = r.methods.has("call") || r.methods.has("phone");
          return (
            <div key={r.customer_id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{r.profile?.full_name ?? "Customer"}</p>
                  <p className="truncate text-xs text-muted-foreground">Contacted {timeAgo(r.last_at)}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(r.methods).map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-navy">
                      {methodIcon(m)} {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to="/requests/$id"
                  params={{ id: r.service_request_id }}
                  className="inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1 text-[11px] font-semibold text-orange-foreground"
                >
                  View request
                </Link>
                <Link
                  to="/messages"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-navy hover:border-orange"
                >
                  <MessageSquare className="h-3 w-3" /> Message
                </Link>
                {allowCall && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-navy">
                    <Phone className="h-3 w-3" /> Call logged
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
