// Defense-in-depth client-side masker for the `profiles.location_visibility` control.
// Visibility levels:
//   'area'     → show area, town, district  (full precision)
//   'town'     → hide area; show town, district
//   'district' → hide area + town; show district
//   'hidden'   → hide all three location fields
// The owner of the profile always sees their own fields unmasked.
//
// NOTE: This is a presentation-layer guard. True enforcement requires
// restricting the underlying `profiles` SELECT (e.g. a SECURITY DEFINER
// view that emits already-masked location columns) since the publishable
// key can still fetch raw rows. Tracked separately.

export type LocationVisibility = "area" | "town" | "district" | "hidden" | null | undefined;

export type LocationFields = {
  area?: string | null;
  town?: string | null;
  district?: string | null;
};

export function maskProfileLocation<T extends LocationFields>(
  profile: T & { location_visibility?: LocationVisibility },
  viewerIsOwner: boolean,
): T {
  if (viewerIsOwner) return profile;
  const v: LocationVisibility = profile.location_visibility ?? "area";
  const next = { ...profile };
  if (v === "hidden") {
    next.area = null;
    next.town = null;
    next.district = null;
  } else if (v === "district") {
    next.area = null;
    next.town = null;
  } else if (v === "town") {
    next.area = null;
  }
  // 'area' or unset → full precision
  return next;
}
