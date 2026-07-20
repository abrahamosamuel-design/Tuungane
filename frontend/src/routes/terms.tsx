import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Flag, BadgeCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & Safety — Tuungane" }] }),
  component: Terms,
});

function Terms() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-navy">Terms & Safety</h1>
        <p className="mt-2 text-muted-foreground">Tuungane is built on trust. Please read these guidelines before using the platform.</p>

        <div className="mt-8 space-y-5">
          {[
            { i: ShieldCheck, t: "Verification", d: "Featured providers undergo identity and document verification. Look for the green badge before contacting." },
            { i: BadgeCheck, t: "Honest reviews", d: "Only post reviews after actually using a service. Fake reviews are removed and accounts can be suspended." },
            { i: Flag, t: "Report bad actors", d: "Use the Report button on any profile that seems fake, harmful, or misleading. We investigate every report." },
            { i: AlertTriangle, t: "Stay safe", d: "Meet in public when possible. Verify identity. Never pay large amounts up front without proof of work." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange"><Icon className="h-5 w-5" /></div>
              <div><h2 className="font-display text-lg font-bold text-navy">{t}</h2><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-sm text-foreground/70">
          <p>This is a short MVP overview. Full Terms of Service and Privacy Policy will be published as Tuungane grows. By using the platform you agree to act in good faith and respect other users.</p>
        </div>
      </section>
    </>
  );
}
