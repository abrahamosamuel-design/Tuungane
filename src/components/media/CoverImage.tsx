import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Wrench,
  Sparkles,
  Building2,
  Scissors,
  Truck,
  Car,
  GraduationCap,
  Camera,
  ChefHat,
  Laptop,
  HeartPulse,
  Sprout,
  MoreHorizontal,
  ImageOff,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const ICONS: Record<string, LucideIcon> = {
  "home-repair": Wrench,
  cleaning: Sparkles,
  "real-estate": Building2,
  beauty: Scissors,
  transport: Truck,
  automotive: Car,
  education: GraduationCap,
  events: Camera,
  food: ChefHat,
  digital: Laptop,
  health: HeartPulse,
  agriculture: Sprout,
  other: MoreHorizontal,
};

type CoverImageProps = {
  /** The intended use of the image. */
  variant: "square" | "wide";
  /** Actual image URL to show. */
  imageUrl?: string | null;
  /** Category slug used to pick a friendly fallback icon. */
  categorySlug?: string | null;
  /** Accessible name / alt text. */
  name?: string;
  /** Friendly label shown when no image is set. */
  label?: string;
  /** Optional green trust ring for verified square photos. */
  verifiedRing?: boolean;
  /** If provided, a clear upload button is shown inside the placeholder. */
  onUpload?: (file: File) => void;
  /** Whether an upload is currently in progress. */
  uploading?: boolean;
  className?: string;
};

/**
 * CoverImage — a friendly, on-brand placeholder for provider card photos and
 * profile header banners. Shows the real image when available, otherwise a
 * category icon with a polite "not set yet" label so empty spaces never look
 * broken.
 */
export function CoverImage({
  variant,
  imageUrl,
  categorySlug,
  name,
  label,
  verifiedRing,
  onUpload,
  uploading,
  className,
}: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const showImage = imageUrl && !failed;
  const showUpload = !showImage && !!onUpload;

  const Icon = ICONS[categorySlug || ""] || ImageOff;
  const defaultLabel =
    variant === "wide"
      ? "No profile banner yet"
      : "No service photo yet";
  const displayLabel = label ?? defaultLabel;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        variant === "square" && "aspect-square rounded-xl",
        variant === "wide" && "w-full rounded-xl",
        className
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name || "Provider photo"}
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full object-cover",
            verifiedRing && variant === "square" &&
              "ring-2 ring-green/60 ring-offset-1 ring-offset-background"
          )}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center gap-2 bg-navy p-4 text-center",
            variant === "square" && "rounded-xl",
            showUpload && variant === "wide" ? "justify-start pt-7" : "justify-center"
          )}
        >
          {showUpload ? (
            <>
              <input
                ref={setInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload?.(f);
                  if (e.target) e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef?.click()}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-full bg-navy-foreground px-3.5 font-semibold text-navy shadow-sm transition-colors hover:bg-navy-foreground/90 focus:outline-none focus:ring-2 focus:ring-navy-foreground focus:ring-offset-2 focus:ring-offset-navy",
                  variant === "wide"
                    ? "py-2 text-xs sm:px-4 sm:text-sm"
                    : "py-1.5 text-[11px]"
                )}
              >
                {uploading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className={cn("shrink-0", variant === "wide" ? "h-3.5 w-3.5" : "h-3 w-3")} />
                    {variant === "wide" ? "Upload a cover/header photo" : "Upload a photo"}
                  </>
                )}
              </button>
              {variant === "wide" ? (
                <Icon
                  className={cn(
                    "shrink-0 text-navy-foreground/60",
                    variant === "wide"
                      ? "h-7 w-7 sm:h-8 sm:w-8"
                      : "h-6 w-6 sm:h-8 sm:w-8"
                  )}
                  strokeWidth={1.75}
                />
              ) : (
                <span className="font-display text-2xl font-bold text-navy-foreground">
                  {name ? initials(name) : "?"}
                </span>
              )}
              {variant === "wide" && (
                <span
                  className={cn(
                    "font-medium leading-tight text-navy-foreground/80",
                    variant === "wide"
                      ? "text-xs sm:text-sm"
                      : "text-[10px] sm:text-xs"
                  )}
                >
                  {displayLabel}
                </span>
              )}
            </>
          ) : (
            <>
              {variant === "wide" ? (
                <Icon
                  className={cn(
                    "shrink-0 text-navy-foreground/70",
                    variant === "wide"
                      ? "h-8 w-8 sm:h-10 sm:w-10"
                      : "h-6 w-6 sm:h-8 sm:w-8"
                  )}
                  strokeWidth={1.75}
                />
              ) : (
                <span className="font-display text-3xl font-bold text-navy-foreground sm:text-4xl">
                  {name ? initials(name) : "?"}
                </span>
              )}
              {variant === "wide" && (
                <span
                  className={cn(
                    "font-medium leading-tight text-navy-foreground/90",
                    variant === "wide"
                      ? "text-xs sm:text-sm"
                      : "text-[10px] sm:text-xs"
                  )}
                >
                  {displayLabel}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
