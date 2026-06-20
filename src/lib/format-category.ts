// Standardized, professional display labels for service subcategories.
// Maps DB-stored plurals/short labels → consistent, professional wording.
// Used wherever a subcategory is rendered to users. DB values are unchanged.

const MAP: Record<string, string> = {
  // Direct mappings from the spec
  "car wash": "Car Wash Service",
  "car washes": "Car Wash Service",
  "barbers": "Barber",
  "teachers": "Teacher / Tutor",
  "tutors": "Teacher / Tutor",
  "cleaners": "Cleaner",
  "house cleaners": "Cleaner",
  "drivers": "Driver",
  "electricians": "Electrician",
  "plumbers": "Plumber",
  "tailors": "Tailor / Fashion Designer",
  "fashion designers": "Tailor / Fashion Designer",
  "mechanics": "Mechanic",
  "car mechanics": "Mechanic",
  "builders": "Builder / Mason",
  "masons": "Builder / Mason",
  "painters": "Painter",
  "hairdressers": "Hairdresser / Salon",
  "salons": "Hairdresser / Salon",
  "photographers": "Photographer",
  "event providers": "Events Service Provider",
  "event planners": "Events Service Provider",
  "web designers": "Web Designer",
  "website designers": "Web Designer",
  "business services": "Business Service Provider",
  "caterers": "Caterer",
  "makeup artists": "Makeup Artist",
};

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Map a stored subcategory label to a clean, professional display label.
 * Falls back to title-cased input when no explicit mapping exists.
 */
export function formatSubcategory(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim();
  if (!v) return "";
  const hit = MAP[v.toLowerCase()];
  return hit ?? titleCase(v);
}
