import { BadgeCheck, Shield } from "lucide-react";

export function OfficialBadge({ size = "sm" }: { size?: "xs" | "sm" }) {
  const s = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-foreground">
      <Shield className={s} /> Official
    </span>
  );
}

export function VerifiedBadge({ size = "sm" }: { size?: "xs" | "sm" }) {
  const s = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green">
      <BadgeCheck className={s} /> Verified
    </span>
  );
}

export function OfficialAttribution({ logoUrl, compact = false }: { logoUrl?: string | null; compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      {logoUrl ? (
        <img src={logoUrl} alt="Tuungane Official" className="h-7 w-7 rounded-full border border-orange/40 object-cover" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange text-[11px] font-bold text-orange-foreground">T</div>
      )}
      <div className="leading-tight">
        <p className="text-xs font-semibold text-navy">Tuungane Official</p>
        {!compact && <p className="text-[10px] text-muted-foreground">Official Tuungane Account</p>}
      </div>
      <OfficialBadge size="xs" />
      <VerifiedBadge size="xs" />
    </div>
  );
}
