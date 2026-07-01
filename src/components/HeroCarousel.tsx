import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, MapPin, MessageCircle, Star } from "lucide-react";
import heroNetwork from "@/assets/hero-network.jpg";
import heroProviders from "@/assets/hero-providers-real.jpg";
import heroRequest from "@/assets/hero-request-real.jpg";
import heroTrust from "@/assets/hero-trust-real.jpg";
import heroCreative from "@/assets/hero-creative-real.jpg";
import heroProperty from "@/assets/hero-property-real.jpg";

type SlideKey = "network" | "providers" | "request" | "trust" | "creative" | "property";

type Slide = {
  key: SlideKey;
  image: string;
  caption: string;
  supportingText: string;
  altText: string;
};

export const heroSlides: Slide[] = [
  {
    key: "network",
    image: heroNetwork,
    caption: "Connect to Opportunity",
    supportingText: "Find services, post requests, and connect with people near you.",
    altText: "A Ugandan customer connected to multiple trusted skilled providers on Tuungane",
  },
  {
    key: "providers",
    image: heroProviders,
    caption: "List your service",
    supportingText: "Create a profile and grow your customer base.",
    altText: "Local Ugandan service providers — cleaner, electrician, tailor, plumber and tutor standing together",
  },
  {
    key: "request",
    image: heroRequest,
    caption: "Post a request",
    supportingText: "Tell providers what you need and get responses nearby.",
    altText: "A Ugandan customer using her phone at home to post a service request on Tuungane",
  },
  {
    key: "trust",
    image: heroTrust,
    caption: "Find trusted providers",
    supportingText: "Compare options and connect with trusted people near you.",
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

          {/* Subtle bottom gradient — lighter than before, focused only at bottom */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
            style={{
              background:
                "linear-gradient(to top, oklch(0.18 0.04 250 / 0.78) 0%, oklch(0.18 0.04 250 / 0.35) 55%, transparent 100%)",
            }}
          />

          {/* Per-slide subtle UI cues */}
          <SlideChips slideKey={current.key} />

          {/* Text directly on gradient — no boxed card */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <div key={index} className="animate-fade-in text-white">
              <p
                className="font-display text-lg font-bold leading-tight sm:text-xl"
                style={{ textShadow: "0 2px 12px oklch(0.15 0.03 250 / 0.55)" }}
                aria-live="polite"
              >
                {current.caption}
              </p>
              <p
                className="mt-1 text-[12px] leading-snug text-white/90 sm:text-sm"
                style={{ textShadow: "0 1px 8px oklch(0.15 0.03 250 / 0.55)" }}
              >
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
              i === index ? "w-6 bg-navy" : "w-1.5 bg-navy/25 hover:bg-navy/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  children,
  className = "",
  dot,
}: {
  children: React.ReactNode;
  className?: string;
  dot?: "green" | "orange";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-navy shadow-md backdrop-blur sm:px-2.5 sm:text-[11px] ${className}`}
    >
      {dot && (
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            dot === "green" ? "bg-green" : "bg-orange"
          }`}
        />
      )}
      {children}
    </span>
  );
}

function SlideChips({ slideKey }: { slideKey: SlideKey }) {
  if (slideKey === "network") {
    return (
      <>
        <Chip dot="green" className="absolute left-2 top-[10%] sm:left-4">Electrician</Chip>
        <Chip dot="green" className="absolute right-2 top-[8%] sm:right-4">Tutor</Chip>
        <Chip dot="orange" className="absolute left-3 top-[38%]">Cleaner</Chip>
        <Chip dot="orange" className="absolute right-3 top-[40%]">Tailor</Chip>
      </>
    );
  }
  if (slideKey === "providers") {
    return (
      <>
        <Chip className="absolute left-3 top-[8%]">
          <BadgeCheck className="h-3 w-3 text-green" /> Verified
        </Chip>
        <Chip dot="green" className="absolute right-3 top-[10%]">Plumber</Chip>
        <Chip className="absolute left-3 top-[34%]">
          <Star className="h-3 w-3 fill-orange text-orange" /> 4.9
        </Chip>
      </>
    );
  }
  if (slideKey === "request") {
    return (
      <>
        <Chip dot="orange" className="absolute right-3 top-[8%]">New request</Chip>
        <Chip className="absolute left-3 top-[12%]">
          <MessageCircle className="h-3 w-3 text-navy" /> 3 responses
        </Chip>
        <Chip className="absolute left-3 top-[36%]">
          <MapPin className="h-3 w-3 text-orange" /> Near you
        </Chip>
      </>
    );
  }
  // trust
  return (
    <>
      <Chip className="absolute left-3 top-[8%]">
        <BadgeCheck className="h-3 w-3 text-green" /> Verified
      </Chip>
      <Chip className="absolute right-3 top-[10%]">
        <Star className="h-3 w-3 fill-orange text-orange" /> 4.8
      </Chip>
      <Chip className="absolute left-3 top-[36%]">
        <MapPin className="h-3 w-3 text-orange" /> Entebbe
      </Chip>
    </>
  );
}
