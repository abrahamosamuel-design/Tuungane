import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/opportunities/new")({
  component: () => <Navigate to="/requests/new" replace />,
});
