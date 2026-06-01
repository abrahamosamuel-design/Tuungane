import type { ReactNode } from "react";

/**
 * Sticky bottom action bar shown only on mobile (md:hidden).
 * Sits above the MobileBottomNav (which is ~64px) and respects safe-area-inset.
 * Use for primary CTA(s) on detail pages: provider profile, request, opportunity.
 */
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Spacer so page content isn't covered when scrolled to bottom */}
      <div className="h-20 md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2">
          {children}
        </div>
      </div>
    </>
  );
}
