import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route — real provider profiles live at /u/$id.
// Keep this as a permanent redirect so old links don't 404.
export const Route = createFileRoute("/providers/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/u/$id", params: { id: params.id }, replace: true });
  },
  component: () => null,
});
