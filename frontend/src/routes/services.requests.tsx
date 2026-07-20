import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/services/requests")({
  component: () => <Navigate to="/requests/browse" replace />,
});
