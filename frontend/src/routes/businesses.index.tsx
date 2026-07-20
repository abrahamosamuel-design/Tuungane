import { createFileRoute, redirect } from "@tanstack/react-router";

// Business Pages are hidden in the Tuungane MVP. Redirect to Services so
// discovery flows through completed Service Profiles instead.
export const Route = createFileRoute("/businesses/")({
  beforeLoad: () => {
    throw redirect({ to: "/services" });
  },
});
