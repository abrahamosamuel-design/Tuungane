import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  Zap,
  ClipboardList,
  MessageSquare,
  UserCheck,
  Wrench,
  Sparkles as SparklesIcon,
  Scissors,
  Car,
  GraduationCap,
  MoreHorizontal,
  Star,
  BadgeCheck,
  Bookmark,
  
  User as UserIcon,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { useCategories } from "@/hooks/use-categories";
import { ListYourSkillButton } from "@/components/cta/ListYourSkillButton";
import { useAuth } from "@/hooks/use-auth";
import { listSkillHref } from "@/lib/cta";
import heroNetwork from "@/assets/hero-network.jpg";
import { NearYouHomeSection } from "@/components/NearYouHomeSection";
import { SetLocationNudge } from "@/components/SetLocationNudge";

// Curated category set for the homepage tile grid
const HOME_CATEGORY_SLUGS = ["home-repair", "cleaning", "automotive", "beauty", "education"];
const homeCategoryIcons: Record<string, any> = {
  "home-repair": Wrench,
  cleaning: SparklesIcon,
  automotive: Car,
  beauty: Scissors,
  education: GraduationCap,
};
const homeCategoryLabels: Record<string, string> = {
  "home-repair": "Plumbing",
  cleaning: "Cleaning",
  automotive: "Mechanics",
  beauty: "Beauty",
  education: "Tutoring",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tuungane — Connect to trusted services nearby" },
      {
        name: "description",
        content:
          "Create a request and get matched with skilled providers in Entebbe, Kampala and across Uganda — or list your skill and get discovered.",
      },
      { property: "og:title", content: "Tuungane — Connect to trusted services nearby" },
      {
        property: "og:description",
        content:
          "Create a request and get matched with skilled providers in Entebbe, Kampala and across Uganda — or list your skill and get discovered.",
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

const showcase = [
  {
    cat: "Plumbing",
    name: "David M.",
    work: "Pipe fitting & repairs",
    rating: 4.8,
    reviews: 126,
    img: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&q=70&auto=format&fit=crop",
  },
  {
    cat: "Electrical",
    name: "Grace W.",
    work: "Wiring & installations",
    rating: 4.9,
    reviews: 98,
    img: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=70&auto=format&fit=crop",
  },
  {
    cat: "Mechanics",
    name: "Brian K.",
    work: "Engine diagnostics",
    rating: 4.7,
    reviews: 76,
    img: "https://images.unsplash.com/photo-1632823471565-1ecdf5c6da77?w=600&q=70&auto=format&fit=crop",
  },
  {
    cat: "Cleaning",
    name: "Sarah N.",
    work: "Home cleaning services",
    rating: 4.9,
    reviews: 142,
    img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=70&auto=format&fit=crop",
  },
];

const openRequests = [
  {
    badge: "New",
    badgeClass: "bg-green/15 text-green",
    title: "Fix leaking tap",
    location: "Kitoro, Entebbe",
    budget: "UGX 30,000 – 60,000",
    responses: 3,
    ago: "10m ago",
    Icon: Wrench,
    iconBg: "bg-green/10 text-green",
  },
  {
    badge: "Urgent",
    badgeClass: "bg-orange/15 text-orange",
    title: "Power outage fix",
    location: "Katabi, Entebbe",
    budget: "UGX 50,000 – 120,000",
    responses: 5,
    ago: "25m ago",
    Icon: Zap,
    iconBg: "bg-orange/10 text-orange",
  },
  {
    badge: "Soon",
    badgeClass: "bg-amber-100 text-amber-700",
    title: "House cleaning",
    location: "Kigungu, Entebbe",
    budget: "UGX 40,000 – 80,000",
    responses: 4,
    ago: "1h ago",
    Icon: SparklesIcon,
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    badge: "Open",
    badgeClass: "bg-green/15 text-green",
    title: "Tutor needed for Math",
    location: "Nkumba, Entebbe",
    budget: "UGX 30,000 – 70,000",
    responses: 2,
    ago: "2h ago",
    Icon: GraduationCap,
    iconBg: "bg-green/10 text-green",
  },
  {
    badge: "Open",
    badgeClass: "bg-green/15 text-green",
    title: "TV wall mounting",
    location: "Ntinda, Kampala",
    budget: "UGX 50,000 – 100,000",
    responses: 3,
    ago: "3h ago",
    Icon: Wrench,
    iconBg: "bg-green/10 text-green",
  },
];


function Index() {
  const { user } = useAuth();
  const { categories } = useCategories();

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
              Create requests, discover skilled people, or list your skill so customers near you can find you.
            </p>
          </div>


          {/* CTAs */}
          <div className="mx-auto mt-4 flex w-full max-w-md flex-col gap-2 sm:mt-7 sm:max-w-lg sm:flex-row sm:justify-center sm:gap-2.5">
            <Link
              to="/requests/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground shadow-lg shadow-orange/30 transition hover:brightness-110 sm:w-auto sm:px-7 sm:py-3"
            >
              <ClipboardList className="h-4 w-4" /> Create a Request
            </Link>
            <Link
              to={listSkillHref(user) as never}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green/30 transition hover:brightness-110 sm:w-auto sm:px-7 sm:py-3"
            >
              <UserIcon className="h-4 w-4" /> List Your Skill
            </Link>
          </div>

          {/* Hero network composition */}
          <div className="relative mx-auto mt-4 max-w-md sm:mt-10 sm:max-w-lg">

            <div className="relative overflow-hidden rounded-3xl">
              <img
                src={heroNetwork}
                alt="A Ugandan customer connected to multiple trusted skilled providers on Tuungane"
                width={1024}
                height={1280}
                className="block w-full"
              />
              {/* Edge fade into navy */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, transparent 60%, oklch(0.22 0.05 250 / 0.6) 88%, oklch(0.22 0.05 250) 100%)",
                }}
              />

              {/* Floating provider badges */}
              <span className="absolute left-2 top-[18%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:left-4 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green align-middle" />
                Electrician
              </span>
              <span className="absolute right-2 top-[14%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:right-4 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green align-middle" />
                Tutor
              </span>
              <span className="absolute left-1 top-[42%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:left-3 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green align-middle" />
                Cleaner
              </span>
              <span className="absolute right-1 top-[44%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:right-3 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green align-middle" />
                Tailor
              </span>
              <span className="absolute left-4 bottom-[14%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:left-8 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange align-middle" />
                House Help
              </span>
              <span className="absolute right-4 bottom-[14%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:right-8 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange align-middle" />
                Web Designer
              </span>
            </div>
          </div>
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

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:pt-16">
        <SectionHeader title="How Tuungane works" link={{ label: "See all", to: "/about" }} />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          <Step n={1} title="Create a Request" desc="Tell us what you need and where." Icon={ClipboardList} tint="green" />
          <Step n={2} title="Get Responses" desc="Skilled providers respond to your request." Icon={MessageSquare} tint="navy" />
          <Step n={3} title="Choose & Get It Done" desc="Pick the best fit and get it done." Icon={UserCheck} tint="orange" />
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <SectionHeader title="Popular categories" link={{ label: "View all", to: "/services" }} />
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {HOME_CATEGORY_SLUGS.map((slug) => {
            const cat = categories.find((c) => c.slug === slug);
            if (!cat) return null;
            const Icon = homeCategoryIcons[slug] ?? Wrench;
            return (
              <Link
                key={slug}
                to="/services/$slug"
                params={{ slug }}
                className="group flex flex-col items-center gap-2"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5 text-navy transition group-hover:bg-orange group-hover:text-orange-foreground">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold text-navy text-center line-clamp-1">
                  {homeCategoryLabels[slug] ?? cat.name}
                </span>
              </Link>
            );
          })}
          <Link to="/services" className="group flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5 text-navy transition group-hover:bg-orange group-hover:text-orange-foreground">
              <MoreHorizontal className="h-7 w-7" />
            </div>
            <span className="text-xs font-semibold text-navy">More</span>
          </Link>
        </div>
      </section>

      {/* SHOW YOUR WORK */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-navy sm:text-xl">Show your work. Get discovered.</h2>
            <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
              List your skill, add photos of your work, and let customers near you find you.
            </p>

          </div>
          <Link to="/feed" className="hidden text-sm font-semibold text-navy hover:text-orange sm:inline">
            See all →
          </Link>
        </div>
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
          {showcase.map((s) => (
            <article
              key={s.name}
              className="w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] sm:w-auto"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img src={s.img} alt={s.work} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute left-2 top-2 rounded-md bg-navy px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {s.cat}
                </span>
                <button
                  aria-label="Save"
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-navy shadow"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold text-navy truncate">{s.name}</span>
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-green" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
                    <Star className="h-3 w-3 fill-orange text-orange" />
                    {s.rating} <span className="text-muted-foreground">({s.reviews})</span>
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.work}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 flex justify-center sm:hidden">
          <ListYourSkillButton variant="solid" className="px-6 py-2.5 text-sm" />
        </div>
      </section>

      {/* OPEN REQUESTS / PROVIDERS NEAR YOU (dynamic) */}
      <NearYouHomeSection />


      {/* Provider CTA banner */}
      <section className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 sm:pb-16">
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-elevated)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-green">FOR SERVICE PROVIDERS</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">
            List your skill. Get discovered.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create a free provider profile, show your work, and let customers near you find you.
          </p>
          <div className="mt-5">
            <ListYourSkillButton variant="solid" className="px-6 py-3" />
          </div>
          <Link to="/requests/browse" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-orange">
            Or browse open requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </Layout>
  );
}

function SectionHeader({ title, link }: { title: string; link?: { label: string; to: string } }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="font-display text-lg font-bold text-navy sm:text-xl">
        {title}
        <span className="mt-1 block h-1 w-10 rounded-full bg-green/80" />
      </h2>
      {link ? (
        <Link to={link.to} className="text-sm font-semibold text-navy hover:text-orange">
          {link.label}
        </Link>
      ) : null}
    </div>
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

function Step({
  n,
  title,
  desc,
  Icon,
  tint,
}: {
  n: number;
  title: string;
  desc: string;
  Icon: any;
  tint: "green" | "navy" | "orange";
}) {
  const tints = {
    green: { bg: "bg-green/10", fg: "text-green", num: "bg-green text-white" },
    navy: { bg: "bg-navy/5", fg: "text-navy", num: "bg-navy text-white" },
    orange: { bg: "bg-orange/10", fg: "text-orange", num: "bg-orange text-orange-foreground" },
  }[tint];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${tints.num}`}>{n}</span>
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tints.bg} ${tints.fg}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <h3 className="mt-3 font-display text-sm font-bold text-navy">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
