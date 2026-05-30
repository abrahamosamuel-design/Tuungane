export const opportunityTypes = [
  { value: "gig", label: "Gig" },
  { value: "job", label: "Job" },
  { value: "internship", label: "Internship" },
  { value: "volunteer", label: "Volunteer" },
  { value: "apprenticeship", label: "Apprenticeship" },
] as const;

export type OpportunityType = (typeof opportunityTypes)[number]["value"];

export const posterTypes = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "organization", label: "Organization" },
  { value: "school", label: "School" },
  { value: "church", label: "Church" },
  { value: "ngo", label: "NGO" },
  { value: "admin", label: "Tuungane Admin" },
] as const;

export const reportReasons = [
  "Fake opportunity",
  "Scam or fraud",
  "Misleading information",
  "Wrong category",
  "Expired opportunity",
  "Abusive content",
  "Other issue",
];

export const opportunityStatusLabel: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  featured: "Featured",
  expired: "Expired",
};
