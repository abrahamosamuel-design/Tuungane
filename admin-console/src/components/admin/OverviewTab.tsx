import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  Users,
  Briefcase,
  ShieldCheck,
  MessageSquare,
  ClipboardList,
  Coins,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

type Stats = {
  users: number;
  suspendedUsers: number;
  providers: number;
  verifiedProviders: number;
  services: number;
  profileServices: number;
  posts: number;
  opportunities: number;
  requests: number;
  openReports: number;
  openDisputes: number;
  pendingClaims: number;
  pendingPurchases: number;
  pendingVerifications: number;
  pendingOpps: number;
  creditsBoughtTotal: number;
  creditRevenueUgx: number;
  pendingCreditRevenueUgx: number;
  paidPurchasesCount: number;
  uniqueCreditBuyers: number;
  totalWalletBalance: number;
};

const empty: Stats = {
  users: 0,
  suspendedUsers: 0,
  providers: 0,
  verifiedProviders: 0,
  services: 0,
  profileServices: 0,
  posts: 0,
  opportunities: 0,
  requests: 0,
  openReports: 0,
  openDisputes: 0,
  pendingClaims: 0,
  pendingPurchases: 0,
  pendingVerifications: 0,
  pendingOpps: 0,
  creditsBoughtTotal: 0,
  creditRevenueUgx: 0,
  pendingCreditRevenueUgx: 0,
  paidPurchasesCount: 0,
  uniqueCreditBuyers: 0,
  totalWalletBalance: 0,
};

export function OverviewTab({ onJump }: { onJump: (tab: string, subTab?: string) => void }) {
  const [s, setS] = useState<Stats>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<any>("/admin/overview");
        const stats = res?.data?.data ?? res?.data ?? res ?? empty;
        setS({ ...empty, ...stats });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white p-5" />
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      label: "Total Users",
      value: s.users.toLocaleString(),
      sub: s.suspendedUsers > 0 ? `${s.suspendedUsers} suspended · ${s.users - s.suspendedUsers} active` : `${s.users} active accounts`,
      icon: Users,
      iconBg: "bg-blue-50 text-blue-600",
      borderHover: "hover:border-blue-400",
      tab: "users",
    },
    {
      label: "Services Posted",
      value: (s.services || s.profileServices).toLocaleString(),
      sub: `${s.profileServices || s.services} service packages listed`,
      icon: Briefcase,
      iconBg: "bg-orange-50 text-[#f47b16]",
      borderHover: "hover:border-[#f47b16]",
      tab: "services",
    },
    {
      label: "Service Providers",
      value: s.providers.toLocaleString(),
      sub: `${s.verifiedProviders || 0} verified with badge`,
      icon: ShieldCheck,
      iconBg: "bg-emerald-50 text-emerald-600",
      borderHover: "hover:border-emerald-400",
      tab: "providers",
    },
    {
      label: "Community Posts",
      value: (s.posts || 0).toLocaleString(),
      sub: "Timeline updates & promotions",
      icon: MessageSquare,
      iconBg: "bg-purple-50 text-purple-600",
      borderHover: "hover:border-purple-400",
      tab: "posts",
    },
    {
      label: "Service Requests",
      value: s.requests.toLocaleString(),
      sub: "Customer inquiries & jobs",
      icon: ClipboardList,
      iconBg: "bg-indigo-50 text-indigo-600",
      borderHover: "hover:border-indigo-400",
      tab: "requests",
    },
    {
      label: "Credits Bought",
      value: (s.creditsBoughtTotal || 0).toLocaleString(),
      sub: `${s.paidPurchasesCount || 0} paid orders · ${s.uniqueCreditBuyers || 0} buyers`,
      icon: Coins,
      iconBg: "bg-amber-50 text-amber-600",
      borderHover: "hover:border-amber-400",
      tab: "credits",
    },
  ];

  const alerts = [
    {
      label: "Pending Credit Purchases",
      desc: s.pendingCreditRevenueUgx > 0 ? `${s.pendingCreditRevenueUgx.toLocaleString()} UGX awaiting approval` : "Review payment requests",
      value: s.pendingPurchases || 0,
      tab: "credits",
      tone: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      label: "Provider Verifications",
      desc: "Verify accounts to award badge",
      value: s.pendingVerifications || 0,
      tab: "providers",
      tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      label: "Open Reports",
      desc: "Flagged posts or profiles",
      value: s.openReports || 0,
      tab: "reports",
      tone: "bg-red-100 text-red-800 border-red-200",
    },
    {
      label: "Open Disputes",
      desc: "Service request disputes",
      value: s.openDisputes || 0,
      tab: "disputes",
      tone: "bg-red-100 text-red-800 border-red-200",
    },
    {
      label: "Pending Profile Claims",
      desc: "Seeded profile ownership claims",
      value: s.pendingClaims || 0,
      tab: "official",
      subTab: "claims",
      tone: "bg-orange-100 text-orange-800 border-orange-200",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Platform Revenue Wallet Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B192C] via-[#132743] to-[#1E3A8A] p-6 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-xs">
              <Wallet className="h-3.5 w-3.5" />
              Platform Credits & Revenue Wallet
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                UGX {(s.creditRevenueUgx || 0).toLocaleString()}
              </h2>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                Collected Revenue
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Total revenue collected from approved user credit purchases ({s.creditsBoughtTotal || 0} credits sold across {s.paidPurchasesCount || 0} completed transactions).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto">
            <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                Pending Approvals
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                UGX {(s.pendingCreditRevenueUgx || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-300">{s.pendingPurchases || 0} pending request(s)</p>
            </div>

            <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                <Coins className="h-3.5 w-3.5" />
                Credits Bought
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {(s.creditsBoughtTotal || 0).toLocaleString()} cr
              </p>
              <p className="text-[11px] text-slate-300">{s.uniqueCreditBuyers || 0} unique buyer(s)</p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                Total Wallet Balance
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {(s.totalWalletBalance || 0).toLocaleString()} cr
              </p>
              <p className="text-[11px] text-slate-300">Held across all accounts</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {s.verifiedProviders || 0} Verified Providers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-orange-400" />
              {s.services || s.profileServices} Total Services Listed
            </span>
          </div>
          <button
            onClick={() => onJump("credits")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f47b16] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 cursor-pointer"
          >
            Open Revenue Wallet & Credits <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Platform KPI Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Platform Overview & Key Metrics
          </h2>
          <span className="text-xs text-slate-400">Click any card to manage</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                onClick={() => c.tab && onJump(c.tab)}
                className={`group flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${c.borderHover}`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {c.label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#0B192C]">
                    {c.value}
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-slate-500">
                    {c.sub}
                  </p>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.iconBg} transition-transform group-hover:scale-105`}>
                  <Icon className="h-6 w-6" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Needs Attention Queue */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Needs Attention & Moderation Queue
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {alerts.map((c) => (
            <button
              key={c.label}
              onClick={() => onJump(c.tab, c.subTab)}
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition hover:shadow-sm cursor-pointer ${
                c.value > 0
                  ? "border-slate-200 bg-white"
                  : "border-slate-200/70 bg-slate-50/70 opacity-75 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-[#0B192C] leading-snug">{c.label}</p>
                <span
                  className={`inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${
                    c.value > 0 ? c.tone : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  {c.value}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Quick Administration Actions
        </h2>
        <div className="flex flex-wrap gap-2.5 text-xs">
          <button
            onClick={() => onJump("users")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-semibold text-[#0B192C] hover:border-[#0B192C] hover:bg-white transition cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-blue-600" /> Manage & Suspend Users
          </button>
          <button
            onClick={() => onJump("providers")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-semibold text-[#0B192C] hover:border-[#0B192C] hover:bg-white transition cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verify Providers (Award Badge)
          </button>
          <button
            onClick={() => onJump("services")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-semibold text-[#0B192C] hover:border-[#0B192C] hover:bg-white transition cursor-pointer"
          >
            <Briefcase className="h-3.5 w-3.5 text-[#f47b16]" /> View All Posted Services ({s.services || s.profileServices})
          </button>
          <button
            onClick={() => onJump("posts")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-semibold text-[#0B192C] hover:border-[#0B192C] hover:bg-white transition cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-purple-600" /> Moderate & Delete Community Posts
          </button>
          <button
            onClick={() => onJump("credits")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-semibold text-[#0B192C] hover:border-[#0B192C] hover:bg-white transition cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5 text-amber-600" /> Credits & Revenue Wallet
          </button>
          <a
            href="http://localhost:8000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#f47b16]/40 bg-[#f47b16]/10 px-3.5 py-2 font-bold text-[#f47b16] hover:bg-[#f47b16] hover:text-white transition"
          >
            Consumer Website (localhost:8000) <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
