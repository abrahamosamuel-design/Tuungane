import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function LandingHero() {
  const { user } = useAuth();
  return (
    <section className="relative w-full overflow-hidden bg-navy pt-24 pb-48 lg:pt-32 lg:pb-56 xl:pt-40 xl:pb-64">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-transparent z-10" />
        <img 
          src="/hero-bg.png" 
          alt="Professional African service provider" 
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Find trusted services. <br />
            <span className="text-orange">Grow your business.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            Post a service request, find people offering services, or list your service so people can find you easily.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              to="/requests/new"
              className="inline-flex items-center justify-center rounded-full bg-orange px-8 py-4 text-sm font-bold text-white shadow-lg shadow-orange/30 transition-all hover:scale-105 hover:brightness-110"
            >
              Post a Request
            </Link>
            <button className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green text-white">
                <Play className="h-4 w-4 fill-current" />
              </span>
              How it works
            </button>
          </div>
        </div>

        {/* Floating Trust Badge */}
        <div className="absolute top-1/2 right-12 hidden lg:flex flex-col gap-2 rounded-2xl border border-white/10 bg-navy/40 p-4 backdrop-blur-xl shadow-2xl -translate-y-12">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green/20 text-green">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display font-bold text-white">Professional & Premium</p>
              <p className="text-xs text-white/70">Exceptional service. Verified providers.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Temporary import for icon
import { ShieldCheck } from "lucide-react";
