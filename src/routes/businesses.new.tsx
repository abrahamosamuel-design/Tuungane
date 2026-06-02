import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/businesses/new")({
  beforeLoad: () => {
    throw redirect({ to: "/businesses/create" });
  },
});
