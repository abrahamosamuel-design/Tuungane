import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { categories } from "@/data/categories";
import { MyRequestsSummary } from "@/components/MyRequestsSummary";
import { toast } from "sonner";


export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — Tuungane" }] }),
  component: Dashboard,
});

function Dashboard() {
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
    const { data: s } = await supabase.from("service_profiles").select("category_slug,subcategory,business_name,bio,district,town,phone,whatsapp").eq("user_id", user.id).maybeSingle();
    setSp(s);
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
    } else {
      const [{ count: fol }, { count: sp2 }, { count: so }, { count: rw }, { count: rg }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
        supabase.from("saved_providers").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("saved_opportunities").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("provider_recommendations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setCustomerStats({ following: fol ?? 0, saved: sp2 ?? 0, savedOpps: so ?? 0, reviewsWritten: rw ?? 0, recsGiven: rg ?? 0 });
    }
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-navy">Hi, {profile?.full_name?.split(" ")[0] || "there"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{profile?.is_provider ? "Manage your service profile, post your work, and grow your reputation." : "You're signed in as a customer. Switch to a provider to start posting work."}</p>
          </div>
          <Link to="/u/$id" params={{ id: user.id }} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-navy hover:border-orange">View public profile</Link>
        </div>

        {profile?.is_provider && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Followers" value={stats.followers} />
            <Stat label="Posts" value={stats.posts} />
            <Stat label="Likes" value={stats.likes} />
            <Stat label="Comments" value={stats.comments} />
            <Stat label="Recommendations" value={stats.recs} />
            <Stat label="Reviews" value={stats.reviews} />
            <Stat label="Saves" value={stats.saves} />
            <Stat label="Opportunities" value={stats.opps} />
          </div>
        )}

        {!profile?.is_provider && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Following" value={customerStats.following} />
            <Stat label="Saved providers" value={customerStats.saved} />
            <Stat label="Saved opps" value={customerStats.savedOpps} />
            <Stat label="Reviews written" value={customerStats.reviewsWritten} />
            <Stat label="Recommendations" value={customerStats.recsGiven} />
          </div>
        )}

        <div className="mt-6">
          <MyRequestsSummary />
        </div>


        {profile?.is_provider && !sp && (
          <ServiceProfileForm onSaved={load} />
        )}

        {profile?.is_provider && sp && (
          <>
            <div className="mt-6 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Service profile</p>
                  <p className="font-semibold text-navy">{sp.business_name || profile.full_name} · <span className="text-muted-foreground">{sp.subcategory}</span></p>
                  <p className="text-xs text-muted-foreground">{sp.town}, {sp.district}</p>
                </div>
                <button onClick={() => setSp(null)} className="text-xs font-medium text-orange">Edit</button>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="mb-3 font-display text-lg font-bold text-navy">Post to your timeline</h2>
              <PostComposer defaultCategory={sp.category_slug} onPosted={load} />
            </div>
            <div className="mt-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-navy">Your posts</h2>
              {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet — share your first piece of work above.</p>}
              {posts.map((p) => <PostCard key={p.id} post={p} onChanged={load} />)}
            </div>
          </>
        )}

        {!profile?.is_provider && (
          <button
            onClick={async () => {
              await supabase.from("profiles").update({ is_provider: true }).eq("id", user.id);
              toast.success("You're now a service provider. Complete your profile to start posting.");
              load();
            }}
            className="mt-6 rounded-xl bg-orange px-4 py-3 text-sm font-semibold text-orange-foreground"
          >Become a service provider</button>
        )}
      </section>
    </Layout>
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
  const [businessName, setBusinessName] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0].slug);
  const [subcategory, setSubcategory] = useState(categories[0].subcategories[0]);
  const [bio, setBio] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);

  const cat = categories.find((c) => c.slug === categorySlug)!;

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
          <select value={categorySlug} onChange={(e) => { setCategorySlug(e.target.value); setSubcategory(categories.find((c) => c.slug === e.target.value)!.subcategories[0]); }} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
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
      <div className="grid grid-cols-2 gap-2">
        <Input label="Phone" value={phone} onChange={setPhone} />
        <Input label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
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
