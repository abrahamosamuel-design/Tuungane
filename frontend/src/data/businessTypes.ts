export const businessOrgTypes = [
  { value: "business", label: "Business" },
  { value: "shop", label: "Shop" },
  { value: "restaurant", label: "Restaurant" },
  { value: "salon", label: "Salon" },
  { value: "school", label: "School" },
  { value: "training_center", label: "Training centre" },
  { value: "car_wash", label: "Car wash" },
  { value: "clinic", label: "Clinic" },
  { value: "organization", label: "Organization" },
  { value: "company", label: "Company" },
  { value: "church", label: "Church" },
  { value: "ngo", label: "NGO" },
  { value: "community_group", label: "Community group" },
] as const;

export type BusinessOrgType = (typeof businessOrgTypes)[number]["value"];

export const orgTypeLabel = (v: string) =>
  businessOrgTypes.find((t) => t.value === v)?.label ?? "Business";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "page";
