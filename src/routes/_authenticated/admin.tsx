import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { OfficialAccountForm } from "@/components/admin/OfficialAccountForm";
import { OfficialPostForm } from "@/components/admin/OfficialPostForm";
import { RequestsAdminTab } from "@/components/admin/RequestsAdminTab";
import { CreditsAdminTab } from "@/components/admin/CreditsAdminTab";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { BusinessesAdminTab } from "@/components/admin/BusinessesAdminTab";
import { DisputesAdminTab } from "@/components/admin/DisputesAdminTab";

import { ContactAnalyticsTab } from "@/components/admin/ContactAnalyticsTab";
import { ActivityLogTab } from "@/components/admin/ActivityLogTab";
import { LocationsTab } from "@/components/admin/LocationsTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { TrustVerificationCenter } from "@/components/admin/trust/TrustVerificationCenter";
import { officialPostTypeMap, type OfficialAccountRow, type OfficialPostRow } from "@/data/officialPostTypes";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Tuungane" }] }),
  component: Admin,
});

type Tab =
  | "overview"
  | "users" | "providers" | "businesses"
  | "requests" | "posts" | "recs"
  | "reports" | "disputes" | "trust"
  | "credits" | "official" | "contact" | "activity" | "locations" | "categories";

const TAB_GROUPS: { label: string; tabs: { id: Tab; label: string; adminOnly?: boolean }[] }[] = [
  { label: "Home", tabs: [{ id: "overview", label: "Overview" }] },
  { label: "People & Pages", tabs: [
    { id: "users", label: "Users" },
    { id: "providers", label: "Providers" },
    { id: "businesses", label: "Businesses" },
  ]},
  { label: "Content", tabs: [
    { id: "requests", label: "Manage Requests" },
    { id: "posts", label: "Posts" },
    { id: "recs", label: "Recommendations" },
  ]},
  { label: "Trust & Verification", tabs: [
    { id: "trust", label: "Trust Center" },
  ]},
  { label: "Trust & Safety", tabs: [
    { id: "reports", label: "Reports" },
    { id: "disputes", label: "Disputes" },
    { id: "contact", label: "Contact gating" },
  ]},
  { label: "Operations", tabs: [
    { id: "credits", label: "Credits & Boosts" },
    { id: "official", label: "Official Account" },
    { id: "locations", label: "Locations", adminOnly: true },
    { id: "categories", label: "Categories" },
    { id: "activity", label: "Activity Log", adminOnly: true },
  ]},
];

function Admin() {
  const { user, loading, isModerator, isAdmin } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [officialSub, setOfficialSub] = useState<"account" | "create" | "manage" | "seeded" | "claims" | undefined>(undefined);

  useEffect(() => {
    if (!loading) {
      if (!user) nav({ to: "/login", search: { tab: "login", redirect: "/admin" } as never });
      else if (!isModerator) toast.error("Moderator access required");
    }
  }, [loading, user, isModerator, nav]);

  if (!isModerator) {
    return <Layout><div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Moderator access required. {isAdmin ? "" : "Ask an admin to grant you moderator rights via the user_roles table."}</div></Layout>;
  }

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-3xl font-bold text-navy">Admin & moderation</h1>
          <p className="text-xs text-muted-foreground">Signed in as {user?.email} · {isAdmin ? "admin" : "moderator"}</p>
        </div>

        <nav className="mt-6 space-y-2 border-b border-border pb-3">
          {TAB_GROUPS.map((g) => {
            const visible = g.tabs.filter((t) => !t.adminOnly || isAdmin);
            if (visible.length === 0) return null;
            return (
              <div key={g.label} className="flex flex-wrap items-center gap-1">
                <span className="mr-2 w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.label}</span>
                {visible.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="mt-6">
          {tab === "overview" && <OverviewTab onJump={(t, sub) => { setTab(t as Tab); if (t === "official" && sub) setOfficialSub(sub as "account" | "create" | "manage" | "seeded" | "claims"); }} />}
          {tab === "users" && <UsersTab />}
          {tab === "providers" && <ProvidersTab />}
          {tab === "businesses" && <BusinessesAdminTab />}
          {tab === "requests" && <RequestsAdminTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "recs" && <RecsTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "disputes" && <DisputesAdminTab />}
          {tab === "credits" && <CreditsAdminTab />}
          {tab === "official" && <OfficialTabContent initialSub={officialSub} />}
          {tab === "contact" && <ContactAnalyticsTab />}
          {tab === "activity" && isAdmin && <ActivityLogTab />}
          {tab === "locations" && isAdmin && <LocationsTab />}
          {tab === "categories" && <CategoriesTab />}
        </div>
      </section>
    </Layout>
  );
}

// ───────── Users ─────────
type ManageableRole = "admin" | "moderator" | "finance_admin";
const ROLE_LABEL: Record<ManageableRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  finance_admin: "Finance Admin",
};
const ROLE_HINT: Record<ManageableRole, string> = {
  admin: "Full access — manage users, roles, and all settings",
  moderator: "Moderate posts, reports, disputes, and content",
  finance_admin: "Approve credit purchases, adjust wallets, manage boosts",
};

function UsersTab() {
  const { isAdmin, user: me } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; full_name: string; district: string | null; town: string | null; is_provider: boolean; created_at: string }>>([]);
  const [contacts, setContacts] = useState<Record<string, { email: string | null; phone: string | null }>>({});
  const [roles, setRoles] = useState<Record<string, ManageableRole[]>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,district,town,is_provider,created_at").order("created_at", { ascending: false }).limit(200);
      const list = data ?? [];
      setRows(list);
      const ids = list.map((r) => r.id);
      if (ids.length) {
        const { data: cs } = await supabase.rpc("admin_list_user_contacts", { _ids: ids });
        const cmap: Record<string, { email: string | null; phone: string | null }> = {};
        for (const c of (cs ?? []) as Array<{ id: string; email: string | null; phone: string | null }>) {
          cmap[c.id] = { email: c.email, phone: c.phone };
        }
        setContacts(cmap);
        if (isAdmin) {
          const { data: rs } = await supabase.rpc("admin_list_user_roles", { _ids: ids });
          const rmap: Record<string, ManageableRole[]> = {};
          for (const r of (rs ?? []) as Array<{ user_id: string; role: string }>) {
            if (r.role === "admin" || r.role === "moderator" || r.role === "finance_admin") {
              (rmap[r.user_id] ||= []).push(r.role);
            }
          }
          setRoles(rmap);
        }
      }
    })();
  }, [isAdmin]);

  const toggleRole = async (userId: string, role: ManageableRole, has: boolean) => {
    if (!isAdmin) return;
    if (role === "admin" && has && userId === me?.id) {
      toast.error("You can't remove your own admin role");
      return;
    }
    setBusy(`${userId}:${role}`);
    const fn = has ? "admin_revoke_role" : "admin_grant_role";
    const { error } = await supabase.rpc(fn as never, { _user_id: userId, _role: role } as never);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setRoles((prev) => {
      const cur = new Set(prev[userId] ?? []);
      if (has) cur.delete(role); else cur.add(role);
      return { ...prev, [userId]: Array.from(cur) as ManageableRole[] };
    });
    toast.success(has ? `${ROLE_LABEL[role]} revoked` : `${ROLE_LABEL[role]} granted`);
  };

  const filtered = q
    ? rows.filter((r) => {
        const needle = q.toLowerCase();
        const c = contacts[r.id];
        return (r.full_name || "").toLowerCase().includes(needle)
          || (c?.email || "").toLowerCase().includes(needle)
          || (c?.phone || "").toLowerCase().includes(needle);
      })
    : rows;

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-navy">Roles & access</p>
          <ul className="mt-1 space-y-0.5">
            {(Object.keys(ROLE_LABEL) as ManageableRole[]).map((r) => (
              <li key={r}><span className="font-semibold text-foreground">{ROLE_LABEL[r]}:</span> {ROLE_HINT[r]}</li>
            ))}
          </ul>
          <p className="mt-2">Search for a user below, then tap a role chip to grant or revoke.</p>
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, or phone…" className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm" />
      {filtered.map((u) => {
        const c = contacts[u.id];
        const userRoles = roles[u.id] ?? [];
        return (
          <div key={u.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">
                {u.full_name || "Unnamed"}
                {u.is_provider && <span className="ml-2 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">PROVIDER</span>}
                {userRoles.map((r) => (
                  <span key={r} className="ml-2 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-bold text-navy">{ROLE_LABEL[r].toUpperCase()}</span>
                ))}
              </p>
              <p className="text-xs text-muted-foreground">{[u.district, u.town].filter(Boolean).join(" · ") || "—"} · joined {timeAgo(u.created_at)}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {c?.email ? (
                  <a href={`mailto:${c.email}`} className="text-navy hover:text-orange break-all">{c.email}</a>
                ) : <span className="text-muted-foreground">no email</span>}
                {c?.phone ? (
                  <a href={`tel:${c.phone}`} className="text-navy hover:text-orange">{c.phone}</a>
                ) : <span className="text-muted-foreground">no phone</span>}
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
                        title={disabled && isMe && role === "admin" ? "You can't remove your own admin role" : ROLE_HINT[role]}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${has ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}
                      >
                        {has ? `✓ ${ROLE_LABEL[role]}` : `+ ${ROLE_LABEL[role]}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Link to="/u/$id" params={{ id: u.id }} className="self-start rounded border border-border px-2 py-1 text-xs">View</Link>
          </div>
        );
      })}
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No users.</p>}
    </div>
  );
}

// ───────── Providers ─────────
function ProvidersTab() {
  const [providers, setProviders] = useState<Array<{ user_id: string; business_name: string | null; subcategory: string; verified: string; suspended: boolean; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const load = async () => {
    const { data: sp } = await supabase.from("service_profiles").select("user_id,business_name,subcategory,verified,suspended").limit(200);
    const ids = (sp ?? []).map((x) => x.user_id);
    const pm = ids.length ? (await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids)).data ?? [] : [];
    const map = new Map(pm.map((x) => [x.id, { full_name: x.full_name, avatar_url: x.avatar_url }]));
    setProviders((sp ?? []).map((x) => ({ ...x, profile: map.get(x.user_id) })));
  };
  useEffect(() => { load(); }, []);
  const setVerified = async (uid: string, v: "verified" | "featured" | "none") => {
    await supabase.from("service_profiles").update({ verified: v }).eq("user_id", uid);
    toast.success("Updated"); load();
  };
  const toggleSuspend = async (uid: string, current: boolean) => {
    await supabase.from("service_profiles").update({ suspended: !current }).eq("user_id", uid);
    toast.success(!current ? "Suspended" : "Reinstated"); load();
  };
  return (
    <div className="space-y-2">
      {providers.length === 0 && <p className="text-sm text-muted-foreground">No providers yet.</p>}
      {providers.map((p) => (
        <div key={p.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
          <div>
            <p className="font-semibold text-navy">{p.business_name || p.profile?.full_name || "Provider"}</p>
            <p className="text-xs text-muted-foreground">{p.subcategory} · {p.verified} {p.suspended && "· suspended"}</p>
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            <Link to="/u/$id" params={{ id: p.user_id }} className="rounded border border-border px-2 py-1">View</Link>
            <button onClick={() => setVerified(p.user_id, "verified")} className="rounded bg-green/10 px-2 py-1 text-green">Verify</button>
            <button onClick={() => setVerified(p.user_id, "featured")} className="rounded bg-orange/10 px-2 py-1 text-orange">Feature</button>
            <button onClick={() => setVerified(p.user_id, "none")} className="rounded px-2 py-1 hover:bg-muted">Reset</button>
            <button onClick={() => toggleSuspend(p.user_id, p.suspended)} className="rounded bg-destructive/10 px-2 py-1 text-destructive">{p.suspended ? "Reinstate" : "Suspend"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────── Posts ─────────
function PostsTab() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const load = async () => {
    const { data: p } = await supabase.from("timeline_posts").select("*").order("created_at", { ascending: false }).limit(50);
    const ids = Array.from(new Set((p ?? []).map((x) => x.provider_user_id)));
    const pm = ids.length ? (await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids)).data ?? [] : [];
    const map = new Map(pm.map((x) => [x.id, { full_name: x.full_name, avatar_url: x.avatar_url }]));
    setPosts((p ?? []).map((x) => ({ ...x, author: map.get(x.provider_user_id) })) as PostRow[]);
  };
  useEffect(() => { load(); }, []);
  const featurePost = async (id: string, current: boolean) => {
    await supabase.from("timeline_posts").update({ featured: !current }).eq("id", id);
    load();
  };
  return (
    <div className="space-y-4">
      {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
      {posts.map((p) => (
        <div key={p.id}>
          <PostCard post={p} onChanged={load} />
          <button onClick={() => featurePost(p.id, p.featured)} className="mt-1 ml-2 text-xs text-orange">{p.featured ? "Unfeature" : "Feature this post"}</button>
        </div>
      ))}
    </div>
  );
}

// ───────── Recommendations ─────────
function RecsTab() {
  const [recs, setRecs] = useState<Array<{ id: string; message: string; service: string; hidden: boolean; created_at: string; user_id: string; provider_user_id: string }>>([]);
  const load = async () => {
    const { data } = await supabase.from("provider_recommendations").select("*").order("created_at", { ascending: false }).limit(50);
    setRecs(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const hideRec = async (id: string, hidden: boolean) => {
    await supabase.from("provider_recommendations").update({ hidden: !hidden }).eq("id", id);
    load();
  };
  return (
    <div className="space-y-2">
      {recs.length === 0 && <p className="text-sm text-muted-foreground">No recommendations.</p>}
      {recs.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm"><span className="font-semibold text-navy">{r.service}</span> {r.hidden && <span className="ml-2 text-xs text-destructive">hidden</span>}</p>
          <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>
          <button onClick={() => hideRec(r.id, r.hidden)} className="mt-2 text-xs text-orange">{r.hidden ? "Unhide" : "Hide"}</button>
        </div>
      ))}
    </div>
  );
}

// ───────── Reports ─────────
function ReportsTab() {
  const [reports, setReports] = useState<Array<{ id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string; reporter_id: string }>>([]);
  const [filter, setFilter] = useState<"open" | "reviewing" | "resolved" | "dismissed" | "all">("open");
  const load = async () => {
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setReports(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);
  const setReportStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    await supabase.from("reports").update({ status }).eq("id", id); load();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-xs">
        {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 font-semibold capitalize ${filter === f ? "bg-navy text-navy-foreground" : "border border-border text-muted-foreground"}`}>{f}</button>
        ))}
      </div>
      {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports in this view.</p>}
      {reports.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm"><span className="font-semibold text-navy">{r.reason}</span> on <span className="font-mono text-xs">{r.target_type}/{r.target_id.slice(0, 8)}</span></p>
              <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)} · status: <span className="font-medium">{r.status}</span></p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setReportStatus(r.id, "reviewing")} className="rounded px-2 py-1 text-xs hover:bg-muted">Reviewing</button>
              <button onClick={() => setReportStatus(r.id, "resolved")} className="rounded bg-green/10 px-2 py-1 text-xs text-green">Resolve</button>
              <button onClick={() => setReportStatus(r.id, "dismissed")} className="rounded px-2 py-1 text-xs hover:bg-muted">Dismiss</button>
            </div>
          </div>
          {r.details && <p className="mt-2 text-xs text-muted-foreground">{r.details}</p>}
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
  const [seeded, setSeeded] = useState<Array<{ user_id: string; business_name: string | null; subcategory: string; seeded_status: string | null; verified: string }>>([]);
  const [claims, setClaims] = useState<Array<{ id: string; service_profile_user_id: string; requester_user_id: string; full_name: string; relationship_to_profile: string; explanation: string; status: string; created_at: string }>>([]);
  const [revealed, setRevealed] = useState<Record<string, { phone_number: string | null; email: string | null; whatsapp_number: string | null; supporting_file_url: string | null }>>({});

  const load = async () => {
    const [a, p, sp, c] = await Promise.all([
      supabase.from("official_accounts").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("official_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("service_profiles").select("user_id,business_name,subcategory,seeded_status,verified").eq("seeded_by_official", true),
      // PII (phone_number, email, whatsapp_number, supporting_file_url) is fetched on demand via the get_profile_claim_contact RPC.
      supabase.from("profile_claim_requests")
        .select("id,service_profile_user_id,requester_user_id,full_name,relationship_to_profile,explanation,status,created_at")
        .order("created_at", { ascending: false }),
    ]);
    setAccount(a.data as OfficialAccountRow | null);
    setPosts((p.data ?? []) as OfficialPostRow[]);
    setSeeded(sp.data ?? []);
    setClaims(c.data ?? []);
  };

  const revealClaimContact = async (id: string) => {
    if (revealed[id]) return;
    const { data, error } = await supabase.rpc("get_profile_claim_contact", { _id: id });
    if (error) { toast.error("Could not reveal contact"); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setRevealed((prev) => ({ ...prev, [id]: row as typeof revealed[string] }));
  };
  useEffect(() => { load(); }, []);

  const togglePost = async (id: string, field: "is_featured" | "is_pinned" | "is_homepage", v: boolean) => {
    const patch: Record<string, boolean> = { [field]: !v };
    await (supabase.from("official_posts") as any).update(patch).eq("id", id); load();
  };
  const deletePost = async (id: string) => {
    if (!confirm("Delete this official post?")) return;
    await supabase.from("official_posts").delete().eq("id", id); load();
  };
  const setSeededStatus = async (uid: string, status: "unclaimed" | "claim_pending" | "claimed") => {
    await supabase.from("service_profiles").update({ seeded_status: status, seeded_by_official: true }).eq("user_id", uid); load();
  };
  const reviewClaim = async (id: string, requester: string, profileUid: string, decision: "approved" | "rejected") => {
    await supabase.from("profile_claim_requests").update({ status: decision, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (decision === "approved") {
      await supabase.from("service_profiles").update({ seeded_status: "claimed", user_id: requester }).eq("user_id", profileUid);
      toast.success("Claim approved and profile reassigned");
    } else {
      await supabase.from("service_profiles").update({ seeded_status: "unclaimed" }).eq("user_id", profileUid);
      toast.success("Claim rejected");
    }
    load();
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
          <button key={s.id} onClick={() => { setSub(s.id); if (s.id !== "create") setEditing(null); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sub === s.id ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}>{s.label}</button>
        ))}
        <Link to="/official" className="ml-auto rounded-full border border-orange px-3 py-1.5 text-xs font-semibold text-orange">View public page →</Link>
      </div>

      {sub === "account" && <OfficialAccountForm account={account} onSaved={load} />}

      {sub === "create" && (account ? <OfficialPostForm accountId={account.id} editing={editing} onSaved={() => { setEditing(null); setSub("manage"); load(); }} /> : <p className="text-sm text-muted-foreground">Create the official account first.</p>)}

      {sub === "manage" && (
        <div className="space-y-2">
          {posts.length === 0 && <p className="text-sm text-muted-foreground">No official posts yet.</p>}
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${officialPostTypeMap[p.post_type]?.color}`}>{officialPostTypeMap[p.post_type]?.label}</span>
                <p className="font-semibold text-navy">{p.title}</p>
                <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)} · {p.status}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                <button onClick={() => { setEditing(p); setSub("create"); }} className="rounded px-2 py-1 hover:bg-muted">Edit</button>
                <button onClick={() => togglePost(p.id, "is_pinned", p.is_pinned)} className="rounded px-2 py-1 hover:bg-muted">{p.is_pinned ? "Unpin" : "Pin"}</button>
                <button onClick={() => togglePost(p.id, "is_featured", p.is_featured)} className="rounded px-2 py-1 hover:bg-muted">{p.is_featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => togglePost(p.id, "is_homepage", p.is_homepage)} className="rounded px-2 py-1 hover:bg-muted">{p.is_homepage ? "Hide from home" : "Show on home"}</button>
                <button onClick={() => deletePost(p.id)} className="rounded bg-destructive/10 px-2 py-1 text-destructive">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "seeded" && (
        <div className="space-y-2">
          {seeded.length === 0 && <p className="text-sm text-muted-foreground">No seeded provider profiles yet.</p>}
          {seeded.map((s) => (
            <div key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
              <div>
                <p className="font-semibold text-navy">{s.business_name || s.user_id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{s.subcategory} · status: {s.seeded_status ?? "unclaimed"} · {s.verified}</p>
              </div>
              <div className="flex gap-1 text-xs">
                <button onClick={() => setSeededStatus(s.user_id, "unclaimed")} className="rounded px-2 py-1 hover:bg-muted">Unclaimed</button>
                <button onClick={() => setSeededStatus(s.user_id, "claimed")} className="rounded bg-green/10 px-2 py-1 text-green">Mark claimed</button>
                <Link to="/u/$id" params={{ id: s.user_id }} className="rounded border border-border px-2 py-1">View</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "claims" && (
        <div className="space-y-2">
          {claims.length === 0 && <p className="text-sm text-muted-foreground">No claim requests yet.</p>}
          {claims.filter((c) => c.status === "pending").length === 0 && claims.length > 0 && (
            <p className="text-xs text-muted-foreground">No pending claims. Showing history below.</p>
          )}
          {claims.map((c) => (
            <div key={c.id} className={`rounded-xl border bg-card p-3 ${c.status === "pending" ? "border-orange/50" : "border-border opacity-80"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{c.full_name}{revealed[c.id]?.phone_number && <span className="ml-2 text-xs text-muted-foreground">{revealed[c.id]?.phone_number}</span>}</p>
                  <p className="text-xs text-muted-foreground">{c.relationship_to_profile} · {timeAgo(c.created_at)} · <span className={`font-medium ${c.status === "pending" ? "text-orange" : c.status === "approved" ? "text-green" : "text-destructive"}`}>{c.status}</span></p>
                  <Link to="/u/$id" params={{ id: c.service_profile_user_id }} className="mt-1 inline-block text-[11px] text-orange underline">View claimed profile →</Link>
                </div>
                {c.status === "pending" && (
                  <div className="flex shrink-0 gap-1 text-xs">
                    <button onClick={() => reviewClaim(c.id, c.requester_user_id, c.service_profile_user_id, "approved")} className="rounded bg-green/10 px-2 py-1 text-green">Approve</button>
                    <button onClick={() => reviewClaim(c.id, c.requester_user_id, c.service_profile_user_id, "rejected")} className="rounded bg-destructive/10 px-2 py-1 text-destructive">Reject</button>
                  </div>
                )}
              </div>
              {c.explanation && <p className="mt-2 text-xs text-foreground/80">{c.explanation}</p>}
              {!revealed[c.id] ? (
                <button onClick={() => revealClaimContact(c.id)} className="mt-2 inline-block text-[11px] text-orange underline">Reveal contact &amp; supporting file</button>
              ) : (
                <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {revealed[c.id]?.email && <p>Email: {revealed[c.id]?.email}</p>}
                  {revealed[c.id]?.whatsapp_number && <p>WhatsApp: {revealed[c.id]?.whatsapp_number}</p>}
                  {revealed[c.id]?.supporting_file_url && <a href={revealed[c.id]!.supporting_file_url!} target="_blank" rel="noreferrer" className="inline-block text-orange underline">View supporting file</a>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
