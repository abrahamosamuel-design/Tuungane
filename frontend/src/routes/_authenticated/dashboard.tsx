import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>): any => ({
    composeBusiness: typeof search.composeBusiness === "string" ? search.composeBusiness : "",
    becomeProvider: search.becomeProvider === "1" || search.becomeProvider === 1 || search.becomeProvider === true,
  }),
  head: () => ({ meta: [{ title: "Dashboard — Tuungane" }] }),
  component: DashboardView,
});
