import { createFileRoute, redirect } from "@tanstack/react-router";

// Business Pages are hidden in the Tuungane MVP. Route people to the
// unified Service Profile flow instead.
export const Route = createFileRoute("/businesses/create")({
  beforeLoad: () => {
    throw redirect({ to: "/list-skill" });
  },
});
