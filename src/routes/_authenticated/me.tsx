import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { Avatar } from "@/components/social/Avatar";
import { RemovePhotoConfirm } from "@/components/RemovePhotoConfirm";
import { MyRequestsSummary } from "@/components/MyRequestsSummary";
import { MyTrustStatusCard } from "@/components/trust/MyTrustStatusCard";
import { IdentityBadges } from "@/components/profile/IdentityBadges";
import { fetchIdentityStatus, type IdentityStatus } from "@/lib/profile-badges";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({ meta: [{ title: "My profile — Tuungane" }] }),
  component: Me,
});

function Me() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; bio: string | null; town: string | null; district: string | null } | null>(null);
  const [following, setFollowing] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [saved, setSaved] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [recsCount, setRecsCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: "/me" } as never }); }, [loading, user, nav]);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.rpc("get_my_profile").maybeSingle();
    setProfile(p ? { full_name: p.full_name ?? "", avatar_url: p.avatar_url ?? null, bio: p.bio ?? null, town: p.town ?? null, district: p.district ?? null } as never : null);
    const { data: f } = await supabase.from("follows").select("provider_user_id").eq("follower_id", user.id);
    const ids = (f ?? []).map((x) => x.provider_user_id);
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      setFollowing(ps ?? []);
    } else setFollowing([]);
    const { data: s } = await supabase.from("saved_providers").select("provider_user_id").eq("user_id", user.id);
    const sids = (s ?? []).map((x) => x.provider_user_id);
    if (sids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", sids);
      setSaved(ps ?? []);
    } else setSaved([]);
    const [{ count: rc }, { count: rec }] = await Promise.all([
      supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("provider_recommendations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setReviewsCount(rc ?? 0); setRecsCount(rec ?? 0);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  if (!user || !profile) return null;

  const save = async (patch: Partial<typeof profile>) => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); load(); }
  };

  const onAvatar = async (file: File) => {
    try {
      setBusy(true);
      const url = await uploadMedia(user.id, file, "avatars");
      await save({ avatar_url: url });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); setBusy(false); }
  };

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <Avatar name={profile.full_name} url={profile.avatar_url} size={80} verifiedRing={!!profile.avatar_url} />
            <div className="flex-1">
              <input defaultValue={profile.full_name} onBlur={(e) => e.target.value !== profile.full_name && save({ full_name: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent font-display text-xl font-bold text-navy hover:border-border focus:border-orange focus:outline-none px-2 py-1" />
              <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-orange hover:text-orange/80">
                {profile.avatar_url ? "Change photo" : "Add a profile photo"}
                <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
              </label>
              {profile.avatar_url && (
                <span className="ml-3 inline-block">
                  <RemovePhotoConfirm onConfirm={() => save({ avatar_url: null })} disabled={busy} />
                </span>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Your photo helps people recognize you on Tuungane. You can change or remove it anytime.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="District" value={profile.district ?? ""} onSave={(v) => save({ district: v })} />
            <Field label="Town" value={profile.town ?? ""} onSave={(v) => save({ town: v })} />
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-navy">Bio</label>
            <textarea defaultValue={profile.bio ?? ""} onBlur={(e) => e.target.value !== (profile.bio ?? "") && save({ bio: e.target.value })} rows={3} className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="Reviews written" value={reviewsCount} />
          <Stat label="Recommendations made" value={recsCount} />
        </div>

        <div className="mt-6">
          <MyRequestsSummary limit={3} />
        </div>

        <MyTrustStatusCard />


        <SubSection title="Providers you follow" items={following} empty="You don't follow anyone yet. Follow providers to keep tabs on their updates." emptyAction={{ label: "Browse services", to: "/services" }} />
        <SubSection title="Saved providers" items={saved} empty="No saved providers yet. Save providers to come back to them later." emptyAction={{ label: "Browse services", to: "/services" }} />

      </section>
    </Layout>
  );
}

function Field({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input defaultValue={value} onBlur={(e) => e.target.value !== value && onSave(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border bg-card p-4 text-center"><p className="font-display text-2xl font-bold text-navy">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function SubSection({ title, items, empty, emptyAction }: { title: string; items: Array<{ id: string; full_name: string; avatar_url: string | null }>; empty: string; emptyAction?: { label: string; to: string } }) {
  return (
    <div className="mt-6">
      <h3 className="font-display text-base font-bold text-navy">{title}</h3>
      {items.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{empty}</p>
          {emptyAction && (
            <Link to={emptyAction.to} className="mt-3 inline-flex items-center rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-orange/90">
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-3">
          {items.map((i) => (
            <Link key={i.id} to="/u/$id" params={{ id: i.id }} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-orange">
              <Avatar name={i.full_name} url={i.avatar_url} size={24} />
              {i.full_name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
