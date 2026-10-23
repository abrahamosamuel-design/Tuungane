import { createFileRoute } from "@tanstack/react-router";
import { ServicesDirectoryView } from "@/components/pages/services/ServicesDirectoryView";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Browse Services — Tuungane" },
      { name: "description", content: "Discover verified service providers across Uganda." },
    ],
  }),
  component: ServicesDirectoryView,
});
