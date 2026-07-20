import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/opportunities/$id")({
  component: () => <Navigate to="/requests/browse" replace />,
});
