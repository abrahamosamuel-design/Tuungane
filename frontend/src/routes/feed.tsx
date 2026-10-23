import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Community Feed — Tuungane" },
      {
        name: "description",
        content: "Discover real-time community work updates, service requests, and active providers across Uganda.",
      },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  return <DashboardView />;
}
