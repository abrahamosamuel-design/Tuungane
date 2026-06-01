import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Search, Sparkles, ShieldCheck, Users, MapPin, Star, Wrench, Sparkles as SparklesIcon, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProviderCard } from "@/components/ProviderCard";
import { OfficialPostCard } from "@/components/OfficialPostCard";
import { categories } from "@/data/categories";
import { featuredProviders, providers } from "@/data/providers";
import { supabase } from "@/integrations/supabase/client";
import type { OfficialAccountRow, OfficialPostRow } from "@/data/officialPostTypes";

const iconMap: Record<string, any> = { Wrench, Sparkles: SparklesIcon, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tuungane — Find Trusted Service Providers Near You" },
      { name: "description", content: "Tuungane helps you find trusted plumbers, electricians, tutors, tailors and more across Uganda. Post your skill and get discovered." },
    ],
  }),
  component: Index,
});

function Index() {
  const featured = featuredProviders();
  const [officialAccount, setOfficialAccount] = useState<OfficialAccountRow | null>(null);
  const [officialPosts, setOfficialPosts] = useState<OfficialPostRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: acct } = await supabase.from("official_accounts").select("*").eq("is_active", true).limit(1).maybeSingle();
      setOfficialAccount(acct as OfficialAccountRow | null);
      const { data: posts } = await supabase
        .from("official_posts")
        .select("*")
        .eq("status", "published")
        .or("is_homepage.eq.true,is_pinned.eq.true,is_featured.eq.true")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4);
      setOfficialPosts((posts ?? []) as OfficialPostRow[]);
    })();
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.71 0.19 45 / 0.4), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.62 0.16 150 / 0.3), transparent 40%)" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3 w-3 text-orange" /> Available in Uganda
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                Find Trusted Service Providers <span className="text-orange">Near You</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
                Tuungane helps people find trusted service providers and helps skilled people find gigs, jobs, internships, volunteer work, and apprenticeships. <span className="text-white">Find services. Find work. Grow through skill.</span>
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/services" className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-6 py-3 text-sm font-semibold text-orange-foreground shadow-lg transition hover:brightness-110">
                  <Search className="h-4 w-4" /> Find a Service
                </Link>
                <Link to="/opportunities" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
                  Find Work Opportunities <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/70">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-orange" /> 500+ providers</div>
                <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-green" /> Verified profiles</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-orange" /> Across Uganda</div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -inset-6 rounded-3xl bg-white/5 blur-2xl" />
              <div className="relative grid grid-cols-2 gap-4">
                {providers.slice(0, 4).map((p, i) => (
                  <div key={p.id} className={`rounded-2xl bg-white p-4 shadow-xl ${i % 2 ? "translate-y-6" : ""}`}>
                    <div className="flex items-center gap-3">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.avatarSeed)}&backgroundColor=1e3a8a,f97316,16a34a`} className="h-10 w-10 rounded-lg" alt="" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy">{p.businessName ?? p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.subcategory}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{p.town}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-navy"><Star className="h-3 w-3 fill-orange text-orange" />{p.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange">Browse</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-navy">Popular service categories</h2>
          </div>
          <Link to="/services" className="hidden text-sm font-semibold text-navy hover:text-orange sm:inline-flex">View all →</Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((c) => {
            const Icon = iconMap[c.icon] ?? Wrench;
            return (
              <Link key={c.slug} to="/services/$slug" params={{ slug: c.slug }} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-orange hover:shadow-[var(--shadow-card)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy/5 text-navy transition group-hover:bg-orange group-hover:text-orange-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-sm font-semibold text-navy">{c.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* From Tuungane Official */}
      {officialPosts.length > 0 && (
        <section className="border-y border-orange/20 bg-gradient-to-b from-orange/5 to-transparent py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange">From Tuungane Official</p>
                <h2 className="mt-1 font-display text-3xl font-bold text-navy">Featured updates & opportunities</h2>
                <p className="mt-1 text-sm text-muted-foreground">Curated by the Tuungane team to help you find work, services and stay safe.</p>
              </div>
              <Link to="/official" className="hidden text-sm font-semibold text-navy hover:text-orange sm:inline-flex">See all →</Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {officialPosts.map((p) => (
                <OfficialPostCard key={p.id} post={p} account={officialAccount} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-surface py-16">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange">How Tuungane works</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-navy">Three steps to opportunity</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Search", d: "Browse categories or search by skill, location and rating to find providers near you." },
              { n: "02", t: "Connect", d: "Contact verified providers directly through WhatsApp or phone — no middlemen." },
              { n: "03", t: "Grow", d: "Rate your experience. Providers grow their reputation. Everyone prospers together." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <span className="font-display text-5xl font-extrabold text-orange/20">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-semibold text-navy">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured providers */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange">Featured</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-navy">Top-rated providers</h2>
          </div>
          <Link to="/services" className="hidden text-sm font-semibold text-navy hover:text-orange sm:inline-flex">Browse all →</Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...featured, ...providers.slice(0, 3)].slice(0, 6).map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* Opportunities */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange">Skills-Based Opportunities</p>
              <h2 className="mt-1 font-display text-3xl font-bold text-navy">Find work that fits your skills</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Find gigs, jobs, internships, volunteer work, and apprenticeships connected to your skills and services.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/opportunities" className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-navy-foreground hover:brightness-110">Browse Opportunities</Link>
              <Link to="/opportunities/new" className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground hover:brightness-110">Post an Opportunity</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Tuungane */}
      <section className="bg-navy py-16 text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange">Why Tuungane</p>
              <h2 className="mt-1 font-display text-3xl font-bold">Built on trust, not luck.</h2>
              <p className="mt-3 max-w-lg text-white/70">
                We verify identities, surface real reviews, and put community safety first. Every connection on Tuungane is an opportunity to grow.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { i: ShieldCheck, t: "Verified profiles", d: "Identity checks and document verification for every featured provider." },
                  { i: Star, t: "Real reviews", d: "Ratings come from real customers — not bots, not fake accounts." },
                  { i: MapPin, t: "Local first", d: "Find providers serving your district, town and specific area." },
                ].map(({ i: Icon, t, d }) => (
                  <li key={t} className="flex gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-green" />
                    <div>
                      <p className="font-semibold text-white">{t}</p>
                      <p className="text-sm text-white/60">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <p className="font-display text-2xl font-bold leading-snug">"Tuungane changed how my plumbing business gets new clients. People find me, see my work, and call me directly."</p>
              <div className="mt-6 flex items-center gap-3">
                <img src="https://api.dicebear.com/7.x/initials/svg?seed=Joseph%20Mukasa&backgroundColor=f97316" className="h-12 w-12 rounded-full" alt="" />
                <div>
                  <p className="font-semibold text-white">Joseph Mukasa</p>
                  <p className="text-sm text-white/60">Plumber · Entebbe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-[var(--shadow-elevated)] sm:p-14">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange">For skilled people</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">Post your skill. Get discovered.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create a free service profile in minutes. Share your work, build trust through reviews, and grow your business.
          </p>
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange px-7 py-3 text-sm font-semibold text-orange-foreground shadow-lg transition hover:brightness-110">
            Create your profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
