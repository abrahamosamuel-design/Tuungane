import { useCallback, useEffect, useRef, useState } from "react";
import heroNetwork from "@/assets/hero-network.jpg";
import heroProvidersAsset from "@/assets/hero-providers.jpg.asset.json";
import heroRequestAsset from "@/assets/hero-request.jpg.asset.json";
import heroTrustAsset from "@/assets/hero-trust.jpg.asset.json";
import heroMarketplaceAsset from "@/assets/hero-marketplace.jpg.asset.json";
import heroGrowthAsset from "@/assets/hero-growth.jpg.asset.json";

const heroProviders = heroProvidersAsset.url;
const heroRequest = heroRequestAsset.url;
const heroTrust = heroTrustAsset.url;
const heroMarketplace = heroMarketplaceAsset.url;
const heroGrowth = heroGrowthAsset.url;

type Slide = {
  image: string;
  caption: string;
  supportingText: string;
  altText: string;
  badges?: boolean; // show floating provider badges (slide 1)
};

export const heroSlides: Slide[] = [
  {
    image: heroNetwork,
    caption: "Connect to Opportunity",
    supportingText: "Find services, post requests, and connect with people near you.",
    altText: "A Ugandan customer connected to multiple trusted skilled providers on Tuungane",
    badges: true,
  },
  {
    image: heroProviders,
    caption: "List your service",
    supportingText: "Create a free profile, show what you do, and grow your customer base.",
    altText: "Local Ugandan service providers — photographer, cleaner, tutor, tailor, electrician and beauty provider",
  },
  {
    image: heroRequest,
    caption: "Post a request",
    supportingText: "Tell providers what you need and get responses from people near you.",
    altText: "A customer using a smartphone to post a service request on Tuungane",
  },
  {
    image: heroTrust,
    caption: "Find trusted providers",
    supportingText: "View profiles, message providers, compare responses, and choose who to contact.",
    altText: "Trusted local Tuungane providers and customers connecting through profiles, ratings and messages",
  },
  {
    image: heroMarketplace,
    caption: "Services and requests in one place",
    supportingText: "Discover providers, browse open requests, and connect with local opportunities.",
    altText: "Tuungane local services marketplace with service cards, open requests and category icons",
  },
  {
    image: heroGrowth,
    caption: "Grow your customer base",
    supportingText: "Tuungane helps service providers become visible and easier to reach.",
    altText: "A Ugandan service provider receiving new customer inquiries and ratings on their phone",
  },
];

const AUTO_MS = 4500;
const RESUME_MS = 7000;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const go = useCallback((next: number) => {
    setIndex(((next % heroSlides.length) + heroSlides.length) % heroSlides.length);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (paused || reduceMotion.current) return;
    const t = setTimeout(() => go(index + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [index, paused, go]);

  const pauseThenResume = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_MS);
  }, []);

  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
    touchStartX.current = null;
    pauseThenResume();
  };

  const current = heroSlides[index];

  return (
    <div
      className="relative mx-auto mt-4 max-w-md sm:mt-10 sm:max-w-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => pauseThenResume()}
      onFocus={() => setPaused(true)}
      onBlur={() => pauseThenResume()}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Tuungane highlights"
    >
      <div className="relative overflow-hidden rounded-3xl">
        {/* Slides */}
        <div className="relative aspect-[4/5] w-full">
          {heroSlides.map((s, i) => (
            <img
              key={i}
              src={s.image}
              alt={s.altText}
              width={1024}
              height={1280}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              decoding="async"
              aria-hidden={i !== index}
              className={`absolute inset-0 block h-full w-full object-cover transition-opacity duration-700 ease-out ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* Edge fade into navy */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 60%, oklch(0.22 0.05 250 / 0.6) 88%, oklch(0.22 0.05 250) 100%)",
            }}
          />

          {/* Floating provider badges — only on slide 1 (matches original hero) */}
          {current.badges && (
            <>
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
              <span className="absolute left-4 bottom-[22%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:left-8 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange align-middle" />
                House Help
              </span>
              <span className="absolute right-4 bottom-[22%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:right-8 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange align-middle" />
                Web Designer
              </span>
            </>
          )}

          {/* Caption overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <div
              key={index}
              className="mx-auto max-w-[92%] animate-fade-in rounded-2xl bg-navy/70 px-3 py-2 text-center text-white shadow-lg backdrop-blur-sm sm:px-4 sm:py-2.5"
            >
              <p className="text-[11px] font-semibold leading-tight sm:text-sm" aria-live="polite">
                {current.caption}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-white/85 sm:text-xs">
                {current.supportingText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Hero slides">
        {heroSlides.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}: ${s.caption}`}
            onClick={() => {
              go(i);
              pauseThenResume();
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
