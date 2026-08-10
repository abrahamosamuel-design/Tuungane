import { createFileRoute } from "@tanstack/react-router";
import { RequestsBrowsePage } from "@/components/pages/requests/RequestsBrowsePage";

export const Route = createFileRoute("/requests/browse")({
  staticData: { hideBottomNavOnMobile: true, hideHeaderOnMobile: true },
  head: () => ({
    meta: [
      { title: "Find Open Requests — Tuungane" },
      {
        name: "description",
        content:
          "Browse real requests from people and businesses looking for skilled help nearby on Tuungane.",
      },
    ],
  }),
  component: RequestsBrowsePage,
});
