import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, MapPin, Star, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/social/Avatar";
import { getCategory } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  user_id: string;
  business_name: string | null;
  subcategory: string;
  bio: string | null;
  town: string | null;
  district: string | null;
  verified: string | null;
  full_name?: string;
  avatar_url?: string | null;
  rating?: number;
};

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const category = getCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category.name ?? "Services"} — Tuungane` },
      { name: "description", content: loaderData?.category.blurb ?? "Browse Tuungane services" },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Couldn't load this category</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground">Try again</button>
          <Link to="/services" className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-navy">All services</Link>
        </div>
      </div>
    </Layout>
  ),
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Category not found</h1>
        <Link to="/services" className="mt-6 inline-block text-orange">Back to services</Link>
      </div>
    </Layout>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const [list, setList] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sps } = await supabase
        .from("service_profiles")
        .select("user_id,business_name,subcategory,bio,town,district,verified")
        .eq("category_slug", category.slug)
        .eq("suspended", false)
        .limit(60);
      const rows = (sps ?? []) as Row[];
      const ids = rows.map((r) => r.user_id);
      if (ids.length === 0) {
        setList([]);
        return;
      }
      const [{ data: profs }, { data: stats }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids),
        supabase.from("provider_trust_stats").select("provider_id,average_rating").in("provider_id", ids),
      ]);
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
      const smap = new Map((stats ?? []).map((s) => [s.provider_id, s.average_rating ?? 0]));
      setList(
        rows
          .map((r) => ({
            ...r,
            full_name: pmap.get(r.user_id)?.full_name,
            avatar_url: pmap.get(r.user_id)?.avatar_url ?? null,
            rating: Number(smap.get(r.user_id) ?? 0),
          }))
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
      );
    })();
  }, [category.slug]);

  return (
    <Layout>
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-orange">
            <ArrowLeft className="h-4 w-4" /> All services
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">{category.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{category.blurb}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {category.subcategories.map((s: string) => (
              <span key={s} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-navy">{s}</span>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {list === null ? (
          <p className="text-sm text-muted-foreground">Loading providers…</p>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold text-navy">{list.length} provider{list.length !== 1 && "s"} in this category</h2>
            {list.length > 0 ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => <RealProviderCard key={p.user_id} p={p} />)}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
                <p className="font-semibold text-navy">No providers listed here yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Be the first to post your skill in this category.</p>
                <Link to="/login" search={{ tab: "signup" } as never} className="mt-5 inline-flex rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground">Post your skill</Link>
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

function RealProviderCard({ p }: { p: Row }) {
  const name = p.business_name || p.full_name || "Provider";
  return (
    <Link
      to="/u/$id"
      params={{ id: p.user_id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-start gap-4 p-5">
        <Avatar name={name} url={p.avatar_url ?? null} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-semibold text-navy">{name}</h3>
            {p.verified === "verified" && <BadgeCheck className="h-4 w-4 shrink-0 text-green" />}
            {p.verified === "featured" && <Sparkles className="h-4 w-4 shrink-0 text-orange" />}
          </div>
          <p className="text-sm text-muted-foreground">{p.subcategory}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {p.town && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.town}</span>}
            {p.rating != null && p.rating > 0 && (
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-orange text-orange" />{p.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
      {p.bio && <p className="line-clamp-2 px-5 pb-4 text-sm text-foreground/70">{p.bio}</p>}
      <div className="mt-auto flex items-center justify-between border-t border-border bg-surface px-5 py-3">
        <span className="text-xs text-muted-foreground">{p.district ?? ""}</span>
        <span className="text-xs font-semibold text-orange transition group-hover:underline">View profile →</span>
      </div>
    </Link>
  );
}
