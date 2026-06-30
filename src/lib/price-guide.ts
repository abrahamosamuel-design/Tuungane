/**
 * Price Guide — provider pricing displayed as a guide (never a binding quote).
 */

export type PriceType =
  | "fixed"
  | "starting_from"
  | "range"
  | "quote_after_inspection"
  | "negotiable";

export type PriceGuide = {
  price_type: PriceType | null;
  price_fixed_ugx?: number | null;
  price_min_ugx?: number | null;
  price_max_ugx?: number | null;
  price_currency?: string | null;
  price_note?: string | null;
};

export const PRICE_TYPE_OPTIONS: { value: PriceType; label: string; hint: string }[] = [
  { value: "fixed", label: "Fixed price", hint: "One set amount, e.g. UGX 15,000" },
  { value: "starting_from", label: "Starting from", hint: "Minimum starting amount" },
  { value: "range", label: "Price range", hint: "From X to Y" },
  { value: "quote_after_inspection", label: "Quote after inspection", hint: "Final price after seeing the job" },
  { value: "negotiable", label: "Negotiable", hint: "Open to discussion with the customer" },
];

export function hasPriceGuide(p: PriceGuide | null | undefined): boolean {
  if (!p || !p.price_type) return false;
  if (p.price_type === "quote_after_inspection" || p.price_type === "negotiable") return true;
  if (p.price_type === "fixed") return p.price_fixed_ugx != null;
  if (p.price_type === "starting_from") return p.price_min_ugx != null;
  if (p.price_type === "range") return p.price_min_ugx != null && p.price_max_ugx != null;
  return false;
}

const CCY = (c?: string | null) => (c && c.trim()) || "UGX";

export function formatUgxFull(amount: number, currency = "UGX"): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-UG")}`;
}

export function formatUgxShort(amount: number, currency = "UGX"): string {
  const n = Math.round(amount);
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${currency} ${v.toFixed(v < 10 && v % 1 !== 0 ? 1 : 0).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) return `${currency} ${Math.round(n / 1000)}k`;
  return `${currency} ${n.toLocaleString("en-UG")}`;
}

/** Long form, e.g. "From UGX 20,000" / "UGX 20,000 – UGX 50,000". */
export function formatPriceGuideLong(p: PriceGuide | null | undefined): string | null {
  if (!hasPriceGuide(p)) return null;
  const c = CCY(p!.price_currency);
  switch (p!.price_type) {
    case "fixed":
      return `Fixed price ${formatUgxFull(p!.price_fixed_ugx!, c)}`;
    case "starting_from":
      return `From ${formatUgxFull(p!.price_min_ugx!, c)}`;
    case "range":
      return `${formatUgxFull(p!.price_min_ugx!, c)} – ${formatUgxFull(p!.price_max_ugx!, c)}`;
    case "quote_after_inspection":
      return "Quote after inspection";
    case "negotiable":
      return "Negotiable";
    default:
      return null;
  }
}

/** Compact card chip, e.g. "From UGX 20k". */
export function formatPriceGuideShort(p: PriceGuide | null | undefined): string | null {
  if (!hasPriceGuide(p)) return null;
  const c = CCY(p!.price_currency);
  switch (p!.price_type) {
    case "fixed":
      return `${formatUgxShort(p!.price_fixed_ugx!, c)} fixed`;
    case "starting_from":
      return `From ${formatUgxShort(p!.price_min_ugx!, c)}`;
    case "range":
      return `${formatUgxShort(p!.price_min_ugx!, c)}–${formatUgxShort(p!.price_max_ugx!, c).replace(/^[A-Z]+\s*/, "")}`;
    case "quote_after_inspection":
      return "Quote required";
    case "negotiable":
      return "Negotiable";
    default:
      return null;
  }
}

export type PriceGuideValidation = { ok: true } | { ok: false; error: string };

export function validatePriceGuide(p: PriceGuide): PriceGuideValidation {
  if (!p.price_type) return { ok: true };
  switch (p.price_type) {
    case "fixed":
      if (p.price_fixed_ugx == null) return { ok: false, error: "Please enter your fixed price." };
      return { ok: true };
    case "starting_from":
      if (p.price_min_ugx == null) return { ok: false, error: "Please enter a starting price." };
      return { ok: true };
    case "range":
      if (p.price_min_ugx == null || p.price_max_ugx == null)
        return { ok: false, error: "Please enter both minimum and maximum price." };
      if (p.price_max_ugx <= p.price_min_ugx)
        return { ok: false, error: "Maximum price should be higher than minimum price." };
      return { ok: true };
    case "quote_after_inspection":
    case "negotiable":
      return { ok: true };
  }
}
