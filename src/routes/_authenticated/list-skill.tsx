import { createFileRoute, redirect } from "@tanstack/react-router";

// /list-skill is retired. Every "List a service" CTA now opens a blank
// create form at /profiles/new so multiple service profiles per user work.
export const Route = createFileRoute("/_authenticated/list-skill")({
  beforeLoad: () => {
    throw redirect({ to: "/profiles/new" });
  },
});
