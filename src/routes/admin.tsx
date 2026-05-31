import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { OfficialAccountForm } from "@/components/admin/OfficialAccountForm";
import { OfficialPostForm } from "@/components/admin/OfficialPostForm";
import { officialPostTypeMap, type OfficialAccountRow, type OfficialPostRow } from "@/data/officialPostTypes";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Tuungane" }] }),
  component: Admin,
});

type Tab = "reports" | "posts" | "providers" | "recs" | "official";

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
          {(["reports", "posts", "providers", "recs"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "text-orange border-b-2 border-orange" : "text-muted-foreground"}`}>{t === "recs" ? "Recommendations" : t}</button>
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
        </div>
      </section>
    </Layout>
  );
}
