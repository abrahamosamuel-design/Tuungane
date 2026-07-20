import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ListYourSkillButton } from "@/components/cta/ListYourSkillButton";
import { useAuth } from "@/hooks/use-auth";
import { LandingHero } from "@/components/pages/landing/LandingHero";
import { LandingSearchBox } from "@/components/pages/landing/LandingSearchBox";
import { LandingTrustStrip } from "@/components/pages/landing/LandingTrustStrip";
import { LandingJourney } from "@/components/pages/landing/LandingJourney";
import { HomeFeedSections } from "@/components/HomeFeedSections";
import { PopularCategoriesSection } from "@/components/PopularCategoriesSection";
import { CommunityUpdatesSection } from "@/components/CommunityUpdatesSection";
import { SetLocationNudge } from "@/components/SetLocationNudge";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const Route = createFileRoute("/")({
    staticData: {
      hideBottomNavOnMobileUnauth: true
    },
  head: () => ({
    meta: [
      { title: "Tuungane — Connect to trusted services nearby" },
      {
        name: "description",
        content:
          "Post a service request and get matched with people offering services in Entebbe, Kampala and across Uganda — or list your service and get discovered.",
      },
      { property: "og:title", content: "Tuungane — Connect to trusted services nearby" },
      {
        property: "og:description",
        content:
          "Post a service request and get matched with people offering services in Entebbe, Kampala and across Uganda — or list your service and get discovered.",
      },
      { property: "og:url", content: "https://tuungane.com/" },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/083bdbcc-d9aa-413f-b763-0278a078db5b/id-preview-ac344380--054979ad-e63e-426c-9551-3d8b05b5d74a.lovable.app-1780369444470.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/083bdbcc-d9aa-413f-b763-0278a078db5b/id-preview-ac344380--054979ad-e63e-426c-9551-3d8b05b5d74a.lovable.app-1780369444470.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://tuungane.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tuungane",
          url: "https://tuungane.com/",
          description:
            "Tuungane connects customers with trusted service providers across Uganda — from home repair and cleaning to tutoring, beauty, and more.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://tuungane.com/services?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Tuungane",
          url: "https://tuungane.com/",
          description:
            "A services-first marketplace connecting customers with skilled, trusted providers in Uganda.",
          areaServed: "UG",
        }),
      },
    ],
  }),
  component: Index,
});

import { Navigate } from "@tanstack/react-router";

function Index() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <SetLocationNudge />
      
      {/* NEW LANDING DESIGN */}
      <LandingHero />
      <LandingSearchBox />
      <LandingTrustStrip />
      <LandingJourney />

      {/* DYNAMIC FEED: Open requests + Skilled people + Recent work */}
      <HomeFeedSections />

      {/* Popular categories — discovery after dynamic marketplace content */}
      <PopularCategoriesSection />

      {/* Community updates — curated public posts */}
      <CommunityUpdatesSection />

      {/* Provider CTA banner */}
      <section className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-elevated)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-green">FOR SERVICE PROVIDERS</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">
            List your service. Get discovered.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create a free provider profile, show your work, and let customers near you find you.
          </p>
          <div className="mt-5">
            <ListYourSkillButton variant="solid" className="px-6 py-3" label="List Your Service" />
          </div>
          <Link to="/requests/browse" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-orange">
            Browse open requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
