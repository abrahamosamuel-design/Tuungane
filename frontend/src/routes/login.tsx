import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/pages/auth/LoginPage";

type Search = { tab?: "login" | "signup"; redirect?: string; intent?: "customer" | "provider" | "both" };

export const Route = createFileRoute("/login")({
  head: () => {
    const title = "Log in or sign up — Tuungane";
    const desc = "Sign in to Tuungane to post service requests, message providers, and manage your profile. New here? Create a free account in seconds.";
    const url = "https://tuungane.com/login";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === "signup" ? "signup" : "login",
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    intent: s.intent === "provider" || s.intent === "both" || s.intent === "customer" ? s.intent : undefined,
  }),
  staticData: {
    hideHeaderOnMobile: true,
    hideFooter: true,
    hideBottomNavOnMobileUnauth: true,
  },
  component: () => {
    const search = Route.useSearch();
    return <LoginPage initialTab={search.tab} redirectUrl={search.redirect} intent={search.intent} />;
  },
});
