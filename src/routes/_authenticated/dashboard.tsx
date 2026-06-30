import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, Megaphone, Wrench, UserCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { categories as staticCategories } from "@/data/categories";
import { useCategories } from "@/hooks/use-categories";
import { MyRequestsSummary } from "@/components/MyRequestsSummary";
import { MatchingRequestsSection } from "@/components/MatchingRequestsSection";
import { ContactedProvidersList } from "@/components/ContactedProvidersList";
import { ProviderContactsList } from "@/components/ProviderContactsList";

import { MyProfilesPanel } from "@/components/profiles/MyProfilesPanel";
import { ProfileStrengthCard } from "@/components/ProfileStrengthCard";
import { AddPhotoNudge } from "@/components/AddPhotoNudge";
import { computeProfileStrength } from "@/lib/profile-strength";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    composeBusiness: typeof search.composeBusiness === "string" ? search.composeBusiness : "",
    becomeProvider: search.becomeProvider === "1" || search.becomeProvider === 1 || search.becomeProvider === true,
  }),
  head: () => ({ meta: [{ title: "My Dashboard — Tuungane" }] }),
  component: Dashboard,
});

function Dashboard() {
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; is_provider: boolean } | null>(null);
  const [sp, setSp] = useState<{ category_slug: string; subcategory: string; business_name: string | null; bio: string; district: string; town: string; phone: string | null; whatsapp: string | null } | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [stats, setStats] = useState({ followers: 0, posts: 0, recs: 0, likes: 0, comments: 0, reviews: 0, saves: 0, opps: 0 });
  const [customerStats, setCustomerStats] = useState({ following: 0, saved: 0, savedOpps: 0, reviewsWritten: 0, recsGiven: 0 });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: "/dashboard" } as never });
  }, [loading, user, nav]);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("full_name,avatar_url,is_provider").eq("id", user.id).maybeSingle();
    setProfile(p);
    const { data: s } = await supabase.rpc("get_my_service_profile").maybeSingle();
    setSp(s as never);
    const { data: ps } = await supabase.from("timeline_posts").select("*").eq("provider_user_id", user.id).order("created_at", { ascending: false });
    setPosts((ps ?? []).map((r) => ({ ...r, author: p ?? undefined })) as PostRow[]);
    const postIds = (ps ?? []).map((r) => r.id);

    if (p?.is_provider) {
      const [{ count: f }, { count: r }, likesRes, commentsRes, { count: rv }, { count: sv }, { count: op }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("provider_user_id", user.id),
        supabase.from("provider_recommendations").select("*", { count: "exact", head: true }).eq("provider_user_id", user.id),
        postIds.length ? supabase.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", postIds) : Promise.resolve({ count: 0 } as any),
        postIds.length ? supabase.from("post_comments").select("*", { count: "exact", head: true }).in("post_id", postIds) : Promise.resolve({ count: 0 } as any),
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("provider_user_id", user.id),
        supabase.from("saved_providers").select("*", { count: "exact", head: true }).eq("provider_user_id", user.id),
        supabase.from("opportunities").select("*", { count: "exact", head: true }).eq("poster_id", user.id),
      ]);
      setStats({ followers: f ?? 0, posts: ps?.length ?? 0, recs: r ?? 0, likes: likesRes.count ?? 0, comments: commentsRes.count ?? 0, reviews: rv ?? 0, saves: sv ?? 0, opps: op ?? 0 });
    }

    // Always load customer-side stats — every member can save, follow, and review.
    const [{ count: fol }, { count: sp2 }, { count: so }, { count: rw }, { count: rg }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("saved_providers").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("saved_opportunities").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("provider_recommendations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setCustomerStats({ following: fol ?? 0, saved: sp2 ?? 0, savedOpps: so ?? 0, reviewsWritten: rw ?? 0, recsGiven: rg ?? 0 });

  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  // Provider status is automatic — derived from having a service profile or listed service.
  // The ?becomeProvider=1 flag is kept as a no-op for backward-compatible links.

  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-8 pb-40 [padding-bottom:calc(10rem+env(safe-area-inset-bottom))]">
        {/* 1. Greeting / header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Hi, {profile?.full_name?.split(" ")[0] || "there"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.is_provider
              ? "Manage your services, respond to requests, and grow your reputation."
              : "Manage your requests and connect with skilled people near you."}
          </p>
          <Link
            to="/u/$id"
            params={{ id: user.id }}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-navy hover:border-orange"
          >
            View public profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>


        {/* Member → Provider prompt */}
        {profile && !profile.is_provider && (
          <div className="mt-6 rounded-2xl border border-green/40 bg-gradient-to-br from-green/10 to-green/5 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green/15 p-2 text-green"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-navy">Offer a service too</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">You're a Tuungane member — list a skill and start receiving requests. It takes just a few minutes.</p>
                </div>
              </div>
              <Link
                to="/list-skill"
                className="shrink-0 rounded-full bg-green px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:brightness-110"
              >
                List Your Service
              </Link>
            </div>
          </div>
        )}

        {/* 2. Quick actions */}
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickAction to="/requests/new" icon={<ClipboardList className="h-5 w-5" />} label="Create request" hint="Find someone to help you" />
            {profile?.is_provider ? (
              <QuickAction to="/dashboard" icon={<Megaphone className="h-5 w-5" />} label="Post work update" hint="Share your work or offer" />
            ) : (
              <QuickAction to="/services" icon={<Wrench className="h-5 w-5" />} label="Browse services" hint="Find skilled providers" />
            )}
            <QuickAction to="/list-skill" icon={<Wrench className="h-5 w-5" />} label={sp ? "Edit service profile" : "Add service"} hint={sp ? "Update your service photo or details" : "List a service you provide"} />
            <QuickAction to="/u/$id" params={{ id: user.id }} icon={<UserCircle2 className="h-5 w-5" />} label="View public profile" hint="See how customers see you" />
          </div>
        </div>

        {/* Profile photo nudge — providers only, dismissible */}
        {profile?.is_provider && profile && !profile.avatar_url && (
          <div className="mt-6">
            <AddPhotoNudge userId={user.id} hasPhoto={!!profile.avatar_url} onUploaded={() => load()} />
          </div>
        )}

        {/* Profile strength — positive, trust-building */}
        {profile && (
          <div className="mt-6">
            <ProfileStrengthCard
              result={computeProfileStrength({
                isProvider: !!profile.is_provider,
                avatarUrl: profile.avatar_url,
                fullName: profile.full_name,
                bio: sp?.bio,
                district: sp?.district,
                town: sp?.town,
                phone: sp?.phone ?? null,
                category: sp?.category_slug,
                servicesCount: sp ? 1 : 0,
                reviewsCount: stats.reviews,
              })}
              primaryAction={{
                label: "Add profile photo",
                onClick: () => document.getElementById("dashboard-avatar-input")?.click(),
              }}
            />
            <input
              id="dashboard-avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
                if (file.size > 8 * 1024 * 1024) { toast.error("Image must be smaller than 8MB"); return; }
                try {
                  const { uploadMedia } = await import("@/lib/upload");
                  const url = await uploadMedia(user.id, file, "avatars");
                  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
                  if (error) throw error;
                  toast.success("Profile photo added — looking great!");
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Upload failed");
                }
              }}
            />
          </div>
        )}


        {/* 3. Unified stats — both sides */}
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Your activity</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Following" value={customerStats.following} />
              <Stat label="Saved providers" value={customerStats.saved} />
              <Stat label="Saved requests" value={customerStats.savedOpps} />
              <Stat label="Reviews written" value={customerStats.reviewsWritten} />
            </div>
          </div>

          {sp && (
            <div>
              <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Your services</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Services" value={1} />
                <Stat label="Work posts" value={stats.posts} />
                <Stat label="Reviews" value={stats.reviews} />
                <Stat label="Responses" value={stats.opps} />
              </div>
            </div>
          )}
        </div>

        {/* 4. Requests I created */}
        <div className="mt-6 space-y-4">
          <MyRequestsSummary title="Requests I created" />

          {/* 5. Requests matching my services — visible if user has a service profile */}
          {sp && <MatchingRequestsSection />}

          {/* 6. Contacts — both sides when relevant */}
          <ContactedProvidersList />
          {sp && <ProviderContactsList />}
        </div>


        {/* 7. Profiles & services */}
        <MyProfilesPanel />

        {search.composeBusiness && (
          <div className="mt-6">
            <h2 className="mb-3 font-display text-lg font-bold text-navy">Post update</h2>
            <PostComposer businessPageId={search.composeBusiness} onPosted={load} />
          </div>
        )}

        {profile?.is_provider && !sp && (
          <ServiceProfileForm onSaved={load} />
        )}

        {profile?.is_provider && sp && (
          <>


            {/* 8. Post to your timeline */}
            <div className="mt-6">
              <h2 className="mb-1 font-display text-lg font-bold text-navy">Post to your timeline</h2>
              <p className="mb-3 text-xs text-muted-foreground">Posting as: <span className="font-semibold text-navy">{sp.business_name || profile.full_name}</span></p>
              <PostComposer defaultCategory={sp.category_slug} onPosted={load} />
            </div>

            {/* 9. Your posts */}
            <div className="mt-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-navy">Your posts</h2>
              {posts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
                  <p className="text-sm text-muted-foreground">You have not posted any work updates yet.</p>
                </div>
              )}
              {posts.map((p) => <PostCard key={p.id} post={p} onChanged={load} />)}
            </div>

            {/* 10. Profile insights */}
            <div className="mt-8">
              <h2 className="mb-1 font-display text-lg font-bold text-navy">Profile insights</h2>
              <p className="mb-3 text-xs text-muted-foreground">Lighter trust and engagement signals from your audience.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Followers" value={stats.followers} />
                <Stat label="Profile likes" value={stats.likes} />
                <Stat label="Saves" value={stats.saves} />
                <Stat label="Endorsements" value={stats.recs} />
              </div>
            </div>
          </>
        )}

        {!profile?.is_provider && (
          <Link
            to="/list-skill"
            className="mt-6 inline-block rounded-xl bg-green px-4 py-3 text-sm font-semibold text-white hover:brightness-110"
          >List Your Service</Link>
        )}
      </section>
    </Layout>
  );
}

function QuickAction({ to, params, icon, label, hint }: { to: string; params?: Record<string, string>; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:border-orange"
    >
      <div className="shrink-0 rounded-xl bg-orange/10 p-2 text-orange">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-navy">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="font-display text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ServiceProfileForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [businessName, setBusinessName] = useState("");
  const [categorySlug, setCategorySlug] = useState(staticCategories[0].slug);
  const [subcategory, setSubcategory] = useState(staticCategories[0].subcategories[0]);
  const [bio, setBio] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);

  const cat = categories.find((c) => c.slug === categorySlug) ?? staticCategories[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("service_profiles").upsert({
      user_id: user.id, business_name: businessName || null, category_slug: categorySlug, subcategory, bio, district, town, phone: phone || null, whatsapp: whatsapp || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Service profile saved"); onSaved(); }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold text-navy">Complete your service profile</h2>
      <Input label="Business name (optional)" value={businessName} onChange={setBusinessName} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-navy">Category</label>
          <select value={categorySlug} onChange={(e) => { setCategorySlug(e.target.value); setSubcategory(categories.find((c) => c.slug === e.target.value)?.subcategories[0] ?? ""); }} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-navy">Sub-category</label>
          <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {cat.subcategories.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-navy">Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="District" value={district} onChange={setDistrict} required />
        <Input label="Town" value={town} onChange={setTown} required />
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Input label="Phone" value={phone} onChange={setPhone} />
      </div>
      <button disabled={busy} className="rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50">{busy ? "Saving…" : "Save profile"}</button>
    </form>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input value={value} required={required} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange" />
    </div>
  );
}
