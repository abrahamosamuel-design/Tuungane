import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  Zap,
  ClipboardList,
  User as UserIcon,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { ListYourSkillButton } from "@/components/cta/ListYourSkillButton";
import { useAuth } from "@/hooks/use-auth";
import { listSkillHref } from "@/lib/cta";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HomeFeedSections } from "@/components/HomeFeedSections";
import { PopularCategoriesSection } from "@/components/PopularCategoriesSection";
import { CommunityUpdatesSection } from "@/components/CommunityUpdatesSection";
import { SetLocationNudge } from "@/components/SetLocationNudge";


export const Route = createFileRoute("/")({
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



function Index() {
  const { user } = useAuth();


  return (
    <Layout>
      <SetLocationNudge />
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy text-white">

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 20% 100%, oklch(0.71 0.19 45 / 0.35), transparent 55%), radial-gradient(ellipse at 80% 100%, oklch(0.62 0.16 150 / 0.3), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 sm:pb-36 sm:pt-12 lg:pb-40 lg:pt-16">
          {/* Headline */}
          <div className="mx-auto max-w-xl text-center">
            <h1 className="font-display text-2xl font-extrabold leading-[1.15] sm:text-4xl lg:text-5xl">
              Find{" "}
              <span className="relative whitespace-nowrap">
                trusted services
                <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-green/80" />
              </span>
              .
              <br />
              Grow your <span className="text-orange">customer base</span>.
            </h1>
            <p className="mx-auto mt-2.5 max-w-md text-xs text-white/75 sm:mt-4 sm:text-base">
              Post a service request, find people offering services, or list your service so people can find you.
            </p>
          </div>


          {/* CTAs */}
          <div className="mx-auto mt-4 flex w-full max-w-md flex-col gap-2 sm:mt-7 sm:max-w-lg sm:flex-row sm:justify-center sm:gap-2.5">
            <Link
              to="/requests/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground shadow-lg shadow-orange/30 transition hover:brightness-110 sm:w-auto sm:px-7 sm:py-3"
            >
              <ClipboardList className="h-4 w-4" /> Post a Service Request
            </Link>
            <Link
              to={listSkillHref(user) as never}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green/30 transition hover:brightness-110 sm:w-auto sm:px-7 sm:py-3"
            >
              <UserIcon className="h-4 w-4" /> List Your Service
            </Link>
          </div>

          {/* Hero carousel */}
          <HeroCarousel />
        </div>


        {/* Trust strip overlapping hero */}
        <div className="relative mx-auto -mt-20 max-w-5xl px-4 sm:-mt-24 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-elevated)] sm:p-4">
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:gap-4">
              <TrustItem Icon={ShieldCheck} label="Verified providers" />
              <TrustItem Icon={MapPin} label="Local & nearby" />
              <TrustItem Icon={Zap} label="Fast responses" />
              <TrustItem Icon={ShieldCheck} label="Safe connections" />
            </div>
          </div>
        </div>
      </section>

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
    </Layout>
  );
}

function TrustItem({ Icon, label }: { Icon: any; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-1 py-1 text-left">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green/10 text-green">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-navy sm:text-sm">{label}</span>
    </div>
  );
}

