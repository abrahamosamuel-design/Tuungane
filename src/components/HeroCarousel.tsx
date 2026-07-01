import { useCallback, useEffect, useRef, useState } from "react";
import heroNetwork from "@/assets/hero-network.jpg";
import heroProviders from "@/assets/hero-providers-real.jpg";
import heroRequest from "@/assets/hero-request-real.jpg";
import heroTrust from "@/assets/hero-trust-real.jpg";

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
    altText: "Local Ugandan service providers — cleaner, electrician, tailor, plumber and tutor standing together",
  },
  {
    image: heroRequest,
    caption: "Post a request",
    supportingText: "Tell providers what you need and get responses from people near you.",
    altText: "A Ugandan customer using her phone at home to post a service request on Tuungane",
  },
  {
    image: heroTrust,
    caption: "Find trusted providers",
    supportingText: "Discover services, compare options, and connect with people near you.",
    altText: "A customer greeting a trusted local service provider at her doorstep",
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

          {/* Subtle dark gradient at bottom for caption readability */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, oklch(0.22 0.05 250 / 0.75) 0%, oklch(0.22 0.05 250 / 0.15) 35%, transparent 60%)",
            }}
          />

          {current.badges && (
            <>
              <span className="absolute left-2 top-[10%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:left-4 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green align-middle" />
                Electrician
              </span>
              <span className="absolute right-2 top-[8%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:right-4 sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green align-middle" />
                Tutor
              </span>
              <span className="absolute left-3 top-[38%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange align-middle" />
                Cleaner
              </span>
              <span className="absolute right-3 top-[40%] rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:px-2.5 sm:text-[11px]">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange align-middle" />
                Tailor
              </span>
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <div
              key={index}
              className="mx-auto max-w-[92%] animate-fade-in rounded-2xl bg-navy/60 px-3 py-2 text-center text-white shadow-lg backdrop-blur-sm sm:px-4 sm:py-2.5"
            >
              <p className="text-[12px] font-semibold leading-tight sm:text-sm" aria-live="polite">
                {current.caption}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/90 sm:text-xs">
                {current.supportingText}
              </p>
            </div>
          </div>
        </div>
      </div>

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
