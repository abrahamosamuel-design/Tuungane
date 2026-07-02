import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  users: number;
  providers: number;
  opportunities: number;
  requests: number;
  openReports: number;
  openDisputes: number;
  pendingClaims: number;
  pendingPurchases: number;
  pendingOpps: number;
};

const empty: Stats = {
  users: 0, providers: 0, opportunities: 0, requests: 0,
  openReports: 0, openDisputes: 0, pendingClaims: 0, pendingPurchases: 0, pendingOpps: 0,
};

export function OverviewTab({ onJump }: { onJump: (tab: string, subTab?: string) => void }) {
  const [s, setS] = useState<Stats>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const head = { count: "exact" as const, head: true };
      const [u, p, o, r, rep, dis, cl, cp, po] = await Promise.all([
        supabase.from("profiles").select("*", head),
        supabase.from("service_profiles").select("*", head),
        supabase.from("opportunities").select("*", head).eq("archived", false),
        supabase.from("service_requests").select("*", head),
        supabase.from("reports").select("*", head).eq("status", "open"),
        supabase.from("service_disputes").select("*", head).eq("status", "open"),
        supabase.from("profile_claim_requests").select("*", head).eq("status", "pending"),
        supabase.from("credit_purchase_requests").select("*", head).eq("status", "pending"),
        supabase.from("opportunities").select("*", head).eq("status", "pending"),
      ]);
      setS({
        users: u.count ?? 0,
        providers: p.count ?? 0,
        opportunities: o.count ?? 0,
        requests: r.count ?? 0,
        openReports: rep.count ?? 0,
        openDisputes: dis.count ?? 0,
        pendingClaims: cl.count ?? 0,
        pendingPurchases: cp.count ?? 0,
        pendingOpps: po.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards: Array<{ label: string; value: number; tab?: string; tone?: string }> = [
    { label: "Users", value: s.users, tab: "users" },
    { label: "Providers", value: s.providers, tab: "providers" },
    { label: "Requests", value: s.requests, tab: "requests" },
  ];
  const alerts: Array<{ label: string; value: number; tab: string; subTab?: string; tone: string }> = [
    { label: "Open Reports", value: s.openReports, tab: "reports", tone: "bg-destructive/10 text-destructive" },
    { label: "Open Disputes", value: s.openDisputes, tab: "disputes", tone: "bg-destructive/10 text-destructive" },
    { label: "Pending Claims", value: s.pendingClaims, tab: "official", subTab: "claims", tone: "bg-orange/10 text-orange" },
    { label: "Pending Credit Purchases", value: s.pendingPurchases, tab: "credits", tone: "bg-orange/10 text-orange" },
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Loading overview…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Platform</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {cards.map((c) => (
            <button key={c.label} onClick={() => c.tab && onJump(c.tab)} className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-navy">
              <p className="text-2xl font-bold text-navy">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Needs attention</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {alerts.map((c) => (
            <button key={c.label} onClick={() => onJump(c.tab, c.subTab)} className={`rounded-xl border border-border bg-card p-4 text-left transition hover:border-navy ${c.value > 0 ? "" : "opacity-60"}`}>

              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{c.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.value > 0 ? c.tone : "bg-muted text-muted-foreground"}`}>{c.value}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick links</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to="/businesses" className="rounded-full border border-border px-3 py-1.5 hover:border-navy">Business directory</Link>
          <Link to="/official" className="rounded-full border border-border px-3 py-1.5 hover:border-navy">Official page</Link>
          <Link to="/requests/browse" className="rounded-full border border-border px-3 py-1.5 hover:border-navy">Requests</Link>
          <Link to="/services" className="rounded-full border border-border px-3 py-1.5 hover:border-navy">Services</Link>
        </div>
      </div>
    </div>
  );
}
