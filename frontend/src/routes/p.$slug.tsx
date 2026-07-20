import { createFileRoute } from "@tanstack/react-router";
import { PublicProfilePage } from "@/components/pages/profile/PublicProfilePage";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Tuungane` },
      { name: "description", content: "Service listing on Tuungane." },
    ],
  }),
  component: () => <PublicProfilePage slug={Route.useParams().slug} />,
});
