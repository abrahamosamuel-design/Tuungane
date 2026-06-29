import { Link } from "@tanstack/react-router";
import { MessageSquare, User as UserIcon, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CTA, listSkillHref } from "@/lib/cta";

export function TwoSidedHeroCards() {
  const { user } = useAuth();
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer card */}
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-orange/10 p-5 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-navy">Need help?</h3>
            <p className="mt-1 text-sm text-foreground/80">
              Post a service request and get responses from people offering services near you.
            </p>
            <Link
              to={CTA.createRequest.href}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110"
            >
              {CTA.createRequest.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Provider card */}
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-green/10 p-5 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green text-white">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-navy">Have a skill?</h3>
            <p className="mt-1 text-sm text-foreground/80">
              List your service, show your work, and get discovered by people looking for services.
            </p>
            <Link
              to={listSkillHref(user) as never}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              {CTA.listSkill.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
