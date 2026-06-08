import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

const TITLE = "Property maintenance in Kampala & Entebbe — a landlord's guide | Tuungane";
const DESCRIPTION =
  "How Kampala and Entebbe landlords hire trusted property maintenance pros — plumbing, cleaning, electrical, painting and recurring upkeep — without the guesswork.";
const URL = "https://tuungane.com/guides/property-maintenance-kampala";

export const Route = createFileRoute("/guides/property-maintenance-kampala")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Property maintenance in Kampala & Entebbe — a landlord's guide",
          description: DESCRIPTION,
          inLanguage: "en",
          mainEntityOfPage: URL,
          publisher: { "@type": "Organization", name: "Tuungane", url: "https://tuungane.com/" },
        }),
      },
    ],
  }),
  component: Guide,
});

function Guide() {
  return (
    <Layout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange">Landlord guide</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
            Property maintenance in Kampala & Entebbe: how to hire trusted pros
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Whether you rent out a single unit in Ntinda or manage flats in Entebbe and Bukoto, ongoing maintenance is what keeps tenants happy and protects your asset. Here's how to find and hire reliable property maintenance professionals on Tuungane.
          </p>
        </header>

        <section className="prose prose-navy max-w-none text-foreground">
          <h2 className="font-display text-2xl font-bold text-navy">What property maintenance covers</h2>
          <p>
            "Property maintenance" is an umbrella — most landlords need a small bench of trusted providers across these trades:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Plumbing</strong> — leaks, blockages, geyser repairs, water tank servicing.</li>
            <li><strong>Electrical</strong> — wiring faults, sockets, fuse boxes, generator handovers.</li>
            <li><strong>Cleaning</strong> — between tenants (deep clean), routine common-area cleaning for compounds.</li>
            <li><strong>Painting & finishing</strong> — touch-ups before showings, full repaints between tenancies.</li>
            <li><strong>Carpentry & locks</strong> — doors, hinges, broken locks, fitted wardrobes.</li>
            <li><strong>Compound & landscaping</strong> — slashing, hedge trimming, gutter clearing during rains.</li>
            <li><strong>Pest control</strong> — termites, rodents, mosquitoes (especially near Lake Victoria).</li>
          </ul>

          <h2 className="mt-8 font-display text-2xl font-bold text-navy">Hire one provider or build a bench?</h2>
          <p>
            For a single property, posting a request whenever something breaks is usually fastest. For three or more units, build a small bench of vetted providers — one plumber, one electrician, one cleaner — that you can call directly when issues come up.
          </p>

          <h2 className="mt-8 font-display text-2xl font-bold text-navy">Five checks before you hire</h2>
          <ol className="list-decimal pl-5">
            <li><strong>Verified profile.</strong> Look for the verified badge on Tuungane — it means the provider's identity and contact details have been checked.</li>
            <li><strong>Recent reviews from real customers.</strong> Reviews tied to completed requests carry more weight than anonymous comments.</li>
            <li><strong>Location & service radius.</strong> Pick providers based near your property — they'll arrive faster and charge less for travel.</li>
            <li><strong>Clear quote upfront.</strong> Ask for materials vs labour split. Be wary of a provider who refuses to write down a price.</li>
            <li><strong>Receipts and a guarantee.</strong> A 7–30 day workmanship guarantee is standard for most trades in Kampala.</li>
          </ol>

          <h2 className="mt-8 font-display text-2xl font-bold text-navy">Typical price ranges (Kampala, 2026)</h2>
          <p>
            Prices vary by location, materials and complexity. As rough guidance:
          </p>
          <ul className="list-disc pl-5">
            <li>Plumber call-out: UGX 30,000 – 70,000 (excluding parts)</li>
            <li>Electrician socket replacement: UGX 25,000 – 60,000 per point</li>
            <li>End-of-tenancy deep clean (2-bed apartment): UGX 120,000 – 250,000</li>
            <li>Interior repaint (2-bed apartment, labour + paint): UGX 600,000 – 1,200,000</li>
            <li>Monthly compound cleaning (small compound): UGX 150,000 – 300,000</li>
          </ul>

          <h2 className="mt-8 font-display text-2xl font-bold text-navy">How to post a maintenance request on Tuungane</h2>
          <ol className="list-decimal pl-5">
            <li>Describe the issue in one or two sentences — what's broken, when it started, any access constraints.</li>
            <li>Pick your district and town (Kampala, Entebbe, Wakiso, etc.) so nearby providers see it first.</li>
            <li>Set urgency: today, this week, or flexible. Urgent flags surface to active providers.</li>
            <li>Attach a photo where possible — it dramatically improves quote accuracy.</li>
            <li>Review responses, compare verified profiles and reviews, and pick a provider.</li>
          </ol>

          <h2 className="mt-8 font-display text-2xl font-bold text-navy">Recurring maintenance plans</h2>
          <p>
            Some Tuungane providers offer monthly retainers for landlords managing multiple units — typically covering quarterly inspections, priority response and discounted call-outs. Ask in your request if a provider offers a monthly plan.
          </p>

          <div className="mt-10 rounded-2xl bg-navy p-8 text-navy-foreground">
            <h2 className="font-display text-xl font-bold">Ready to find a maintenance pro?</h2>
            <p className="mt-2 text-white/80">Post a maintenance request in under a minute. Nearby verified providers will respond with quotes.</p>
            <Link to="/requests/new" className="mt-5 inline-flex rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground">
              Post a maintenance request →
            </Link>
          </div>
        </section>
      </article>
    </Layout>
  );
}
