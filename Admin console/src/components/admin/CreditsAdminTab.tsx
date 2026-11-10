import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";
import {
  Coins,
  Check,
  X as XIcon,
  Sparkles,
  Wallet,
  TrendingUp,
  Clock,
  Users,
  Search,
  Plus,
  Receipt,
  Package,
} from "lucide-react";

type Req = {
  id: string;
  user_id: string;
  package_name: string;
  credits_requested: number;
  amount_ugx: number;
  status: string;
  created_at: string;
  approved_at?: string | null;
  payment_reference: string | null;
  admin_note: string | null;
  profile?: { full_name: string; avatar_url?: string | null; is_provider?: boolean };
  contact?: { email: string | null; phone: string | null };
};

type WalletRow = {
  user_id: string;
  balance: number;
  credits_bought: number;
  amount_paid_ugx: number;
  purchases_count: number;
  pending_credits: number;
  pending_amount_ugx: number;
  starter_credits: number;
  admin_credits: number;
  credits_spent: number;
  last_purchase_at: string | null;
  profile?: { full_name: string; avatar_url?: string | null; is_provider?: boolean; district?: string | null; town?: string | null };
  contact?: { email: string | null; phone: string | null };
};

type Boost = {
  id: string;
  user_id: string;
  boost_type: string;
  entity_type: string;
  entity_id: string;
  expires_at: string;
  status: string;
};

type TxRow = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  source: string | null;
  reference_id: string | null;
  created_at: string;
  profile?: { full_name: string; is_provider?: boolean };
  contact?: { email: string | null; phone: string | null };
};

type Summary = {
  totalRevenueUgx: number;
  pendingRevenueUgx: number;
  rejectedRevenueUgx: number;
  totalCreditsBought: number;
  pendingCreditsTotal: number;
  paidRequestsCount: number;
  pendingRequestsCount: number;
  uniqueBuyersCount: number;
  totalStarterCredits: number;
  totalAdminAddedCredits: number;
  totalCreditsSpent: number;
  totalWalletBalance: number;
  packageBreakdown: Array<{ name: string; count: number; credits: number; revenueUgx: number }>;
};

const emptySummary: Summary = {
  totalRevenueUgx: 0,
  pendingRevenueUgx: 0,
  rejectedRevenueUgx: 0,
  totalCreditsBought: 0,
  pendingCreditsTotal: 0,
  paidRequestsCount: 0,
  pendingRequestsCount: 0,
  uniqueBuyersCount: 0,
  totalStarterCredits: 0,
  totalAdminAddedCredits: 0,
  totalCreditsSpent: 0,
  totalWalletBalance: 0,
  packageBreakdown: [],
};

export function CreditsAdminTab() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"wallets" | "requests" | "transactions" | "boosts">("wallets");
  const [walletFilter, setWalletFilter] = useState<"all" | "buyers" | "pending">("all");
  const [reqFilter, setReqFilter] = useState<"all" | "pending" | "paid" | "rejected">("all");
  const [q, setQ] = useState("");

  const [addUid, setAddUid] = useState("");
  const [addUserName, setAddUserName] = useState("");
  const [addAmt, setAddAmt] = useState("");
  const [addReason, setAddReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient<{
        data: {
          reqs: Req[];
          wallets: WalletRow[];
          boosts: Boost[];
          transactions: TxRow[];
          summary: Summary;
        };
      }>("/admin/credits");
      setReqs(data.data.reqs || []);
      setWallets(data.data.wallets || []);
      setBoosts(data.data.boosts || []);
      setTransactions(data.data.transactions || []);
      setSummary({ ...emptySummary, ...(data.data.summary || {}) });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load credits & wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: string) => {
    const ref = prompt("Enter payment reference / receipt number (optional):") ?? undefined;
    try {
      await apiClient.post(`/admin/credits/requests/${id}/approve`, { payment_reference: ref });
      toast.success("Purchase approved — credits added to user wallet & revenue recorded");
      void load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve request");
    }
  };

  const reject = async (id: string) => {
    const note = prompt("Reason for rejection (optional):") ?? undefined;
    try {
      await apiClient.post(`/admin/credits/requests/${id}/reject`, { admin_note: note });
      toast.success("Purchase request rejected");
      void load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject request");
    }
  };

  const addCredits = async () => {
    if (!addUid.trim() || !addAmt) return toast.error("Enter a user ID and credit amount");
    try {
      await apiClient.post("/admin/credits/add", {
        user_id: addUid.trim(),
        amount: Number(addAmt),
        reason: addReason.trim() || "Admin manual credit grant",
      });
      toast.success(`Added ${addAmt} credits to account`);
      setAddUid("");
      setAddUserName("");
      setAddAmt("");
      setAddReason("");
      void load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add credits");
    }
  };

  const expireBoost = async (id: string) => {
    try {
      await apiClient.post(`/admin/credits/boosts/${id}/expire`, {});
      toast.success("Boost expired");
      void load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to expire boost");
    }
  };

  const filteredWallets = wallets.filter((w) => {
    if (walletFilter === "buyers" && (w.credits_bought || 0) <= 0) return false;
    if (walletFilter === "pending" && (w.pending_credits || 0) <= 0) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      (w.profile?.full_name || "").toLowerCase().includes(needle) ||
      (w.contact?.email || "").toLowerCase().includes(needle) ||
      (w.contact?.phone || "").toLowerCase().includes(needle) ||
      w.user_id.toLowerCase().includes(needle)
    );
  });

  const filteredReqs = reqs.filter((r) => {
    if (reqFilter !== "all" && r.status !== reqFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Revenue Wallet & Credit Summary Banner */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Revenue Wallet */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B192C] to-[#1E3A8A] p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Platform Revenue Wallet
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-amber-300">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            UGX {(summary.totalRevenueUgx || 0).toLocaleString()}
          </p>
          <p className="mt-1.5 text-xs text-slate-300">
            From <span className="font-bold text-white">{summary.paidRequestsCount}</span> paid credit purchases ({summary.uniqueBuyersCount} unique buyers)
          </p>
        </div>

        {/* Card 2: Pending Revenue */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Pending Credit Orders
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#0B192C] sm:text-3xl">
            UGX {(summary.pendingRevenueUgx || 0).toLocaleString()}
          </p>
          <p className="mt-1.5 text-xs text-amber-800">
            <span className="font-bold">{summary.pendingRequestsCount}</span> pending request(s) ·{" "}
            <span className="font-bold">{summary.pendingCreditsTotal}</span> credits awaiting approval
          </p>
        </div>

        {/* Card 3: Total Credits Bought */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Credits Bought
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#0B192C] sm:text-3xl">
            {(summary.totalCreditsBought || 0).toLocaleString()} <span className="text-sm font-semibold text-slate-500">credits</span>
          </p>
          <p className="mt-1.5 text-xs text-emerald-800">
            Purchased by users · +{summary.totalStarterCredits} starter / +{summary.totalAdminAddedCredits} admin granted
          </p>
        </div>

        {/* Card 4: Active Wallets & Usage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Wallet Balances
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#0B192C] sm:text-3xl">
            {(summary.totalWalletBalance || 0).toLocaleString()} <span className="text-sm font-semibold text-slate-500">credits</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Across {wallets.length} accounts · <span className="font-semibold text-[#f47b16]">{summary.totalCreditsSpent} credits</span> spent on boosts
          </p>
        </div>
      </div>

      {/* Package Breakdown Bar (if packages have been sold) */}
      {summary.packageBreakdown && summary.packageBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Package className="h-4 w-4 text-[#f47b16]" /> Revenue Breakdown by Credit Package
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summary.packageBreakdown.map((pkg: any, idx: number) => {
              const pkgName = pkg.name || pkg.package_name || `Package ${idx + 1}`;
              const pkgCredits = Number(pkg.credits ?? pkg.credits_sold ?? 0);
              const pkgRevenue = Number(pkg.revenueUgx ?? pkg.revenue_ugx ?? 0);
              return (
                <div
                  key={pkgName}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-bold text-[#0B192C]">{pkgName}</p>
                    <p className="text-xs text-slate-500">
                      {pkg.count || 0} {pkg.count === 1 ? "purchase" : "purchases"} · {pkgCredits} credits sold
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                    UGX {pkgRevenue.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("wallets")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === "wallets"
                ? "bg-[#0B192C] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Credits Per Account ({wallets.length})
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === "requests"
                ? "bg-[#0B192C] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            Purchase Requests ({reqs.length})
            {summary.pendingRequestsCount > 0 && (
              <span className="ml-1 rounded-full bg-[#f47b16] px-2 py-0.5 text-[10px] font-extrabold text-white">
                {summary.pendingRequestsCount} pending
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("transactions")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === "transactions"
                ? "bg-[#0B192C] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            Transactions Ledger ({transactions.length})
          </button>
          <button
            onClick={() => setTab("boosts")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === "boosts"
                ? "bg-[#0B192C] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Active Boosts ({boosts.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CREDITS PER ACCOUNT (WALLETS) */}
      {tab === "wallets" && (
        <div className="space-y-4">
          {/* Manual Grant Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                <Plus className="mr-1 inline h-3.5 w-3.5 text-[#f47b16]" />
                Grant Bonus Credits to an Account
              </p>
              {addUserName && (
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-[#f47b16]">
                  Selected: {addUserName}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={addUid}
                onChange={(e) => setAddUid(e.target.value)}
                placeholder="User UUID (or click '+ Grant' on any row below)"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-[#0B192C] focus:bg-white"
              />
              <input
                value={addAmt}
                onChange={(e) => setAddAmt(e.target.value)}
                type="number"
                min="1"
                placeholder="Credits amount (e.g. 25)"
                className="w-full sm:w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-[#0B192C] focus:bg-white"
              />
              <input
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder="Reason / note (optional)"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-[#0B192C] focus:bg-white"
              />
              <button
                onClick={addCredits}
                className="rounded-xl bg-[#f47b16] px-4 py-2 text-xs font-bold text-white shadow-xs hover:brightness-110 transition cursor-pointer"
              >
                Add Credits
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search account by name, email, phone, or ID…"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0B192C]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                onClick={() => setWalletFilter("all")}
                className={`rounded-full px-3 py-1.5 font-semibold transition cursor-pointer ${
                  walletFilter === "all"
                    ? "bg-[#0B192C] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
                }`}
              >
                All Accounts ({wallets.length})
              </button>
              <button
                onClick={() => setWalletFilter("buyers")}
                className={`rounded-full px-3 py-1.5 font-semibold transition cursor-pointer ${
                  walletFilter === "buyers"
                    ? "bg-emerald-700 text-white"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                Credit Buyers ({wallets.filter((w) => (w.credits_bought || 0) > 0).length})
              </button>
              <button
                onClick={() => setWalletFilter("pending")}
                className={`rounded-full px-3 py-1.5 font-semibold transition cursor-pointer ${
                  walletFilter === "pending"
                    ? "bg-amber-600 text-white"
                    : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Pending Orders ({wallets.filter((w) => (w.pending_credits || 0) > 0).length})
              </button>
            </div>
          </div>

          {/* Per-Account Credits Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Account / User</th>
                  <th className="px-4 py-3">Credits Bought</th>
                  <th className="px-4 py-3">Money Paid (UGX)</th>
                  <th className="px-4 py-3">Starter / Bonus</th>
                  <th className="px-4 py-3">Credits Spent</th>
                  <th className="px-4 py-3">Wallet Balance</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Loading account wallets…
                    </td>
                  </tr>
                ) : filteredWallets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No accounts match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredWallets.map((w) => {
                    const name = w.profile?.full_name || "Unnamed User";
                    const bought = w.credits_bought || 0;
                    const paidUgx = w.amount_paid_ugx || 0;
                    const bonus = (w.starter_credits || 0) + (w.admin_credits || 0);
                    return (
                      <tr key={w.user_id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B192C]/10 font-bold text-[#0B192C]">
                              {name[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-[#0B192C]">{name}</span>
                                {w.profile?.is_provider && (
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-[#f47b16]">
                                    PROVIDER
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {w.contact?.email || w.contact?.phone || `${w.user_id.slice(0, 8)}…`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {bought > 0 ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                                <Coins className="h-3 w-3" /> {bought} credits
                              </span>
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                {w.purchases_count} {w.purchases_count === 1 ? "order" : "orders"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">0 bought</span>
                          )}
                          {(w.pending_credits || 0) > 0 && (
                            <div className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              +{w.pending_credits} cr pending
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {paidUgx > 0 ? (
                            <span className="font-extrabold text-emerald-700">
                              UGX {paidUgx.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">UGX 0</span>
                          )}
                          {(w.pending_amount_ugx || 0) > 0 && (
                            <div className="text-[10px] font-semibold text-amber-700">
                              +UGX {w.pending_amount_ugx.toLocaleString()} pending
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {bonus > 0 ? `${bonus} cr` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {(w.credits_spent || 0) > 0 ? (
                            <span className="font-semibold text-slate-700">{w.credits_spent} cr</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-lg bg-orange-50 border border-orange-200/70 px-2.5 py-1 text-xs font-extrabold text-[#f47b16]">
                            {w.balance} cr
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setAddUid(w.user_id);
                              setAddUserName(name);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0B192C] hover:border-[#0B192C] transition cursor-pointer"
                          >
                            + Grant
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE REQUESTS */}
      {tab === "requests" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(["all", "pending", "paid", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReqFilter(f)}
                className={`rounded-full px-3.5 py-1.5 font-semibold capitalize transition cursor-pointer ${
                  reqFilter === f
                    ? "bg-[#0B192C] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
                }`}
              >
                {f} ({f === "all" ? reqs.length : reqs.filter((r) => r.status === f).length})
              </button>
            ))}
          </div>

          {filteredReqs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No credit purchase requests in this view.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReqs.map((r) => {
                const userName = r.profile?.full_name || `User ${r.user_id.slice(0, 8)}`;
                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border bg-white p-4 shadow-xs transition ${
                      r.status === "pending"
                        ? "border-amber-300 ring-1 ring-amber-200/50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-extrabold text-[#f47b16]">
                            <Coins className="h-3.5 w-3.5" />
                            {r.package_name} · {r.credits_requested} credits
                          </span>
                          <span className="text-sm font-extrabold text-[#0B192C]">
                            UGX {(r.amount_ugx || 0).toLocaleString()}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              r.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Buyer: <span className="font-bold text-[#0B192C]">{userName}</span>
                          {r.contact?.email && ` · ${r.contact.email}`}
                          {r.contact?.phone && ` · ${r.contact.phone}`}
                          {" · "}Requested {timeAgo(r.created_at)}
                          {r.payment_reference && (
                            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                              Ref: {r.payment_reference}
                            </span>
                          )}
                        </p>
                        {r.admin_note && (
                          <p className="text-[11px] text-slate-500">Admin note: {r.admin_note}</p>
                        )}
                      </div>

                      {r.status === "pending" && (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => approve(r.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve & Credit Wallet
                          </button>
                          <button
                            onClick={() => reject(r.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                          >
                            <XIcon className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRANSACTIONS LEDGER */}
      {tab === "transactions" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Source / Details</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#0B192C]">
                      {t.profile?.full_name || t.user_id.slice(0, 8)}
                    </span>
                    {t.contact?.email && (
                      <div className="text-[11px] text-slate-400">{t.contact.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        (t.type || (t as any).transaction_type) === "purchase" ||
                        (t.type || (t as any).transaction_type) === "purchase_approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : (t.type || (t as any).transaction_type) === "starter" ||
                            (t.type || (t as any).transaction_type) === "starter_credit"
                          ? "bg-blue-100 text-blue-800"
                          : (t.type || (t as any).transaction_type) === "admin_add"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {String(t.type || (t as any).transaction_type || "credit").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-extrabold">
                    <span className={t.amount >= 0 ? "text-emerald-700" : "text-red-600"}>
                      {t.amount >= 0 ? `+${t.amount}` : t.amount} cr
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.source || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{timeAgo(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ACTIVE BOOSTS */}
      {tab === "boosts" && (
        <div className="space-y-2.5">
          {boosts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No active boosts right now.
            </div>
          )}
          {boosts.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div>
                <p className="text-sm font-bold text-[#0B192C]">
                  <Sparkles className="mr-1.5 inline h-4 w-4 text-[#f47b16]" />
                  {b.boost_type.replace(/_/g, " ")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {b.entity_type}/{b.entity_id.slice(0, 8)} · expires {timeAgo(b.expires_at)} · user{" "}
                  {b.user_id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => expireBoost(b.id)}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
              >
                End Boost Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
