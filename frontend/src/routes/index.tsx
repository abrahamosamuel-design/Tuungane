import { createFileRoute } from "@tanstack/react-router";
import { ServicesDirectoryView } from "@/components/pages/services/ServicesDirectoryView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tuungane — Connect to trusted services nearby" },
      {
        name: "description",
        content:
          "Discover and hire verified local service providers across Uganda — plumbers, electricians, catering, tech, beauty, and more.",
      },
      { property: "og:title", content: "Tuungane — Connect to trusted services nearby" },
      {
        property: "og:description",
        content:
          "Discover and hire verified local service providers across Uganda — plumbers, electricians, catering, tech, beauty, and more.",
      },
      { property: "og:url", content: "https://tuungane.com/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://tuungane.com/" }],
  }),
  component: IndexPage,
});

function IndexPage() {
  return <ServicesDirectoryView />;
}
