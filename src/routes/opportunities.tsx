import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/opportunities")({
  component: () => <Navigate to="/requests/browse" replace />,
});
