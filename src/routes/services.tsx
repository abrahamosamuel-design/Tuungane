import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, MapPin, BadgeCheck, Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal, ShieldCheck } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProviderCard } from "@/components/ProviderCard";
import { categories } from "@/data/categories";
import { providers } from "@/data/providers";
import { supabase } from "@/integrations/supabase/client";
import { useBoostedSet } from "@/hooks/use-boosted-set";
import { EmptyState } from "@/components/EmptyState";

const iconMap: Record<string, any> = { Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal };

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services Directory — Tuungane" },
      { name: "description", content: "Browse all service categories on Tuungane. Find plumbers, tutors, mechanics, designers and more across Uganda." },
    ],
  }),
  component: Services,
});

type RealFilter = "all" | "featured" | "verified" | "recent" | "official";

type RealProvider = {
  user_id: string;
  business_name: string | null;
  subcategory: string;
  bio: string;
  town: string;
  district: string;
  category_slug: string;
  verified: string;
  seeded_by_official: boolean;
  seeded_status: string | null;
  updated_at: string;
  profile: { full_name: string; avatar_url: string | null } | null;
};

const avatar = (s: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s || "T")}&backgroundColor=1e3a8a,f97316,16a34a&fontFamily=Plus%20Jakarta%20Sans`;

function Services() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [filter, setFilter] = useState<RealFilter>("all");
  const [real, setReal] = useState<RealProvider[]>([]);
  const [loadingReal, setLoadingReal] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingReal(true);
      let qy = supabase.from("service_profiles").select("user_id,business_name,subcategory,bio,town,district,category_slug,verified,seeded_by_official,seeded_status,updated_at").eq("suspended", false).order("updated_at", { ascending: false }).limit(60);
      if (filter === "featured") qy = qy.eq("verified", "featured");
      if (filter === "verified") qy = qy.in("verified", ["verified", "featured"]);
      if (filter === "official") qy = qy.eq("seeded_by_official", true);
      const { data } = await qy;
      const ids = (data ?? []).map((p) => p.user_id);
      const profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
        (profs ?? []).forEach((p) => profMap.set(p.id, p));
      }
      setReal((data ?? []).map((p) => ({ ...p, profile: profMap.get(p.user_id) ?? null })) as RealProvider[]);
      setLoadingReal(false);
    })();
  }, [filter]);

  const { has: isBoostedProvider } = useBoostedSet("provider", ["boost_profile", "feature_business_page"]);

  const realFiltered = real
    .filter((p) => {
      const qm = q.toLowerCase();
      const name = p.business_name || p.profile?.full_name || "";
      const matchesQ = !q || name.toLowerCase().includes(qm) || p.subcategory.toLowerCase().includes(qm);
      const matchesL = !loc || p.town.toLowerCase().includes(loc.toLowerCase()) || p.district.toLowerCase().includes(loc.toLowerCase());
      return matchesQ && matchesL;
    })
    .sort((a, b) => Number(isBoostedProvider(b.user_id)) - Number(isBoostedProvider(a.user_id)));
  const featuredProviders = realFiltered.filter((p) => isBoostedProvider(p.user_id));

  const demoFiltered = providers.filter((p) => {
    const qm = q.toLowerCase();
    const matchesQ = !q || p.name.toLowerCase().includes(qm) || p.subcategory.toLowerCase().includes(qm) || (p.businessName?.toLowerCase().includes(qm) ?? false);
    const matchesL = !loc || p.town.toLowerCase().includes(loc.toLowerCase()) || p.district.toLowerCase().includes(loc.toLowerCase());
    return matchesQ && matchesL;
  });

  const filterChips: { id: RealFilter; label: string }[] = [
    { id: "all", label: "All providers" },
    { id: "featured", label: "Featured by Tuungane" },
    { id: "verified", label: "Verified providers" },
    { id: "official", label: "Added by Tuungane Official" },
    { id: "recent", label: "Recently added" },
  ];

  return (
    <Layout>
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">Find a service provider</h1>
          <p className="mt-2 text-muted-foreground">Search trusted providers across Uganda.</p>
          <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:grid-cols-[1fr_1fr_auto]">
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Plumber, tutor, mechanic…" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Town or district (e.g. Entebbe)" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <button className="rounded-xl bg-orange px-6 py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110">Search</button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-navy">All categories</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = iconMap[c.icon] ?? Wrench;
            return (
              <Link key={c.slug} to="/services/$slug" params={{ slug: c.slug }} className="group flex gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-orange">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover:bg-orange group-hover:text-orange-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-navy">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.subcategories.length} skills</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-navy">Providers on Tuungane</h2>
          <span className="text-xs text-muted-foreground">{realFiltered.length} {realFiltered.length === 1 ? "provider" : "providers"}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {filterChips.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {featuredProviders.length > 0 && (
          <div className="mt-4 rounded-2xl border border-orange/30 bg-orange/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange">Featured providers</span>
              <span className="text-[10px] text-muted-foreground">Boosted with Tuungane Credits</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProviders.slice(0, 6).map((p) => {
                const name = p.business_name || p.profile?.full_name || "Provider";
                return (
                  <Link key={p.user_id} to="/u/$id" params={{ id: p.user_id }} className="flex items-start gap-3 rounded-xl border border-orange/40 bg-card p-3 hover:border-orange">
                    <img src={p.profile?.avatar_url || avatar(name)} alt={name} className="h-10 w-10 rounded-lg border border-border" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.subcategory} · {p.town}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loadingReal && <p className="text-sm text-muted-foreground">Loading providers…</p>}
          {!loadingReal && realFiltered.map((p) => {
            const name = p.business_name || p.profile?.full_name || "Provider";
            return (
              <Link key={p.user_id} to="/u/$id" params={{ id: p.user_id }} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                <div className="flex items-start gap-4 p-5">
                  <img src={p.profile?.avatar_url || avatar(name)} alt={name} className="h-14 w-14 rounded-xl border border-border" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate font-display text-base font-semibold text-navy">{name}</h3>
                      {p.verified === "verified" && <BadgeCheck className="h-4 w-4 shrink-0 text-green" />}
                      {p.verified === "featured" && <Sparkles className="h-4 w-4 shrink-0 text-orange" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.subcategory}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.town}, {p.district}</p>
                  </div>
                </div>
                <p className="line-clamp-2 px-5 text-sm text-foreground/70">{p.bio}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 px-5 pb-4">
                  {isBoostedProvider(p.user_id) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-semibold text-orange"><Sparkles className="h-3 w-3" /> Featured</span>
                  )}
                  {p.verified === "featured" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange"><Sparkles className="h-3 w-3" /> Highlighted by Tuungane Official</span>
                  )}
                  {p.seeded_by_official && p.seeded_status !== "claimed" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold text-navy"><ShieldCheck className="h-3 w-3" /> Added by Tuungane Official</span>
                  )}
                  {p.seeded_by_official && p.seeded_status === "claim_pending" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Claim under review</span>
                  )}
                </div>
              </Link>
            );
          })}
          {!loadingReal && realFiltered.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={Search} title="No providers match your filters yet" description="Try a different category or location, or check back as Tuungane Official adds more verified providers." action={{ label: "Browse all categories", to: "/services" }} />
            </div>
          )}
        </div>

        <h2 className="mt-14 font-display text-xl font-bold text-navy">Sample providers</h2>
        <p className="mt-1 text-xs text-muted-foreground">Preview content to illustrate how Tuungane profiles look.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {demoFiltered.slice(0, 6).map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>
      </section>
    </Layout>
  );
}
