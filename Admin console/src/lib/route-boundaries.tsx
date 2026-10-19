import { Link, useRouter } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export function RouteErrorCard({ error, reset, title = "Couldn't load this page" }: { error: Error; reset: () => void; title?: string }) {
  const router = useRouter();
  return (
    <Layout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
        <p className="mt-2 break-words text-sm text-muted-foreground">{error?.message ?? "Something went wrong."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110"
          >
            Try again
          </button>
          <Link to="/" className="rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-navy hover:border-navy">
            Go home
          </Link>
        </div>
      </div>
    </Layout>
  );
}

export function RouteNotFoundCard({ title = "Page not found", message = "This page doesn't exist or has been removed.", homeHref = "/", homeLabel = "Go home" }: { title?: string; message?: string; homeHref?: string; homeLabel?: string }) {
  return (
    <Layout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6">
          <a href={homeHref} className="inline-flex rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110">{homeLabel}</a>
        </div>
      </div>
    </Layout>
  );
}
