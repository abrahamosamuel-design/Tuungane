import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/businesses")({
  component: BusinessesLayout,
});

function BusinessesLayout() {
  return <Outlet />;
}
