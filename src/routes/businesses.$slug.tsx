import { createFileRoute, redirect } from "@tanstack/react-router";

// Business Pages are hidden in the Tuungane MVP. Send any deep links to
// the Services directory so users land on discoverable Service Profiles.
export const Route = createFileRoute("/businesses/$slug")({
  beforeLoad: () => {
    throw redirect({ to: "/services" });
  },
});
