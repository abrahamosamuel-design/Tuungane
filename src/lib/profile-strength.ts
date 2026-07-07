/**
 * Profile Strength — a positive, trust-focused completeness score.
 * Never expressed as "incomplete" or "low trust"; UI uses encouraging language.
 */

export type StrengthInput = {
  avatarUrl?: string | null;
  fullName?: string | null;
  bio?: string | null;
  district?: string | null;
  town?: string | null;
  phone?: string | null;
  category?: string | null;
  servicesCount?: number;
  hasServiceProfile?: boolean;
  hasAvailability?: boolean;
  portfolioCount?: number;
  reviewsCount?: number;
  verified?: boolean;
  isProvider?: boolean;
};

export type StrengthItem = {
  key: string;
  label: string;
  done: boolean;
  weight: number;
  hint?: string;
};

export type StrengthResult = {
  score: number; // 0–100
  level: "Starter" | "Growing" | "Strong" | "Trusted";
  color: string; // tailwind class for bar
  items: StrengthItem[];
};

export function computeProfileStrength(p: StrengthInput): StrengthResult {
  const isProvider = !!p.isProvider;

  const base: StrengthItem[] = [
    {
      key: "photo",
      label: "Profile photo",
      done: !!p.avatarUrl,
      weight: isProvider ? 22 : 18,
      hint: isProvider
        ? "A clear profile photo helps customers feel more confident contacting you."
        : "A profile photo helps providers recognize you. It's optional, but it helps.",
    },
    { key: "name", label: "Full name", done: !!(p.fullName && p.fullName.trim().length > 1), weight: 12 },
    { key: "location", label: "Location set", done: !!(p.district || p.town), weight: 12 },
    { key: "bio", label: "Short bio", done: !!(p.bio && p.bio.trim().length >= 20), weight: 10 },
    { key: "phone", label: "Phone number", done: !!p.phone, weight: 8 },
  ];

  const providerItems: StrengthItem[] = isProvider
    ? [
        { key: "category", label: "Main skill or category", done: !!p.category, weight: 10 },
        { key: "services", label: "Services offered", done: (p.servicesCount ?? 0) > 0, weight: 10 },
        { key: "availability", label: "Availability set", done: !!p.hasAvailability, weight: 6 },
        { key: "portfolio", label: "Portfolio / work photos", done: (p.portfolioCount ?? 0) > 0, weight: 6 },
        { key: "reviews", label: "Reviews from customers", done: (p.reviewsCount ?? 0) > 0, weight: 6 },
        { key: "verified", label: "Verification", done: !!p.verified, weight: 8 },
      ]
    : [];

  const items = [...base, ...providerItems];
  const total = items.reduce((s, i) => s + i.weight, 0);
  const earned = items.reduce((s, i) => s + (i.done ? i.weight : 0), 0);
  const score = Math.round((earned / total) * 100);

  let level: StrengthResult["level"] = "Starter";
  let color = "bg-orange";
  if (score >= 85) { level = "Trusted"; color = "bg-green"; }
  else if (score >= 65) { level = "Strong"; color = "bg-green/80"; }
  else if (score >= 40) { level = "Growing"; color = "bg-orange"; }
  else { level = "Starter"; color = "bg-orange/80"; }

  return { score, level, color, items };
}
