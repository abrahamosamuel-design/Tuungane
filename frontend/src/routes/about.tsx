import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Users, Globe2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Tuungane — Skilled Help, Trusted Connections" },
      { name: "description", content: "Tuungane connects customers with skilled service providers nearby. Learn about our mission to help Uganda — and Africa — prosper together." },
      { property: "og:title", content: "About Tuungane — Skilled Help, Trusted Connections" },
      { property: "og:description", content: "Tuungane connects customers with skilled service providers nearby. Learn how we help Uganda prosper together." },
      { property: "og:url", content: "https://tuungane.com/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://tuungane.com/about" }],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Logo className="mx-auto h-12" />
          <h1 className="mt-6 font-display text-4xl font-extrabold text-navy">Connect. Grow. Prosper Together.</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tuungane is a services-first platform built around requests. Customers post what they need; skilled providers respond. It's the simplest way to find trusted help near you — and to be found.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { i: Heart, t: "Built for trust", d: "Verified profiles, real reviews, and a focus on community safety." },
            { i: Users, t: "Built for everyone", d: "From plumbers to designers — every skilled person deserves visibility." },
            { i: Globe2, t: "Africa first, global next", d: "Starting in Uganda. Built to scale across the continent and beyond." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange"><Icon className="h-5 w-5" /></div>
              <h2 className="mt-3 font-display text-lg font-bold text-navy">{t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-navy p-10 text-navy-foreground">
          <h2 className="font-display text-2xl font-bold">Our mission</h2>
          <p className="mt-3 text-white/80">
            We believe skilled work should be accessible to everyone — regardless of where they live, what school they attended, or who they know. Tuungane is the bridge: a simple, trusted way to find work and be found.
          </p>
          <Link to="/services" className="mt-6 inline-flex rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground">Browse services →</Link>
        </div>
      </section>
    </>
  );
}
