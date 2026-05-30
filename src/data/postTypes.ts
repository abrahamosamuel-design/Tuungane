export const postTypes = [
  { value: "work_update", label: "Work update", color: "bg-navy/10 text-navy" },
  { value: "completed_job", label: "Completed job", color: "bg-green/10 text-green" },
  { value: "available", label: "Available for work", color: "bg-orange/10 text-orange" },
  { value: "before_after", label: "Before & after", color: "bg-purple-100 text-purple-700" },
  { value: "new_service", label: "New service", color: "bg-blue-100 text-blue-700" },
  { value: "promotion", label: "Promotion", color: "bg-pink-100 text-pink-700" },
  { value: "opportunity_shared", label: "Opportunity", color: "bg-amber-100 text-amber-700" },
] as const;

export type PostTypeValue = (typeof postTypes)[number]["value"];

export const postTypeMap = Object.fromEntries(postTypes.map((p) => [p.value, p])) as Record<PostTypeValue, (typeof postTypes)[number]>;
