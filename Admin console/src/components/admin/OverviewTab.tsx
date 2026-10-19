import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";

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
      try {
        const res = await apiClient<any>("/admin/overview");
        const stats = res?.data?.data ?? res?.data ?? res ?? empty;
        setS(stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const safeS = s || empty;

  const cards: Array<{ label: string; value: number; tab?: string; tone?: string }> = [
    { label: "Users", value: safeS.users || 0, tab: "users" },
    { label: "Providers", value: safeS.providers || 0, tab: "providers" },
    { label: "Requests", value: safeS.requests || 0, tab: "requests" },
  ];
  const alerts: Array<{ label: string; value: number; tab: string; subTab?: string; tone: string }> = [
    { label: "Open Reports", value: safeS.openReports || 0, tab: "reports", tone: "bg-destructive/10 text-destructive" },
    { label: "Open Disputes", value: safeS.openDisputes || 0, tab: "disputes", tone: "bg-destructive/10 text-destructive" },
    { label: "Pending Claims", value: safeS.pendingClaims || 0, tab: "official", subTab: "claims", tone: "bg-orange/10 text-orange" },
    { label: "Pending Credit Purchases", value: safeS.pendingPurchases || 0, tab: "credits", tone: "bg-orange/10 text-orange" },
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => onJump("official")} className="rounded-full border border-border px-3 py-1.5 font-medium hover:border-navy transition">Official Announcements</button>
          <button onClick={() => onJump("requests")} className="rounded-full border border-border px-3 py-1.5 font-medium hover:border-navy transition">Requests & Inquiries</button>
          <button onClick={() => onJump("providers")} className="rounded-full border border-border px-3 py-1.5 font-medium hover:border-navy transition">Service Providers</button>
          <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" className="rounded-full border border-orange/40 bg-orange/5 px-3 py-1.5 font-medium text-orange hover:border-orange transition">Consumer Website ↗</a>
        </div>
      </div>
    </div>
  );
}
