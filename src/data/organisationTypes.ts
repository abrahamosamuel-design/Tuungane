export const organisationTypes = [
  { value: "school", label: "School / Learning Center" },
  { value: "vocational", label: "Vocational Institute" },
  { value: "ngo", label: "NGO / Nonprofit" },
  { value: "church", label: "Church / Faith Organisation" },
  { value: "community_group", label: "Community Group" },
  { value: "association", label: "Association" },
  { value: "sacco", label: "SACCO" },
  { value: "company", label: "Company / Enterprise" },
  { value: "training_center", label: "Training Center" },
  { value: "health_facility", label: "Health Facility" },
  { value: "government", label: "Government / Public Institution" },
  { value: "other", label: "Other Organisation" },
] as const;

export type OrganisationType = (typeof organisationTypes)[number]["value"];

export const organisationTypeLabel = (v: string | null | undefined) =>
  organisationTypes.find((t) => t.value === v)?.label ?? "Organisation";
