import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProviderCard } from "@/components/ProviderCard";
import { getCategory } from "@/data/categories";
import { providersByCategory } from "@/data/providers";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const category = getCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category.name ?? "Services"} — Tuungane` },
      { name: "description", content: loaderData?.category.blurb ?? "Browse Tuungane services" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-center">Could not load category: {error.message}</div>,
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Category not found</h1>
        <Link to="/services" className="mt-6 inline-block text-orange">Back to services</Link>
      </div>
    </Layout>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const list = providersByCategory(category.slug);
  return (
    <Layout>
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-orange">
            <ArrowLeft className="h-4 w-4" /> All services
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">{category.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{category.blurb}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {category.subcategories.map((s: string) => (
              <span key={s} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-navy">{s}</span>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-navy">{list.length} provider{list.length !== 1 && "s"} in this category</h2>
        {list.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => <ProviderCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-semibold text-navy">No providers listed here yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to post your skill in this category.</p>
            <Link to="/login" className="mt-5 inline-flex rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground">Post your skill</Link>
          </div>
        )}
      </section>
    </Layout>
  );
}
