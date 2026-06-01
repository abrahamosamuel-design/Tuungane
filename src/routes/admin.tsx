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
import { officialPostTypeMap, type OfficialAccountRow, type OfficialPostRow } from "@/data/officialPostTypes";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Tuungane" }] }),
  component: Admin,
});

type Tab = "reports" | "posts" | "providers" | "recs" | "requests" | "credits" | "official";

function Admin() {
  const { user, loading, isModerator, isAdmin } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<Array<{ id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string; reporter_id: string }>>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [providers, setProviders] = useState<Array<{ user_id: string; business_name: string | null; subcategory: string; verified: string; suspended: boolean; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [recs, setRecs] = useState<Array<{ id: string; message: string; service: string; hidden: boolean; created_at: string; user_id: string; provider_user_id: string }>>([]);

  useEffect(() => {
    if (!loading) {
      if (!user) nav({ to: "/login", search: { tab: "login", redirect: "/admin" } as never });
      else if (!isModerator) toast.error("Moderator access required");
    }
  }, [loading, user, isModerator, nav]);

  const load = async () => {
    const [r, p, sp, rc] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("timeline_posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("service_profiles").select("user_id,business_name,subcategory,verified,suspended").limit(100),
      supabase.from("provider_recommendations").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setReports(r.data ?? []);
    const ids = Array.from(new Set((p.data ?? []).map((x) => x.provider_user_id).concat((sp.data ?? []).map((x) => x.user_id))));
    const pm = ids.length ? (await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids)).data ?? [] : [];
    const map = new Map(pm.map((x) => [x.id, { full_name: x.full_name, avatar_url: x.avatar_url }]));
    setPosts((p.data ?? []).map((x) => ({ ...x, author: map.get(x.provider_user_id) })) as PostRow[]);
    setProviders((sp.data ?? []).map((x) => ({ ...x, profile: map.get(x.user_id) })));
    setRecs(rc.data ?? []);
  };

  useEffect(() => { if (isModerator) load(); }, [isModerator]);

  if (!isModerator) return <Layout><div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Moderator access required. {isAdmin ? "" : "Ask an admin to grant you moderator rights via the user_roles table."}</div></Layout>;

  const setVerified = async (uid: string, v: "verified" | "featured" | "none") => {
    await supabase.from("service_profiles").update({ verified: v }).eq("user_id", uid);
    toast.success("Updated"); load();
  };
  const toggleSuspend = async (uid: string, current: boolean) => {
    await supabase.from("service_profiles").update({ suspended: !current }).eq("user_id", uid);
    toast.success(!current ? "Suspended" : "Reinstated"); load();
  };
  const featurePost = async (id: string, current: boolean) => {
    await supabase.from("timeline_posts").update({ featured: !current }).eq("id", id);
    load();
  };
  const setReportStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    await supabase.from("reports").update({ status }).eq("id", id);
    load();
  };
  const hideRec = async (id: string, hidden: boolean) => {
    await supabase.from("provider_recommendations").update({ hidden: !hidden }).eq("id", id);
    load();
  };

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Admin & moderation</h1>
        <div className="mt-4 flex flex-wrap gap-2 border-b border-border">
          {(["reports", "posts", "providers", "recs", "requests", "credits", "official"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "text-orange border-b-2 border-orange" : "text-muted-foreground"}`}>{t === "recs" ? "Recommendations" : t === "official" ? "Official Account" : t === "requests" ? "Requests & Feedback" : t === "credits" ? "Credits & Boosts" : t}</button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "reports" && (
            <div className="space-y-3">
              {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports.</p>}
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
          )}

          {tab === "posts" && (
            <div className="space-y-4">
              {posts.map((p) => (
                <div key={p.id}>
                  <PostCard post={p} onChanged={load} />
                  <button onClick={() => featurePost(p.id, p.featured)} className="mt-1 ml-2 text-xs text-orange">{p.featured ? "Unfeature" : "Feature this post"}</button>
                </div>
              ))}
            </div>
          )}

          {tab === "providers" && (
            <div className="space-y-2">
              {providers.map((p) => (
                <div key={p.user_id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <p className="font-semibold text-navy">{p.business_name || p.profile?.full_name || "Provider"}</p>
                    <p className="text-xs text-muted-foreground">{p.subcategory} · {p.verified} {p.suspended && "· suspended"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setVerified(p.user_id, "verified")} className="rounded bg-green/10 px-2 py-1 text-xs text-green">Verify</button>
                    <button onClick={() => setVerified(p.user_id, "featured")} className="rounded bg-orange/10 px-2 py-1 text-xs text-orange">Feature</button>
                    <button onClick={() => setVerified(p.user_id, "none")} className="rounded px-2 py-1 text-xs hover:bg-muted">Reset</button>
                    <button onClick={() => toggleSuspend(p.user_id, p.suspended)} className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">{p.suspended ? "Reinstate" : "Suspend"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "recs" && (
            <div className="space-y-2">
              {recs.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-sm"><span className="font-semibold text-navy">{r.service}</span> {r.hidden && <span className="ml-2 text-xs text-destructive">hidden</span>}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>
                  <button onClick={() => hideRec(r.id, r.hidden)} className="mt-2 text-xs text-orange">{r.hidden ? "Unhide" : "Hide"}</button>
                </div>
              ))}
            </div>
          )}

          {tab === "requests" && <RequestsAdminTab />}

          {tab === "credits" && <CreditsAdminTab />}

          {tab === "official" && <OfficialTabContent />}
        </div>
      </section>
    </Layout>
  );
}

type SubTab = "account" | "create" | "manage" | "seeded" | "claims";

function OfficialTabContent() {
  const [sub, setSub] = useState<SubTab>("account");
  const [account, setAccount] = useState<OfficialAccountRow | null>(null);
  const [posts, setPosts] = useState<OfficialPostRow[]>([]);
  const [editing, setEditing] = useState<OfficialPostRow | null>(null);
  const [seeded, setSeeded] = useState<Array<{ user_id: string; business_name: string | null; subcategory: string; seeded_status: string | null; verified: string }>>([]);
  const [claims, setClaims] = useState<Array<{ id: string; service_profile_user_id: string; requester_user_id: string; full_name: string; phone_number: string; relationship_to_profile: string; explanation: string; supporting_file_url: string | null; status: string; created_at: string }>>([]);

  const load = async () => {
    const [a, p, sp, c] = await Promise.all([
      supabase.from("official_accounts").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("official_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("service_profiles").select("user_id,business_name,subcategory,seeded_status,verified").eq("seeded_by_official", true),
      supabase.from("profile_claim_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setAccount(a.data as OfficialAccountRow | null);
    setPosts((p.data ?? []) as OfficialPostRow[]);
    setSeeded(sp.data ?? []);
    setClaims(c.data ?? []);
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
          {seeded.length === 0 && <p className="text-sm text-muted-foreground">No seeded provider profiles yet. Mark a profile as seeded from the Providers tab or insert one with seeded_by_official=true.</p>}
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
          {claims.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-navy">{c.full_name} <span className="ml-2 text-xs text-muted-foreground">{c.phone_number}</span></p>
                  <p className="text-xs text-muted-foreground">{c.relationship_to_profile} · {timeAgo(c.created_at)} · <span className="font-medium">{c.status}</span></p>
                </div>
                {c.status === "pending" && (
                  <div className="flex gap-1 text-xs">
                    <button onClick={() => reviewClaim(c.id, c.requester_user_id, c.service_profile_user_id, "approved")} className="rounded bg-green/10 px-2 py-1 text-green">Approve</button>
                    <button onClick={() => reviewClaim(c.id, c.requester_user_id, c.service_profile_user_id, "rejected")} className="rounded bg-destructive/10 px-2 py-1 text-destructive">Reject</button>
                  </div>
                )}
              </div>
              {c.explanation && <p className="mt-1 text-xs text-foreground/80">{c.explanation}</p>}
              {c.supporting_file_url && <a href={c.supporting_file_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-orange underline">View supporting file</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
