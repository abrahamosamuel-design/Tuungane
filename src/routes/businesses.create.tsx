import { createFileRoute } from "@tanstack/react-router";

import { Layout } from "@/components/Layout";
import { BusinessPageCreateForm } from "@/components/business/BusinessPageManager";

export const Route = createFileRoute("/businesses/create")({
  head: () => ({ meta: [{ title: "Create a business page — Tuungane" }] }),
  component: CreateBusinessPageRoute,
});

function CreateBusinessPageRoute() {
  return (
    <Layout>
      <BusinessPageCreateForm />
    </Layout>
  );
}