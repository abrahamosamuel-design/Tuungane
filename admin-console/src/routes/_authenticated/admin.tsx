import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { OfficialAccountForm } from "@/components/admin/OfficialAccountForm";
import { OfficialPostForm } from "@/components/admin/OfficialPostForm";
import { RequestsAdminTab } from "@/components/admin/RequestsAdminTab";
import { CreditsAdminTab } from "@/components/admin/CreditsAdminTab";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { DisputesAdminTab } from "@/components/admin/DisputesAdminTab";
import { ContactAnalyticsTab } from "@/components/admin/ContactAnalyticsTab";
import { ActivityLogTab } from "@/components/admin/ActivityLogTab";
import { LocationsTab } from "@/components/admin/LocationsTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { TrustVerificationCenter } from "@/components/admin/trust/TrustVerificationCenter";
import { AdminUserModal } from "@/components/admin/AdminUserModal";
import { officialPostTypeMap, type OfficialAccountRow, type OfficialPostRow } from "@/data/officialPostTypes";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Briefcase,
  MessageSquare,
  ClipboardList,
  ThumbsUp,
  Wallet,
  Flag,
  Scale,
  PhoneCall,
  Megaphone,
  MapPin,
  FolderKanban,
  Activity,
  Search,
  CheckCircle2,
  Sparkles,
  Ban,
  RotateCcw,
  Trash2,
  EyeOff,
  Eye,
  Star,
  Coins,
  ExternalLink,
  LogOut,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Console — Tuungane" }] }),
  component: Admin,
});

type Tab =
  | "overview"
  | "users"
  | "providers"
  | "services"
  | "requests"
  | "posts"
  | "recs"
  | "reports"
  | "disputes"
  | "trust"
  | "credits"
  | "official"
  | "contact"
  | "activity"
  | "locations"
  | "categories";

const TAB_GROUPS: {
  label: string;
  tabs: { id: Tab; label: string; icon: any; adminOnly?: boolean }[];
}[] = [
  {
    label: "Dashboard",
    tabs: [{ id: "overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "People & Services",
    tabs: [
      { id: "users", label: "Users", icon: Users },
      { id: "providers", label: "Providers & Badges", icon: ShieldCheck },
      { id: "services", label: "Posted Services", icon: Briefcase },
    ],
  },
  {
    label: "Finance & Credits",
    tabs: [{ id: "credits", label: "Credits & Wallet", icon: Wallet }],
  },
  {
    label: "Community & Content",
    tabs: [
      { id: "posts", label: "Community Posts", icon: MessageSquare },
      { id: "requests", label: "Service Requests", icon: ClipboardList },
      { id: "recs", label: "Recommendations", icon: ThumbsUp },
    ],
  },
  {
    label: "Trust & Safety",
    tabs: [
      { id: "trust", label: "Trust Center", icon: ShieldCheck },
      { id: "reports", label: "Reports", icon: Flag },
      { id: "disputes", label: "Disputes", icon: Scale },
      { id: "contact", label: "Contact Gating", icon: PhoneCall },
    ],
  },
  {
    label: "Platform Operations",
    tabs: [
      { id: "official", label: "Official Account", icon: Megaphone },
      { id: "locations", label: "Locations", icon: MapPin, adminOnly: true },
      { id: "categories", label: "Categories", icon: FolderKanban },
      { id: "activity", label: "Activity Log", icon: Activity, adminOnly: true },
    ],
  },
];

const TAB_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  overview: {
    title: "Platform Overview",
    subtitle: "Live metrics across users, posted services, provider verifications, community posts, and credit revenue.",
  },
  users: {
    title: "User Accounts Management",
    subtitle: "Inspect users, suspend or unsuspend accounts, award verification badges, and manage administrative roles.",
  },
  providers: {
    title: "Service Providers & Verification Badges",
    subtitle: "Verify provider accounts to award the Verified or Featured badge on their profile and listings, or suspend accounts.",
  },
  services: {
    title: "Services Posted on Platform",
    subtitle: "Browse, activate/deactivate, or remove any service package posted by providers across Tuungane.",
  },
  credits: {
    title: "Credits & Platform Revenue Wallet",
    subtitle: "Track total UGX revenue from credit sales, credits bought per account, wallet balances, and pending purchase requests.",
  },
  posts: {
    title: "Community Posts Moderation",
    subtitle: "Review timeline updates, feature top posts, hide inappropriate content, or permanently delete any community post.",
  },
  requests: {
    title: "Service Requests & Inquiries",
    subtitle: "Monitor customer service requests and provider assignments.",
  },
  recs: {
    title: "Provider Endorsements & Recommendations",
    subtitle: "Moderate community recommendations left on provider profiles.",
  },
  trust: {
    title: "Trust & Verification Center",
    subtitle: "Review verification applications, trust scores, and provider credentials.",
  },
  reports: {
    title: "Safety Reports Queue",
    subtitle: "Review and resolve user-submitted reports on posts, profiles, and services.",
  },
  disputes: {
    title: "Service Disputes",
    subtitle: "Mediate and resolve disputes between customers and service providers.",
  },
  contact: {
    title: "Contact Gating & Lead Analytics",
    subtitle: "Track phone and WhatsApp contact reveals across providers.",
  },
  official: {
    title: "Official Tuungane Account & Claims",
    subtitle: "Publish official announcements, manage seeded profiles, and review profile ownership claims.",
  },
  locations: {
    title: "Featured Locations",
    subtitle: "Manage districts, towns, and featured service areas.",
  },
  categories: {
    title: "Service Categories & Subcategories",
    subtitle: "Configure service taxonomy and browse categories.",
  },
  activity: {
    title: "Admin Activity Log",
    subtitle: "Audit log of administrative actions and moderation decisions.",
  },
};

function Admin() {
  const { user, loading, isModerator, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [officialSub, setOfficialSub] = useState<
    "account" | "create" | "manage" | "seeded" | "claims" | undefined
  >(undefined);
  const [quickStats, setQuickStats] = useState<{
    users: number;
    services: number;
    providers: number;
    creditRevenueUgx: number;
    creditsBoughtTotal: number;
  } | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) nav({ to: "/login", search: { tab: "login", redirect: "/admin" } as never });
      else if (!isModerator) toast.error("Moderator access required");
    }
  }, [loading, user, isModerator, nav]);

  useEffect(() => {
    if (!isModerator) return;
    apiClient<any>("/admin/overview")
      .then((res) => {
        const s = res?.data?.data ?? res?.data ?? res;
        if (s) setQuickStats(s);
      })
      .catch(() => {});
  }, [isModerator, tab]);

  if (!isModerator) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0B192C]">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-500">
            Signed in as <span className="font-semibold text-[#0B192C]">{user?.email}</span>. This
            account does not have admin or moderator permissions.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center justify-center rounded-xl bg-[#0B192C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1E3A8A]"
            >
              Sign out & switch account
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Refresh permissions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeMeta = TAB_TITLES[tab];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] lg:h-screen lg:overflow-hidden">
      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Tuungane"
              className="h-10 w-10 shrink-0 rounded-xl object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-extrabold tracking-tight text-[#0B192C]">
                  Tuungane Admin
                </span>
                <span className="rounded-full bg-[#f47b16]/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#f47b16]">
                  {isAdmin ? "Super Admin" : "Moderator"}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Platform Operations, Verification & Revenue Console
              </p>
            </div>
          </div>

          {/* Live Quick-Stat Pills */}
          {quickStats && (
            <div className="hidden xl:flex items-center gap-2 text-xs">
              <button
                onClick={() => setTab("users")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 hover:border-[#0B192C] transition cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-extrabold text-[#0B192C]">{quickStats.users}</span> Users
              </button>
              <button
                onClick={() => setTab("services")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 hover:border-[#0B192C] transition cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5 text-[#f47b16]" />
                <span className="font-extrabold text-[#0B192C]">{quickStats.services}</span> Services
              </button>
              <button
                onClick={() => setTab("credits")}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 hover:border-emerald-500 transition cursor-pointer"
              >
                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                Wallet:{" "}
                <span className="font-extrabold">
                  UGX {(quickStats.creditRevenueUgx || 0).toLocaleString()}
                </span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8000"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0B192C] hover:border-[#f47b16] hover:text-[#f47b16] transition"
            >
              Consumer App <ExternalLink className="h-3 w-3" />
            </a>
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-[#0B192C] truncate max-w-[180px]">
                {user?.email}
              </p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Session</p>
            </div>
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout: Left Sidebar + Right Workspace */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:flex-row lg:overflow-hidden">
        {/* Sidebar Navigation (Independent Scroll, Hidden Scrollbar) */}
        <aside className="w-full shrink-0 lg:h-full lg:w-60 lg:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            {TAB_GROUPS.map((g) => {
              const visible = g.tabs.filter((t) => !t.adminOnly || isAdmin);
              if (visible.length === 0) return null;
              return (
                <div key={g.label}>
                  <p className="mb-1.5 px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {g.label}
                  </p>
                  <div className="flex flex-wrap gap-1 lg:flex-col">
                    {visible.map((t) => {
                      const Icon = t.icon;
                      const active = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTab(t.id)}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer lg:w-full ${
                            active
                              ? "bg-[#0B192C] text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-100 hover:text-[#0B192C]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? "text-[#f47b16]" : "text-slate-400"
                            }`}
                          />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Active Tab Workspace (Independent Scroll, Hidden Scrollbar) */}
        <main className="min-w-0 flex-1 space-y-6 lg:h-full lg:overflow-y-auto lg:pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Section Title Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xs">
            <h1 className="font-display text-xl font-extrabold text-[#0B192C] sm:text-2xl">
              {activeMeta.title}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{activeMeta.subtitle}</p>
          </div>

          {/* Tab Body */}
          <div>
            {tab === "overview" && (
              <OverviewTab
                onJump={(t, sub) => {
                  setTab(t as Tab);
                  if (t === "official" && sub)
                    setOfficialSub(sub as "account" | "create" | "manage" | "seeded" | "claims");
                }}
              />
            )}
            {tab === "users" && <UsersTab />}
            {tab === "providers" && <ProvidersTab />}
            {tab === "services" && <ServicesTab />}
            {tab === "requests" && <RequestsAdminTab />}
            {tab === "posts" && <PostsTab />}
            {tab === "recs" && <RecsTab />}
            {tab === "reports" && <ReportsTab />}
            {tab === "disputes" && <DisputesAdminTab />}
            {tab === "trust" && <TrustVerificationCenter />}
            {tab === "credits" && <CreditsAdminTab />}
            {tab === "official" && <OfficialTabContent initialSub={officialSub} />}
            {tab === "contact" && <ContactAnalyticsTab />}
            {tab === "activity" && isAdmin && <ActivityLogTab />}
            {tab === "locations" && isAdmin && <LocationsTab />}
            {tab === "categories" && <CategoriesTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ───────── 1. Users Tab (Suspend/Unsuspend, Verify Badge, Credits per user, Roles) ─────────
type ManageableRole = "admin" | "moderator" | "finance_admin";
const ROLE_LABEL: Record<ManageableRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  finance_admin: "Finance Admin",
};

function UsersTab() {
  const { isAdmin, user: me } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Record<string, { email: string | null; phone: string | null }>>({});
  const [roles, setRoles] = useState<Record<string, ManageableRole[]>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "providers" | "verified" | "suspended" | "admins">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [inspectUser, setInspectUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient<{
        data: {
          users: any[];
          contacts: Record<string, any>;
          roles: Record<string, ManageableRole[]>;
        };
      }>("/admin/users");
      setRows(data.data.users || []);
      setContacts(data.data.contacts || {});
      if (data.data.roles) setRoles(data.data.roles);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [isAdmin]);

  const toggleRole = async (userId: string, role: ManageableRole, has: boolean) => {
    if (!isAdmin) return;
    if (role === "admin" && has && userId === me?.id) {
      toast.error("You can't remove your own admin role");
      return;
    }
    setBusy(`${userId}:${role}`);
    try {
      await apiClient.post(`/admin/users/${userId}/role/${role}`, { has });
      setRoles((prev) => {
        const cur = new Set(prev[userId] ?? []);
        if (has) cur.delete(role);
        else cur.add(role);
        return { ...prev, [userId]: Array.from(cur) as ManageableRole[] };
      });
      toast.success(has ? `${ROLE_LABEL[role]} revoked` : `${ROLE_LABEL[role]} granted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setBusy(null);
    }
  };

  const toggleSuspendUser = async (u: any) => {
    if (u.id === me?.id) {
      toast.error("You cannot suspend your own account");
      return;
    }
    const next = !u.suspended;
    setBusy(`suspend:${u.id}`);
    try {
      await apiClient.put(`/admin/users/${u.id}/status`, { suspended: next });
      setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, suspended: next } : r)));
      toast.success(next ? `${u.full_name || "User"} suspended` : `${u.full_name || "User"} unsuspended`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    } finally {
      setBusy(null);
    }
  };

  const toggleVerifyUser = async (u: any) => {
    const next = u.verified === "verified" || u.verified === "featured" ? "none" : "verified";
    setBusy(`verify:${u.id}`);
    try {
      await apiClient.put(`/admin/users/${u.id}/status`, { verified: next });
      setRows((prev) =>
        prev.map((r) =>
          r.id === u.id ? { ...r, verified: next, is_provider: next !== "none" ? true : r.is_provider } : r
        )
      );
      toast.success(
        next === "verified"
          ? `${u.full_name || "Provider"} verified — badge awarded!`
          : `Verification badge removed`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update verification");
    } finally {
      setBusy(null);
    }
  };

  const filtered = rows.filter((r) => {
    const userRoles = roles[r.id] ?? [];
    if (filter === "providers" && !r.is_provider && (r.services_count || 0) === 0) return false;
    if (filter === "verified" && r.verified !== "verified" && r.verified !== "featured") return false;
    if (filter === "suspended" && !r.suspended) return false;
    if (filter === "admins" && userRoles.length === 0) return false;

    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    const c = contacts[r.id];
    return (
      (r.full_name || "").toLowerCase().includes(needle) ||
      (r.business_name || "").toLowerCase().includes(needle) ||
      (c?.email || "").toLowerCase().includes(needle) ||
      (c?.phone || "").toLowerCase().includes(needle) ||
      r.id.toLowerCase().includes(needle)
    );
  });

  const suspendedCount = rows.filter((r) => r.suspended).length;
  const verifiedCount = rows.filter((r) => r.verified === "verified" || r.verified === "featured").length;
  const providersCount = rows.filter((r) => r.is_provider || (r.services_count || 0) > 0).length;

  return (
    <div className="space-y-4">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Users</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0B192C]">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Service Providers</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f47b16]">{providersCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Verified Badge Holders</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{verifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-xs">
          <p className="text-xs font-semibold text-red-800">Suspended Accounts</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{suspendedCount}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone, or ID…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0B192C]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {(
            [
              { id: "all", label: `All (${rows.length})` },
              { id: "providers", label: `Providers (${providersCount})` },
              { id: "verified", label: `Verified (${verifiedCount})` },
              { id: "suspended", label: `Suspended (${suspendedCount})` },
              { id: "admins", label: "Staff / Admins" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 font-semibold transition cursor-pointer ${
                filter === f.id
                  ? "bg-[#0B192C] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Rows */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No users match your search or filter.
          </div>
        ) : (
          filtered.map((u) => {
            const c = contacts[u.id] || { email: u.email, phone: u.phone };
            const userRoles = roles[u.id] ?? [];
            const isVerified = u.verified === "verified" || u.verified === "featured";
            return (
              <div
                key={u.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-xs transition sm:flex-row sm:items-center sm:justify-between ${
                  u.suspended ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.full_name || "User"}
                      className="h-11 w-11 shrink-0 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0B192C]/10 font-bold text-[#0B192C]">
                      {(u.full_name || "U")[0].toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold text-[#0B192C]">{u.full_name || "Unnamed User"}</p>
                      {u.is_provider && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-[#f47b16]">
                          PROVIDER
                        </span>
                      )}
                      {u.verified === "verified" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> VERIFIED BADGE
                        </span>
                      )}
                      {u.verified === "featured" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                          <Sparkles className="h-3 w-3" /> FEATURED
                        </span>
                      )}
                      {u.suspended && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
                          <Ban className="h-3 w-3" /> SUSPENDED
                        </span>
                      )}
                      {userRoles.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-[#0B192C] px-2 py-0.5 text-[10px] font-extrabold text-white"
                        >
                          {ROLE_LABEL[r].toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{[u.district, u.town].filter(Boolean).join(" · ") || "No location"}</span>
                      <span>· Joined {timeAgo(u.created_at)}</span>
                      {(u.services_count || 0) > 0 && (
                        <span className="font-semibold text-blue-700">
                          · {u.services_count} {u.services_count === 1 ? "service" : "services"} posted
                        </span>
                      )}
                      {(u.credits_bought || 0) > 0 && (
                        <span className="font-semibold text-emerald-700">
                          · {u.credits_bought} cr bought (UGX {(u.ugx_spent || 0).toLocaleString()})
                        </span>
                      )}
                      <span className="text-slate-400">· Wallet: {u.credits_balance ?? 0} cr</span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                      {c?.email ? (
                        <a href={`mailto:${c.email}`} className="font-medium text-[#0B192C] hover:text-[#f47b16]">
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">no email</span>
                      )}
                      {c?.phone ? (
                        <a href={`tel:${c.phone}`} className="font-medium text-[#0B192C] hover:text-[#f47b16]">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">no phone</span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(Object.keys(ROLE_LABEL) as ManageableRole[]).map((role) => {
                          const has = userRoles.includes(role);
                          const isMe = u.id === me?.id;
                          const disabled = busy === `${u.id}:${role}` || (role === "admin" && has && isMe);
                          return (
                            <button
                              key={role}
                              onClick={() => toggleRole(u.id, role, has)}
                              disabled={disabled}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer disabled:opacity-50 ${
                                has
                                  ? "bg-[#0B192C] text-white"
                                  : "border border-slate-200 bg-slate-50 text-slate-500 hover:border-[#0B192C]"
                              }`}
                            >
                              {has ? `✓ ${ROLE_LABEL[role]}` : `+ ${ROLE_LABEL[role]}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
                  <button
                    onClick={() => toggleVerifyUser(u)}
                    disabled={busy === `verify:${u.id}`}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer ${
                      isVerified
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isVerified ? "Verified" : "Verify"}
                  </button>

                  <button
                    onClick={() => toggleSuspendUser(u)}
                    disabled={busy === `suspend:${u.id}` || u.id === me?.id}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer disabled:opacity-40 ${
                      u.suspended
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {u.suspended ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" /> Unsuspend
                      </>
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" /> Suspend
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setInspectUser(u)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-[#0B192C] hover:border-[#0B192C] transition cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {inspectUser && (
        <AdminUserModal
          userId={inspectUser.id}
          contact={contacts[inspectUser.id]}
          onClose={() => setInspectUser(null)}
          onStatusChanged={load}
          onRoleChanged={(uid, role, active) => {
            setRoles((prev) => {
              const cur = new Set(prev[uid] ?? []);
              if (active) cur.add(role);
              else cur.delete(role);
              return { ...prev, [uid]: Array.from(cur) as ManageableRole[] };
            });
          }}
        />
      )}
    </div>
  );
}

// ───────── 2. Providers Tab (Verify Provider Account -> Badge, Feature, Suspend/Unsuspend) ─────────
function ProvidersTab() {
  const [providers, setProviders] = useState<any[]>([]);
  const [inspectProviderId, setInspectProviderId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "featured" | "none" | "suspended">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient<{ data: any[] }>("/admin/providers");
      setProviders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setVerified = async (uid: string, v: "verified" | "featured" | "none") => {
    try {
      await apiClient.put(`/admin/providers/${uid}/status`, { verified: v });
      toast.success(
        v === "verified"
          ? "Provider verified — Verified Badge awarded!"
          : v === "featured"
          ? "Provider featured — Featured Badge awarded!"
          : "Verification badge removed"
      );
      void load();
    } catch (err) {
      toast.error("Failed to update provider verification");
    }
  };

  const toggleSuspend = async (uid: string, current: boolean) => {
    try {
      await apiClient.put(`/admin/providers/${uid}/status`, { suspended: !current });
      toast.success(!current ? "Provider account suspended" : "Provider account unsuspended");
      void load();
    } catch (err) {
      toast.error("Failed to update suspension status");
    }
  };

  const filtered = providers.filter((p) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "verified"
        ? p.verified === "verified"
        : filter === "featured"
        ? p.verified === "featured"
        : filter === "suspended"
        ? Boolean(p.suspended)
        : p.verified === "none" || p.verified === "unverified" || !p.verified;

    if (!matchesFilter) return false;

    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      (p.business_name || "").toLowerCase().includes(needle) ||
      (p.profile?.full_name || "").toLowerCase().includes(needle) ||
      (p.subcategory || "").toLowerCase().includes(needle) ||
      (p.contact?.email || "").toLowerCase().includes(needle) ||
      (p.contact?.phone || "").toLowerCase().includes(needle)
    );
  });

  const verifiedCount = providers.filter((p) => p.verified === "verified" || p.verified === "featured").length;
  const suspendedCount = providers.filter((p) => p.suspended).length;

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${providers.length} service providers…`}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0B192C]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {(
            [
              { id: "all", label: `All (${providers.length})` },
              { id: "verified", label: `Verified Badge (${verifiedCount})` },
              { id: "featured", label: "Featured" },
              { id: "none", label: "Unverified" },
              { id: "suspended", label: `Suspended (${suspendedCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 font-semibold transition cursor-pointer ${
                filter === f.id
                  ? "bg-[#0B192C] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Loading service providers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No service providers found matching your filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => {
            const displayName = p.business_name || p.profile?.full_name || "Provider";
            const subDisplayName =
              p.business_name && p.profile?.full_name && p.business_name !== p.profile.full_name
                ? p.profile.full_name
                : null;

            return (
              <div
                key={p.user_id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-xs transition sm:flex-row sm:items-center sm:justify-between ${
                  p.suspended ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    {p.profile?.avatar_url ? (
                      <img
                        src={p.profile.avatar_url}
                        alt={displayName}
                        className="h-12 w-12 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B192C]/10 text-[#0B192C] font-bold text-sm">
                        {displayName[0]?.toUpperCase() || "P"}
                      </div>
                    )}
                    {(p.verified === "verified" || p.verified === "featured") && (
                      <span
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white"
                        title="Verified Badge Active"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-[#0B192C] truncate">{displayName}</p>
                      {subDisplayName && (
                        <span className="text-xs text-slate-500">({subDisplayName})</span>
                      )}

                      {p.verified === "featured" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                          <Sparkles className="h-3 w-3" /> FEATURED BADGE
                        </span>
                      )}
                      {p.verified === "verified" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> VERIFIED BADGE
                        </span>
                      )}
                      {p.suspended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-extrabold text-red-700">
                          <Ban className="h-3 w-3" /> SUSPENDED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.subcategory || "General Services"}
                      {p.services_count !== undefined && (
                        <span className="ml-2 font-semibold text-[#0B192C]">
                          · {p.services_count} {p.services_count === 1 ? "service" : "services"} posted
                        </span>
                      )}
                      {(p.district || p.town) && (
                        <span className="ml-2">
                          · {[p.district, p.town].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </p>
                    {(p.contact?.email || p.contact?.phone) && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {[p.contact.email, p.contact.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
                  <button
                    onClick={() =>
                      setVerified(p.user_id, p.verified === "verified" ? "none" : "verified")
                    }
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer ${
                      p.verified === "verified"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {p.verified === "verified" ? "Verified ✓" : "Verify Badge"}
                  </button>

                  <button
                    onClick={() =>
                      setVerified(p.user_id, p.verified === "featured" ? "verified" : "featured")
                    }
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer ${
                      p.verified === "featured"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {p.verified === "featured" ? "Featured ★" : "Feature"}
                  </button>

                  {(p.verified === "verified" || p.verified === "featured") && (
                    <button
                      onClick={() => setVerified(p.user_id, "none")}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Unverify
                    </button>
                  )}

                  <button
                    onClick={() => toggleSuspend(p.user_id, p.suspended)}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer ${
                      p.suspended
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {p.suspended ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" /> Unsuspend
                      </>
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" /> Suspend
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setInspectProviderId(p.user_id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-[#0B192C] hover:border-[#0B192C] transition cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inspectProviderId && (
        <AdminUserModal
          userId={inspectProviderId}
          onClose={() => setInspectProviderId(null)}
          onStatusChanged={load}
        />
      )}
    </div>
  );
}

// ───────── 3. Posted Services Tab (NEW — Inspect, Activate/Deactivate, or Delete Posted Services) ─────────
function ServicesTab() {
  const [services, setServices] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "verified">("all");
  const [inspectProviderId, setInspectProviderId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient<{ data: { services: any[]; totalCount?: number; total?: number } }>(
        "/admin/services"
      );
      const list = data.data.services || [];
      setServices(list);
      setTotalCount(data.data.totalCount ?? data.data.total ?? list.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load posted services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (s: any) => {
    try {
      await apiClient.put(`/admin/services/${s.id}/status`, { active: !s.active });
      toast.success(!s.active ? "Service activated" : "Service hidden");
      void load();
    } catch (err) {
      toast.error("Failed to update service status");
    }
  };

  const deleteService = async (s: any) => {
    if (!confirm(`Delete service "${s.title}"? This action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/services/${s.id}`);
      toast.success("Service deleted");
      void load();
    } catch (err) {
      toast.error("Failed to delete service");
    }
  };

  const filtered = services.filter((s) => {
    if (filter === "active" && (!s.active || s.suspended)) return false;
    if (filter === "inactive" && s.active && !s.suspended) return false;
    if (filter === "verified" && s.verified !== "verified" && s.verified !== "featured") return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      (s.title || "").toLowerCase().includes(needle) ||
      (s.provider_name || "").toLowerCase().includes(needle) ||
      (s.category_slug || "").toLowerCase().includes(needle) ||
      (s.subcategory || "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Services Posted</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0B192C]">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Service Packages</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f47b16]">
            {services.filter((s) => s.source === "profile_service" || s.source === "profile_services").length}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Active & Visible</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">
            {services.filter((s) => s.active && !s.suspended).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">By Verified Providers</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-600">
            {services.filter((s) => s.verified === "verified" || s.verified === "featured").length}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posted services by title, provider, or category…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0B192C]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {(
            [
              { id: "all", label: `All (${services.length})` },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Hidden / Suspended" },
              { id: "verified", label: "Verified Providers" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 font-semibold transition cursor-pointer ${
                filter === f.id
                  ? "bg-[#0B192C] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Loading posted services…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No services match your filter.
          </div>
        ) : (
          filtered.map((s) => {
            const priceText = s.price_fixed_ugx
              ? `UGX ${Number(s.price_fixed_ugx).toLocaleString()}`
              : s.price_guidance_ugx
              ? `From UGX ${Number(s.price_guidance_ugx).toLocaleString()}`
              : s.price_min_ugx
              ? `UGX ${Number(s.price_min_ugx).toLocaleString()} - ${Number(s.price_max_ugx || s.price_min_ugx).toLocaleString()}`
              : "Negotiable";

            return (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#0B192C]">{s.title}</p>
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-[#f47b16]">
                      {priceText}
                    </span>
                    {!s.active && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        Hidden
                      </span>
                    )}
                    {s.suspended && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                        Provider Suspended
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{s.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      By <strong className="text-[#0B192C]">{s.provider_name}</strong>
                    </span>
                    {(s.verified === "verified" || s.verified === "featured") && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    )}
                    {s.category_slug && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] capitalize text-slate-600">
                        {s.category_slug.replace(/-/g, " ")}
                      </span>
                    )}
                    {s.created_at && <span>· Posted {timeAgo(s.created_at)}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
                  {s.owner_id && (
                    <button
                      onClick={() => setInspectProviderId(s.owner_id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-[#0B192C] hover:border-[#0B192C] transition cursor-pointer"
                    >
                      Provider
                    </button>
                  )}
                  {(s.source === "profile_service" || s.source === "profile_services") && (
                    <>
                      <button
                        onClick={() => toggleActive(s)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:border-[#0B192C] transition cursor-pointer"
                      >
                        {s.active ? "Hide" : "Activate"}
                      </button>
                      <button
                        onClick={() => deleteService(s)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {inspectProviderId && (
        <AdminUserModal
          userId={inspectProviderId}
          onClose={() => setInspectProviderId(null)}
          onStatusChanged={load}
        />
      )}
    </div>
  );
}

// ───────── 4. Community Posts Tab (Delete Any Community Post, Hide/Unhide, Feature) ─────────
function PostsTab() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden" | "featured">("all");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient<{ data: PostRow[] }>("/admin/posts");
      setPosts(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const featurePost = async (id: string, current: boolean) => {
    try {
      await apiClient.put(`/admin/posts/${id}/feature`, { featured: !current });
      toast.success(!current ? "Post featured" : "Removed from featured");
      void load();
    } catch (err) {
      toast.error("Failed to update featured status");
    }
  };

  const toggleHidePost = async (id: string, currentHidden: boolean) => {
    try {
      await apiClient.put(`/admin/posts/${id}/hide`, { hidden: !currentHidden });
      toast.success(!currentHidden ? "Post hidden from public feed" : "Post restored to public feed");
      void load();
    } catch (err) {
      toast.error("Failed to toggle post visibility");
    }
  };

  const deletePostAdmin = async (id: string) => {
    if (!confirm("Permanently delete this community post? This action cannot be undone.")) return;
    try {
      await apiClient.delete(`/admin/posts/${id}`);
      toast.success("Community post permanently deleted");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

  const filtered = posts.filter((p) => {
    if (filter === "visible" && p.hidden) return false;
    if (filter === "hidden" && !p.hidden) return false;
    if (filter === "featured" && !p.featured) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      (p.text || "").toLowerCase().includes(needle) ||
      (p.title || "").toLowerCase().includes(needle) ||
      (p.author?.full_name || "").toLowerCase().includes(needle) ||
      (p.service_title || "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${posts.length} community posts…`}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0B192C]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {(
            [
              { id: "all", label: `All Posts (${posts.length})` },
              { id: "visible", label: `Visible (${posts.filter((p) => !p.hidden).length})` },
              { id: "featured", label: `Featured (${posts.filter((p) => p.featured).length})` },
              { id: "hidden", label: `Hidden (${posts.filter((p) => p.hidden).length})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 font-semibold transition cursor-pointer ${
                filter === f.id
                  ? "bg-[#0B192C] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Loading community posts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No community posts match your filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            >
              {/* Admin Moderation Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">Post #{p.id.slice(0, 8)}</span>
                  {p.featured && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Featured
                    </span>
                  )}
                  {p.hidden && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      Hidden from Feed
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => featurePost(p.id, p.featured)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                      p.featured
                        ? "bg-amber-500 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
                    }`}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {p.featured ? "Unfeature" : "Feature"}
                  </button>

                  <button
                    onClick={() => toggleHidePost(p.id, p.hidden)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:border-[#0B192C] transition cursor-pointer"
                  >
                    {p.hidden ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-emerald-600" /> Restore Post
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-slate-500" /> Hide Post
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => deletePostAdmin(p.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Post
                  </button>
                </div>
              </div>

              <div className="p-2">
                <PostCard post={p} onChanged={load} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Recommendations ─────────
function RecsTab() {
  const [recs, setRecs] = useState<
    Array<{
      id: string;
      message: string;
      service: string;
      hidden: boolean;
      created_at: string;
      user_id: string;
      provider_user_id: string;
    }>
  >([]);
  const load = async () => {
    try {
      const { data } = await apiClient<{ data: any[] }>("/admin/recs");
      setRecs(data.data);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const hideRec = async (id: string, hidden: boolean) => {
    try {
      await apiClient.put(`/admin/recs/${id}/hide`, { hidden: !hidden });
      void load();
    } catch (err) {
      toast.error("Failed");
    }
  };
  return (
    <div className="space-y-2.5">
      {recs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No recommendations yet.
        </div>
      )}
      {recs.map((r) => (
        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              <span className="font-bold text-[#0B192C]">{r.service}</span>{" "}
              {r.hidden && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  Hidden
                </span>
              )}
            </p>
            <button
              onClick={() => hideRec(r.id, r.hidden)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-[#f47b16] hover:border-[#f47b16]"
            >
              {r.hidden ? "Unhide" : "Hide"}
            </button>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">{r.message}</p>
        </div>
      ))}
    </div>
  );
}

// ───────── Reports ─────────
function ReportsTab() {
  const [reports, setReports] = useState<
    Array<{
      id: string;
      target_type: string;
      target_id: string;
      reason: string;
      details: string | null;
      status: string;
      created_at: string;
      reporter_id: string;
    }>
  >([]);
  const [filter, setFilter] = useState<"open" | "reviewing" | "resolved" | "dismissed" | "all">(
    "open"
  );
  const load = async () => {
    try {
      const { data } = await apiClient<{ data: any[] }>(`/admin/reports?status=${filter}`);
      setReports(data.data);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    void load();
  }, [filter]);
  const setReportStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    try {
      await apiClient.put(`/admin/reports/${id}/status`, { status });
      void load();
    } catch (err) {
      toast.error("Failed");
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 text-xs">
        {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 font-semibold capitalize cursor-pointer ${
              filter === f
                ? "bg-[#0B192C] text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {reports.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No reports in this view.
        </div>
      )}
      {reports.map((r) => (
        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                <span className="font-bold text-[#0B192C]">{r.reason}</span> on{" "}
                <span className="font-mono text-xs">
                  {r.target_type}/{r.target_id.slice(0, 8)}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {timeAgo(r.created_at)} · status: <span className="font-semibold">{r.status}</span>
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setReportStatus(r.id, "reviewing")}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
              >
                Reviewing
              </button>
              <button
                onClick={() => setReportStatus(r.id, "resolved")}
                className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"
              >
                Resolve
              </button>
              <button
                onClick={() => setReportStatus(r.id, "dismissed")}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>
          {r.details && <p className="mt-2 text-xs text-slate-600">{r.details}</p>}
        </div>
      ))}
    </div>
  );
}

// ───────── Official Account ─────────
type SubTab = "account" | "create" | "manage" | "seeded" | "claims";

function OfficialTabContent({ initialSub }: { initialSub?: SubTab }) {
  const [sub, setSub] = useState<SubTab>(initialSub ?? "account");
  const [account, setAccount] = useState<OfficialAccountRow | null>(null);
  const [posts, setPosts] = useState<OfficialPostRow[]>([]);
  const [editing, setEditing] = useState<OfficialPostRow | null>(null);
  const [seeded, setSeeded] = useState<
    Array<{
      user_id: string;
      business_name: string | null;
      subcategory: string;
      seeded_status: string | null;
      verified: string;
    }>
  >([]);
  const [claims, setClaims] = useState<
    Array<{
      id: string;
      service_profile_user_id: string;
      requester_user_id: string;
      full_name: string;
      relationship_to_profile: string;
      explanation: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [revealed, setRevealed] = useState<
    Record<
      string,
      {
        phone_number: string | null;
        email: string | null;
        whatsapp_number: string | null;
        supporting_file_url: string | null;
      }
    >
  >({});

  const load = async () => {
    try {
      const { data } = await apiClient<{ data: any }>("/admin/official");
      setAccount(data.data.account);
      setPosts(data.data.posts);
      setSeeded(data.data.seeded);
      setClaims(data.data.claims);
    } catch (err) {
      console.error(err);
    }
  };

  const revealClaimContact = async (id: string) => {
    if (revealed[id]) return;
    try {
      const { data } = await apiClient<{ data: any }>(`/admin/official/claim-contact/${id}`);
      if (data.data) setRevealed((prev) => ({ ...prev, [id]: data.data }));
    } catch (err) {
      toast.error("Could not reveal contact");
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const togglePost = async (
    id: string,
    field: "is_featured" | "is_pinned" | "is_homepage",
    v: boolean
  ) => {
    try {
      await apiClient.put(`/admin/official/posts/${id}`, { field, value: !v });
      void load();
    } catch (err) {
      toast.error("Failed");
    }
  };
  const deletePost = async (id: string) => {
    if (!confirm("Delete this official post?")) return;
    try {
      await apiClient.delete(`/admin/official/posts/${id}`);
      void load();
    } catch (err) {
      toast.error("Failed");
    }
  };
  const setSeededStatus = async (
    uid: string,
    status: "unclaimed" | "claim_pending" | "claimed"
  ) => {
    try {
      await apiClient.put(`/admin/official/seeded/${uid}/status`, { seeded_status: status });
      void load();
    } catch (err) {
      toast.error("Failed");
    }
  };
  const reviewClaim = async (
    id: string,
    requester: string,
    profileUid: string,
    decision: "approved" | "rejected"
  ) => {
    try {
      await apiClient.put(`/admin/official/claims/${id}/review`, {
        requester_user_id: requester,
        service_profile_user_id: profileUid,
        decision,
      });
      toast.success(
        decision === "approved" ? "Claim approved and profile reassigned" : "Claim rejected"
      );
      void load();
    } catch (err) {
      toast.error("Failed");
    }
  };

  const subs: { id: SubTab; label: string }[] = [
    { id: "account", label: "Account Setup" },
    { id: "create", label: editing ? "Edit Post" : "Create Post" },
    { id: "manage", label: `Manage Posts (${posts.length})` },
    { id: "seeded", label: `Seeded Providers (${seeded.length})` },
    { id: "claims", label: `Claim Requests (${claims.filter((c) => c.status === "pending").length})` },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {subs.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSub(s.id);
              if (s.id !== "create") setEditing(null);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
              sub === s.id
                ? "bg-[#0B192C] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[#0B192C]"
            }`}
          >
            {s.label}
          </button>
        ))}
        <a
          href="http://localhost:8000/official"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-full border border-[#f47b16] px-3.5 py-1.5 text-xs font-bold text-[#f47b16] hover:bg-orange-50 transition"
        >
          View public page ↗
        </a>
      </div>

      {sub === "account" && <OfficialAccountForm account={account} onSaved={load} />}

      {sub === "create" &&
        (account ? (
          <OfficialPostForm
            accountId={account.id}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              setSub("manage");
              void load();
            }}
          />
        ) : (
          <p className="text-sm text-slate-500">Create the official account first.</p>
        ))}

      {sub === "manage" && (
        <div className="space-y-2.5">
          {posts.length === 0 && <p className="text-sm text-slate-500">No official posts yet.</p>}
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    officialPostTypeMap[p.post_type]?.color
                  }`}
                >
                  {officialPostTypeMap[p.post_type]?.label}
                </span>
                <p className="font-bold text-[#0B192C]">{p.title}</p>
                <span className="text-[10px] text-slate-400">
                  {timeAgo(p.created_at)} · {p.status}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => {
                    setEditing(p);
                    setSub("create");
                  }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => togglePost(p.id, "is_pinned", p.is_pinned)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50"
                >
                  {p.is_pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => togglePost(p.id, "is_featured", p.is_featured)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50"
                >
                  {p.is_featured ? "Unfeature" : "Feature"}
                </button>
                <button
                  onClick={() => togglePost(p.id, "is_homepage", p.is_homepage)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50"
                >
                  {p.is_homepage ? "Hide from home" : "Show on home"}
                </button>
                <button
                  onClick={() => deletePost(p.id)}
                  className="rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "seeded" && (
        <div className="space-y-2.5">
          {seeded.length === 0 && (
            <p className="text-sm text-slate-500">No seeded provider profiles yet.</p>
          )}
          {seeded.map((s) => (
            <div
              key={s.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div>
                <p className="font-bold text-[#0B192C]">{s.business_name || s.user_id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">
                  {s.subcategory} · status: {s.seeded_status ?? "unclaimed"} · {s.verified}
                </p>
              </div>
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={() => setSeededStatus(s.user_id, "unclaimed")}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50"
                >
                  Unclaimed
                </button>
                <button
                  onClick={() => setSeededStatus(s.user_id, "claimed")}
                  className="rounded-lg bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800"
                >
                  Mark claimed
                </button>
                <Link
                  to="/u/$id"
                  params={{ id: s.user_id }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "claims" && (
        <div className="space-y-2.5">
          {claims.length === 0 && <p className="text-sm text-slate-500">No claim requests yet.</p>}
          {claims.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border bg-white p-4 shadow-xs ${
                c.status === "pending" ? "border-amber-300" : "border-slate-200 opacity-80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[#0B192C]">
                    {c.full_name}
                    {revealed[c.id]?.phone_number && (
                      <span className="ml-2 text-xs text-slate-500">
                        {revealed[c.id]?.phone_number}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.relationship_to_profile} · {timeAgo(c.created_at)} ·{" "}
                    <span className="font-bold">{c.status}</span>
                  </p>
                </div>
                {c.status === "pending" && (
                  <div className="flex shrink-0 gap-1.5 text-xs">
                    <button
                      onClick={() =>
                        reviewClaim(c.id, c.requester_user_id, c.service_profile_user_id, "approved")
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        reviewClaim(c.id, c.requester_user_id, c.service_profile_user_id, "rejected")
                      }
                      className="rounded-lg bg-red-50 px-3 py-1 font-bold text-red-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
              {c.explanation && <p className="mt-2 text-xs text-slate-600">{c.explanation}</p>}
              {!revealed[c.id] ? (
                <button
                  onClick={() => revealClaimContact(c.id)}
                  className="mt-2 inline-block text-[11px] font-semibold text-[#f47b16] underline"
                >
                  Reveal contact &amp; supporting file
                </button>
              ) : (
                <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                  {revealed[c.id]?.email && <p>Email: {revealed[c.id]?.email}</p>}
                  {revealed[c.id]?.whatsapp_number && (
                    <p>WhatsApp: {revealed[c.id]?.whatsapp_number}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
