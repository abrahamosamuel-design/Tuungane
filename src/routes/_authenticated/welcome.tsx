import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Search, Briefcase, MessageSquare, ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome to Tuungane" }] }),
  component: Welcome,
});

function markSeen() {
  try { localStorage.setItem("tuungane_welcome_seen", "1"); } catch { /* ignore */ }
}

function getFirstName(user: { user_metadata?: Record<string, unknown> | null; email?: string | null } | null | undefined): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [meta.first_name, meta.given_name, meta.name, meta.full_name, meta.display_name];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const first = c.trim().split(/\s+/)[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }
  if (user.email) {
    const local = user.email.split("@")[0].replace(/[._-]+/g, " ").trim().split(/\s+/)[0];
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return null;
}

function Welcome() {
  const nav = useNavigate();
  const { user } = useAuth();
  useEffect(() => { markSeen(); }, []);

  const firstName = useMemo(() => getFirstName(user), [user]);

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange">
          {firstName ? `Welcome, ${firstName} 👋` : "Welcome 👋"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">
          What brings you to Tuungane today?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick the path that fits you best. You can always do both later.
        </p>


        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => { markSeen(); nav({ to: "/requests/new" }); }}
            className="group rounded-2xl border-2 border-orange/30 bg-orange/5 p-5 text-left transition hover:border-orange hover:bg-orange/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange text-orange-foreground">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-navy">I need help with something</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe a job — like a leaking sink or a delivery — and skilled people will reach out.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange">
              Post a request <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => { markSeen(); nav({ to: "/list-skill" }); }}
            className="group rounded-2xl border-2 border-green/30 bg-green/5 p-5 text-left transition hover:border-green hover:bg-green/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green text-green-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-navy">I offer a skill or service</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a free profile so customers can find you, see your work, and message you directly.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green">
              List my skill <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-navy">Just looking around?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse what people in your area are offering — no commitment.
              </p>
              <Link
                to="/services"
                onClick={markSeen}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
              >
                Browse services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => { markSeen(); nav({ to: "/services" }); }}
            className="text-xs font-medium text-muted-foreground hover:text-navy"
          >
            Skip for now
          </button>
        </div>
      </section>
    </Layout>
  );
}
