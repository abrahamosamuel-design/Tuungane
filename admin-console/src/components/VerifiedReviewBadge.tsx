import { ShieldCheck } from "lucide-react";

export function VerifiedReviewBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green ${className}`}>
      <ShieldCheck className="h-3 w-3" /> Verified Service Review
    </span>
  );
}
