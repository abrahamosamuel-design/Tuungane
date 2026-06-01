import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";
import { Coins, Check, X as XIcon, Sparkles } from "lucide-react";

type Req = { id: string; user_id: string; package_name: string; credits_requested: number; amount_ugx: number; status: string; created_at: string; payment_reference: string | null; admin_note: string | null };
type Wallet = { user_id: string; balance: number; profile?: { full_name: string } };
type Boost = { id: string; user_id: string; boost_type: string; entity_type: string; entity_id: string; expires_at: string; status: string };

export function CreditsAdminTab() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [tab, setTab] = useState<"requests" | "wallets" | "boosts">("requests");
  const [addUid, setAddUid] = useState("");
  const [addAmt, setAddAmt] = useState("");
  const [addReason, setAddReason] = useState("");

  const load = async () => {
    const [r, w, b] = await Promise.all([
      supabase.from("credit_purchase_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("credit_wallets").select("user_id,balance").order("balance", { ascending: false }).limit(100),
      supabase.from("boosts").select("*").eq("status", "active").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(100),
    ]);
    const ids = (w.data ?? []).map((x) => x.user_id);
    const pm = ids.length ? (await supabase.from("profiles").select("id,full_name").in("id", ids)).data ?? [] : [];
    const map = new Map(pm.map((p) => [p.id, p.full_name]));
    setReqs(r.data ?? []);
    setWallets((w.data ?? []).map((x) => ({ ...x, profile: { full_name: map.get(x.user_id) ?? x.user_id.slice(0, 8) } })));
    setBoosts((b.data ?? []) as Boost[]);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const ref = prompt("Payment reference (optional):") ?? undefined;
    const { error } = await supabase.rpc("approve_purchase_request", { _request_id: id, _payment_reference: ref || undefined });
    if (error) toast.error(error.message); else { toast.success("Approved — credits added"); load(); }
  };
  const reject = async (id: string) => {
    const note = prompt("Reason for rejection (optional):") ?? undefined;
    const { error } = await supabase.rpc("reject_purchase_request", { _request_id: id, _admin_note: note || undefined });
    if (error) toast.error(error.message); else { toast.success("Rejected"); load(); }
  };
  const addCredits = async () => {
    if (!addUid || !addAmt) return toast.error("Enter user id and amount");
    const { error } = await supabase.rpc("admin_add_credits", { _user_id: addUid, _amount: Number(addAmt), _reason: addReason || "" });
    if (error) toast.error(error.message); else { toast.success("Added"); setAddUid(""); setAddAmt(""); setAddReason(""); load(); }
  };
  const expireBoost = async (id: string) => {
    const { error } = await supabase.rpc("admin_expire_boost", { _boost_id: id });
    if (error) toast.error(error.message); else { toast.success("Expired"); load(); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["requests", "wallets", "boosts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}>
            {t === "requests" ? `Purchase requests (${reqs.filter((r) => r.status === "pending").length})` : t === "wallets" ? "Wallets" : `Active boosts (${boosts.length})`}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <div className="space-y-2">
          {reqs.length === 0 && <p className="text-sm text-muted-foreground">No purchase requests yet.</p>}
          {reqs.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-navy"><Coins className="mr-1 inline h-3 w-3 text-orange" />{r.package_name} · {r.credits_requested} credits · {r.amount_ugx.toLocaleString()} UGX</p>
                  <p className="text-[11px] text-muted-foreground">user {r.user_id.slice(0, 8)} · {timeAgo(r.created_at)} · <span className="font-semibold">{r.status}</span>{r.payment_reference ? ` · ref ${r.payment_reference}` : ""}</p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-1 text-xs">
                    <button onClick={() => approve(r.id)} className="inline-flex items-center gap-1 rounded bg-green/10 px-2 py-1 text-green"><Check className="h-3 w-3" /> Approve</button>
                    <button onClick={() => reject(r.id)} className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-destructive"><XIcon className="h-3 w-3" /> Reject</button>
                  </div>
                )}
              </div>
              {r.admin_note && <p className="mt-1 text-[11px] text-muted-foreground">Admin note: {r.admin_note}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === "wallets" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-navy">Add credits manually</p>
            <div className="flex flex-wrap gap-2">
              <input value={addUid} onChange={(e) => setAddUid(e.target.value)} placeholder="User UUID" className="min-w-0 flex-1 rounded border border-border px-2 py-1 text-xs" />
              <input value={addAmt} onChange={(e) => setAddAmt(e.target.value)} type="number" min="1" placeholder="Amount" className="w-24 rounded border border-border px-2 py-1 text-xs" />
              <input value={addReason} onChange={(e) => setAddReason(e.target.value)} placeholder="Reason" className="min-w-0 flex-1 rounded border border-border px-2 py-1 text-xs" />
              <button onClick={addCredits} className="rounded-full bg-orange px-3 py-1 text-xs font-semibold text-orange-foreground">Add</button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Balance</th><th className="px-3 py-2">UID</th></tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.user_id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-navy">{w.profile?.full_name}</td>
                    <td className="px-3 py-2 font-semibold text-orange">{w.balance}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{w.user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "boosts" && (
        <div className="space-y-2">
          {boosts.length === 0 && <p className="text-sm text-muted-foreground">No active boosts.</p>}
          {boosts.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-semibold text-navy"><Sparkles className="mr-1 inline h-3 w-3 text-orange" />{b.boost_type.replace(/_/g, " ")}</p>
                <p className="text-[11px] text-muted-foreground">{b.entity_type}/{b.entity_id.slice(0, 8)} · expires {timeAgo(b.expires_at)} · user {b.user_id.slice(0, 8)}</p>
              </div>
              <button onClick={() => expireBoost(b.id)} className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">End now</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
