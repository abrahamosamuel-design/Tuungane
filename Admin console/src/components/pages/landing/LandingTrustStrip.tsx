import { ShieldCheck, Star } from "lucide-react";

export function LandingTrustStrip() {
  return (
    <div className="bg-white py-12 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Ratings */}
          <div className="flex items-center gap-4">
            <div>
              <div className="flex text-orange">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <p className="mt-1 font-bold text-navy">Over 9,000 five star<br />customer ratings!</p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
            <TrustLogo name="Verified" />
            <TrustLogo name="Local" />
            <TrustLogo name="Trusted" />
            <TrustLogo name="Secure" />
          </div>

          {/* Guarantee */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green/10 text-green">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="font-bold text-navy text-sm max-w-[150px]">
              Perfect service, or we'll make it right!
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function TrustLogo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 font-display font-extrabold text-xl tracking-tighter text-navy/70">
      <div className="h-8 w-8 rounded-lg bg-navy/10 flex items-center justify-center">
        <div className="h-4 w-4 rounded-full bg-navy/40" />
      </div>
      {name}
    </div>
  );
}
