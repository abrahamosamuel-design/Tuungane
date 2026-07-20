import { createFileRoute } from "@tanstack/react-router";
import { ServicesIndexPage } from "@/components/pages/services/ServicesIndexPage";

export const Route = createFileRoute("/services/")({
  validateSearch: (search: Record<string, unknown>): { sort?: "recent" } => ({
    sort: (search.sort === "recent" ? "recent" : undefined) as "recent" | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find Trusted Services Near You — Tuungane" },
      { name: "description", content: "Search providers by service, skill, or location. Find plumbers, tutors, mechanics, designers and more across Uganda." },
      { property: "og:title", content: "Find Trusted Services Near You — Tuungane" },
      { property: "og:description", content: "Browse verified providers across Uganda — plumbers, tutors, mechanics, designers and more." },
      { property: "og:url", content: "https://tuungane.com/services" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://tuungane.com/services" }],
  }),
  component: () => <ServicesIndexPage initialSort={Route.useSearch().sort} />,
});
