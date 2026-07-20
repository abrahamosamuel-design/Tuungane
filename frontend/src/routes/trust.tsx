import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Star, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";


const TITLE = "Trust Ladder — How verification works on Tuungane";
const DESCRIPTION = "Anyone can list on Tuungane. Trust grows in stages — from a new profile to a verified provider, business, or organization. Here's how to climb the ladder.";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://tuungane.com/trust" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://tuungane.com/trust" }],
  }),
  component: TrustLadderPage,
});

const TIERS = [
  {
    icon: Sparkles,
    name: "New",
    tone: "bg-muted text-foreground/70 border-border",
    summary: "A profile that was just created. No checks have happened yet.",
    means: "Treat as you would any new account online. Confirm details before sharing money or sensitive info.",
  },
  {
    icon: CheckCircle2,
    name: "Active",
    tone: "bg-navy/10 text-navy border-navy/20",
    summary: "Profile is complete — photo, category, location, contact info, and at least one listed service.",
    means: "The owner has set up enough that you can evaluate them, but Tuungane hasn't reviewed their work yet.",
  },
  {
    icon: Star,
    name: "Reviewed",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    summary: "Has completed real service requests on Tuungane and received verified reviews from members.",
    means: "There's a track record on the platform. Read the reviews — they came from real bookings.",
  },
  {
    icon: ShieldCheck,
    name: "Verified",
    tone: "bg-green-100 text-green-800 border-green-300",
    summary: "Identity, business, or organization documents were checked by the Tuungane team.",
    means: "We've manually reviewed proof of who they say they are. The highest level of trust on Tuungane.",
  },
];

const STEPS = [
  { from: "New", to: "Active", how: "Add a profile photo or logo, pick a category, set your location, write a short bio, list at least one service, and add a phone, WhatsApp, or email." },
  { from: "Active", to: "Reviewed", how: "Complete service requests on Tuungane and ask happy members to leave a verified review." },
  { from: "Reviewed", to: "Verified", how: "Open your profile, tap Request verification, and submit ID or business documents. Our team reviews within a few days." },
];

const FAQS = [
  {
    q: "Do I have to be verified to use Tuungane?",
    a: "No. Anyone can create a profile and start receiving requests. Verification is optional but helps members trust you faster.",
  },
  {
    q: "Is verification free?",
    a: "Yes. Submitting documents and getting a Verified badge is free. You only spend Tuungane Credits if you choose to boost your profile.",
  },
  {
    q: "What documents do I need for Verified?",
    a: "Individuals: a government ID. Businesses: a trading license or registration certificate. Organizations: a registration or constitution document.",
  },
  {
    q: "What happens if my profile is reported?",
    a: "Reports go to our moderation team. If multiple reports stack up, the profile is automatically placed Under Review until we look into it. You'll be notified and can respond.",
  },
  {
    q: "Can I appeal a suspension or rejected verification?",
    a: "Yes. Open your profile, find the trust status card, and submit an appeal. An admin or moderator will review and respond.",
  },
  {
    q: "Do boosted profiles outrank verified ones?",
    a: "No. Verification influences ranking first. Boosts add visibility on top, but a verified profile generally ranks above an unverified boosted one.",
  },
];

function TrustLadderPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange">
          <ShieldCheck className="h-3.5 w-3.5" /> Trust on Tuungane
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">The Trust Ladder</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Anyone can list a profile on Tuungane. Trust is earned in stages — from a brand-new profile to a fully verified provider, business, or organization.
        </p>

        <div className="mt-8 space-y-3">
          {TIERS.map(({ icon: Icon, name, tone, summary, means }) => (
            <div key={name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${tone}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h2 className="font-display text-lg font-bold text-navy">{name}</h2>
              </div>
              <p className="mt-3 text-sm text-foreground/80">{summary}</p>
              <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-navy">What it means: </span>{means}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold text-navy">How to climb</h2>
        <div className="mt-4 space-y-3">
          {STEPS.map((s) => (
            <div key={s.from + s.to} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
                <span>{s.from}</span>
                <ArrowRight className="h-4 w-4 text-orange" />
                <span>{s.to}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/80">{s.how}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Under Review &amp; Suspended</p>
            <p className="mt-1">If a profile receives several reports it may be placed Under Review while our team investigates. Confirmed violations can lead to suspension. Owners can appeal either decision from their profile.</p>
          </div>
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold text-navy">Frequently asked questions</h2>
        <div className="mt-4 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border bg-card p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-start justify-between gap-3">
                <span className="font-semibold text-navy">{f.q}</span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-orange transition group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-sm text-foreground/80">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-sm text-foreground/70">
          <p>
            This page is maintained by Tuungane to explain how trust works on the platform. It is not a certification or guarantee — always use your own judgment, meet in safe places, and report anything suspicious. See our <Link to="/terms" className="font-semibold text-orange underline">Terms &amp; Safety</Link> for more.
          </p>
        </div>
      </section>
    </>
  );
}
