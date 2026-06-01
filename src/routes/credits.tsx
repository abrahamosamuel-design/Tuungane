import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCreditWallet } from "@/hooks/use-credits";
import { Coins, Info, Check, Clock, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/credits")({
  head: () => ({ meta: [
    { title: "Tuungane Credits" },
    { name: "description", content: "Buy and manage Tuungane Credits — boost visibility, feature posts, and promote opportunities. Credits are not cash." },
  ]}),
  component: CreditsPage,
});

type Pkg = { id: string; name: string; credits: number; amount_ugx: number; active: boolean; sort_order: number };
type Tx = { id: string; transaction_type: string; amount: number; reason: string; created_at: string };
type Req = { id: string; package_name: string; credits_requested: number; amount_ugx: number; status: string; admin_note: string | null; created_at: string };

const fmtUgx = (n: number) => `${n.toLocaleString()} UGX`;
const loginSearch = { tab: "login", redirect: "/credits" } as never;

function CreditsPage() {
  const { user } = useAuth();
  const { balance } = useCreditWallet();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const packagesLoadedRef = useRef(false);
  const personalLoadedForUserRef = useRef<string | null>(null);

  const loadPackages = async () => {
    const { data } = await supabase.from("credit_packages").select("*").eq("active", true).order("sort_order");
    setPkgs(data ?? []);
  };

  const loadPersonal = async () => {
    if (!user) return;
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("credit_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("credit_purchase_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setTxs(t ?? []);
    setReqs(r ?? []);
  };

  useEffect(() => {
    if (packagesLoadedRef.current) return;
    packagesLoadedRef.current = true;
    loadPackages();
  }, []);

  useEffect(() => {
    if (!user) {
      personalLoadedForUserRef.current = null;
      setTxs([]);
      setReqs([]);
      return;
    }
    if (personalLoadedForUserRef.current === user.id) return;
    personalLoadedForUserRef.current = user.id;
    loadPersonal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Realtime: refresh transactions & purchase requests when they change for this user
  useEffect(() => {
    if (!user) return;
    const suffix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let ch: ReturnType<typeof supabase.channel> | undefined;
    try {
      ch = supabase
        .channel(`credits-page:${user.id}:${suffix}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "credit_purchase_requests", filter: `user_id=eq.${user.id}` },
          () => { loadPersonal(); })
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "credit_transactions", filter: `user_id=eq.${user.id}` },
          () => { loadPersonal(); })
        .subscribe();
    } catch (err) {
      console.warn("[credits] realtime subscription failed", err);
    }
    return () => { if (ch) { try { supabase.removeChannel(ch); } catch {} } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const requestPurchase = async (pkg: Pkg) => {
    if (!user) return;
    setSubmitting(pkg.id);
    const { error } = await supabase.from("credit_purchase_requests").insert({
      user_id: user.id, package_id: pkg.id, package_name: pkg.name,
      credits_requested: pkg.credits, amount_ugx: pkg.amount_ugx, status: "pending",
    });
    setSubmitting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Purchase request submitted. An admin will review it shortly.");
    loadPersonal();
  };

  const cancelRequest = async (id: string) => {
    const { error } = await supabase.from("credit_purchase_requests").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Request cancelled"); loadPersonal(); }
  };

  const isLoggedIn = !!user;

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-orange/15 via-orange/5 to-background border border-orange/20 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-orange uppercase tracking-wide"><Coins className="h-4 w-4" /> Tuungane Credits</div>
              {isLoggedIn ? (
                <h1 className="mt-2 text-4xl font-bold text-navy">{(balance ?? 0).toLocaleString()} <span className="text-xl font-semibold text-muted-foreground">credits</span></h1>
              ) : (
                <h1 className="mt-2 text-4xl font-bold text-navy">Credits</h1>
              )}
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">Use credits to boost your profile, feature posts, mark requests urgent, and promote opportunities. <Link to="/credits" hash="how" className="text-orange underline">How to earn & spend</Link>.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">Free to join · Basic use stays free</span>
              {isLoggedIn ? (
                <a href="#packages" className="inline-flex items-center rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground shadow-sm hover:brightness-110">Buy credits</a>
              ) : (
                <Link to="/login" search={loginSearch} className="inline-flex items-center rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground shadow-sm hover:brightness-110">
                  Log in to buy credits
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Not-cash disclaimer */}
        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="h-5 w-5 flex-shrink-0 text-navy" />
          <p><strong className="text-navy">Credits are not cash.</strong> They are used inside Tuungane to boost visibility, feature posts, highlight opportunities, and promote services. Credits cannot be withdrawn as money.</p>
        </div>

        {/* Packages */}
        <div id="packages">
          <h2 className="mb-3 text-xl font-bold text-navy">Buy credits</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pkgs.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5 transition hover:border-orange/60">
                <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
                <div className="mt-2 text-3xl font-bold text-navy">{p.credits} <span className="text-base font-medium text-muted-foreground">credits</span></div>
                <div className="mt-1 text-sm font-semibold text-orange">{fmtUgx(p.amount_ugx)}</div>
                {isLoggedIn ? (
                  <button
                    disabled={submitting === p.id}
                    onClick={() => requestPurchase(p)}
                    className="mt-4 w-full rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
                  >
                    {submitting === p.id ? "Submitting…" : "Request purchase"}
                  </button>
                ) : (
                  <Link to="/login" search={loginSearch} className="mt-4 block w-full rounded-full bg-navy px-4 py-2 text-center text-sm font-semibold text-white hover:bg-navy/90">
                    Log in to buy
                  </Link>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">After requesting, send payment using the instructions an admin will share, then an admin marks your request as paid and your credits arrive automatically.</p>
        </div>

        {/* Purchase requests */}
        {isLoggedIn && reqs.length > 0 && (
          <div>
            <h2 className="mb-3 text-xl font-bold text-navy">Your purchase requests</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2">Package</th><th className="px-4 py-2">Credits</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">When</th><th /></tr>
                </thead>
                <tbody>
                  {reqs.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-navy">{r.package_name}</td>
                      <td className="px-4 py-2">{r.credits_requested}</td>
                      <td className="px-4 py-2">{fmtUgx(r.amount_ugx)}</td>
                      <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-2 text-muted-foreground">{timeAgo(r.created_at)}</td>
                      <td className="px-4 py-2 text-right">
                        {r.status === "pending" && (
                          <button onClick={() => cancelRequest(r.id)} className="text-xs text-destructive hover:underline">Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Earn & spend explanation */}
        <div id="how" className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-base font-bold text-navy">Earn credits</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• 10 starter credits when you join</li>
              <li>• Admin-awarded credits for community contributions</li>
              <li>• Refunds from cancelled boosts</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-base font-bold text-navy">Spend credits</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Boost your provider profile (3–10 credits)</li>
              <li>• Feature a service post (5 credits)</li>
              <li>• Mark a request urgent (5 credits)</li>
              <li>• Priority response (2 credits)</li>
              <li>• Feature a business page (15–40 credits)</li>
              <li>• Featured opportunity (10 credits)</li>
              <li>• Promote a completed-work post (5 credits)</li>
            </ul>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="mb-3 text-xl font-bold text-navy">Transaction history</h2>
          {!isLoggedIn ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p className="mb-3">Log in to view your credit activity.</p>
              <Link to="/login" search={loginSearch} className="inline-flex items-center rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90">
                Log in
              </Link>
            </div>
          ) : txs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No credit activity yet.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Reason</th><th className="px-4 py-2">When</th></tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-navy">{t.transaction_type.replace(/_/g, " ")}</td>
                      <td className={`px-4 py-2 font-semibold ${t.amount >= 0 ? "text-green" : "text-destructive"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</td>
                      <td className="px-4 py-2 text-muted-foreground">{t.reason}</td>
                      <td className="px-4 py-2 text-muted-foreground">{timeAgo(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string; icon: React.ReactNode }> = {
    pending:   { c: "bg-orange/15 text-orange",         label: "Pending admin approval", icon: <Clock className="h-3 w-3" /> },
    paid:      { c: "bg-green/15 text-green",           label: "Paid",                   icon: <Check className="h-3 w-3" /> },
    rejected:  { c: "bg-destructive/15 text-destructive", label: "Rejected",             icon: <XIcon className="h-3 w-3" /> },
    cancelled: { c: "bg-muted text-muted-foreground",   label: "Cancelled",              icon: <XIcon className="h-3 w-3" /> },
  };
  const s = map[status] ?? map.pending;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.c}`}>{s.icon}{s.label}</span>;
}
