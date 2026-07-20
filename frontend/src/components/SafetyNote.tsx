import { ShieldAlert } from "lucide-react";

type Tone = "warn" | "info" | "danger";

const toneClasses: Record<Tone, string> = {
  warn: "border-orange/30 bg-orange/10 text-orange",
  info: "border-navy/20 bg-navy/5 text-navy",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function SafetyNote({
  tone = "warn",
  title = "Stay safe",
  children,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex gap-3 rounded-xl border p-3 text-xs ${toneClasses[tone]}`}>
      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-foreground/80">{children}</p>
      </div>
    </div>
  );
}

export const SAFETY_TIPS = {
  opportunity: "Verify the customer, location, and request details before starting work. Do not share sensitive information or make unsafe payments. Report suspicious requests.",
  service: "Agree on price and scope before work begins. Pay in person after the job is done where possible. Verified providers and verified reviews are more reliable signals than promises.",
  business: "Confirm the business is real before sending money. Check verified status, reviews, and visit the physical location for big purchases.",
  request: "Avoid sharing your full address publicly. Use Tuungane chat to vet providers before agreeing to meet.",
  official: "Tuungane Official is the only verified platform account. Beware of impostors offering to fast-track verification, claims, or jobs in exchange for money.",
} as const;
