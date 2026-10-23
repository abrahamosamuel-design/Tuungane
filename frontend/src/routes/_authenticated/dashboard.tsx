import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Feed — Tuungane" }] }),
  component: () => <Navigate to="/feed" replace />,
});
