// Single source of truth for two-sided platform CTAs.
// Customer track = orange ("Create a Request").
// Provider track = green ("List Your Skill").

import type { User } from "@supabase/supabase-js";

export const CTA = {
  createRequest: { label: "Create a Request", href: "/requests/new" },
  listSkill: { label: "List Your Skill" },
  browseRequests: { label: "Browse Requests", href: "/requests/browse" },
  postYourWork: { label: "Post Your Work", href: "/dashboard" },
  becomeProvider: { label: "Become a Provider" },
} as const;

/**
 * Where the "List Your Skill" CTA should send a user.
 * Returns an object compatible with TanStack `<Link to=... search=...>`.
 */
export function listSkillLink(user: User | null | undefined): {
  to: string;
  search?: Record<string, string>;
} {
  if (user) return { to: "/list-skill" };
  return { to: "/login", search: { tab: "signup", intent: "provider", redirect: "/list-skill" } };
}

/** Plain-string href fallback (anchors, server links). */
export function listSkillHref(user: User | null | undefined): string {
  if (user) return "/list-skill";
  return "/login?tab=signup&intent=provider&redirect=/list-skill";
}
