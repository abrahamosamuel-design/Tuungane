import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MapPin, BadgeCheck, Wrench, Sparkles, Building2, Scissors, Truck, Car, GraduationCap, Camera, ChefHat, Laptop, HeartPulse, Sprout, MoreHorizontal } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProviderCard } from "@/components/ProviderCard";
import { categories } from "@/data/categories";
import { providers } from "@/data/providers";

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

function Services() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const filtered = providers.filter((p) => {
    const qm = q.toLowerCase();
    const matchesQ = !q || p.name.toLowerCase().includes(qm) || p.subcategory.toLowerCase().includes(qm) || (p.businessName?.toLowerCase().includes(qm) ?? false);
    const matchesL = !loc || p.town.toLowerCase().includes(loc.toLowerCase()) || p.district.toLowerCase().includes(loc.toLowerCase());
    return matchesQ && matchesL;
  });
  return (
    <Layout>
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">Find a service provider</h1>
          <p className="mt-2 text-muted-foreground">Search across {providers.length}+ trusted providers in Uganda.</p>
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

        <h2 className="mt-12 font-display text-xl font-bold text-navy">{q || loc ? `Results (${filtered.length})` : "Recommended providers"}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>
        {filtered.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-semibold text-navy">No providers match your search.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or location.</p>
          </div>
        )}
      </section>
    </Layout>
  );
}
