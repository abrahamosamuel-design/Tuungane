import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPriceGuideLong,
  formatPriceGuideShort,
  hasPriceGuide,
  type PriceGuide,
} from "@/lib/price-guide";

const DISCLAIMER =
  "Final price may depend on job size, location, materials, and inspection.";

/** Profile-page card: clear, mobile-first, navy/orange. */
export function PriceGuideCard({
  guide,
  className,
}: {
  guide: PriceGuide | null | undefined;
  className?: string;
}) {
  if (!hasPriceGuide(guide)) return null;
  const main = formatPriceGuideLong(guide)!;
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
          <Coins className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Price Guide
          </p>
          <p className="mt-0.5 font-display text-lg font-bold leading-tight text-orange">
            {main}
          </p>
          {guide?.price_note ? (
            <p className="mt-1 text-xs text-muted-foreground">{guide.price_note}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{DISCLAIMER}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tiny chip for provider cards / lists. */
export function PriceGuideChip({
  guide,
  className,
}: {
  guide: PriceGuide | null | undefined;
  className?: string;
}) {
  const text = formatPriceGuideShort(guide);
  if (!text) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange",
        className,
      )}
      title="Price guide — final price may vary"
    >
      <Coins className="h-3 w-3" />
      {text}
    </span>
  );
}

/** Owner-only nudge when the price guide is empty. */
export function PriceGuideEmptyOwner({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-orange/40 bg-orange/5 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/15 text-orange">
          <Coins className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">Add your price guide</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Customers are more likely to contact providers who show clear pricing. This is a guide,
            not a final quote.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-orange-foreground hover:brightness-110"
          >
            Add price guide
          </button>
        </div>
      </div>
    </div>
  );
}

/** Public-facing soft empty for non-owners. Used sparingly. */
export function PriceGuideEmptyPublic() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Price Guide
      </p>
      <p className="mt-1 text-foreground/80">Contact provider for pricing.</p>
    </div>
  );
}
