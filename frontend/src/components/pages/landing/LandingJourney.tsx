import { CalendarCheck, ShieldCheck, ThumbsUp } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function LandingJourney() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-green">How It Works</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          The Tuungane Journey
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Finding the right person for the job has never been easier. Follow these simple steps to get your task done securely and professionally.
        </p>

        <div className="mt-16 grid gap-8 sm:grid-cols-3 sm:gap-12">
          {/* Step 1 */}
          <div className="group relative text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-navy text-white shadow-xl transition-transform group-hover:scale-110">
              <CalendarCheck className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-navy">Book Your Service</h3>
            <p className="mt-3 text-muted-foreground">
              Choose your desired service, date, and time through our easy online platform or by posting a direct request.
            </p>
          </div>

          {/* Step 2 */}
          <div className="group relative text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green text-white shadow-xl transition-transform group-hover:scale-110">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-navy">Connect & Confirm</h3>
            <p className="mt-3 text-muted-foreground">
              We match you with local, verified professionals. You agree on the details and confirm the job securely.
            </p>
          </div>

          {/* Step 3 */}
          <div className="group relative text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange text-white shadow-xl transition-transform group-hover:scale-110">
              <ThumbsUp className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-navy">Enjoy the Results</h3>
            <p className="mt-3 text-muted-foreground">
              Relax while our professionals deliver high-quality work tailored to your exact needs.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <Link
            to="/requests/new"
            className="inline-flex items-center justify-center rounded-full bg-navy px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-navy/90"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </section>
  );
}
