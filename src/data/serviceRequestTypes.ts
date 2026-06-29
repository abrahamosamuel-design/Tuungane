export const requestStatuses = [
  { value: "requested", label: "Open", color: "bg-blue-100 text-blue-700" },
  { value: "accepted", label: "Provider Selected", color: "bg-amber-100 text-amber-700" },
  { value: "in_progress", label: "In Progress", color: "bg-indigo-100 text-indigo-700" },
  { value: "completed", label: "Completed", color: "bg-green/10 text-green" },
  { value: "cancelled", label: "Cancelled", color: "bg-slate-100 text-slate-700" },
  { value: "disputed", label: "Disputed", color: "bg-destructive/10 text-destructive" },
] as const;

export type RequestStatusValue = (typeof requestStatuses)[number]["value"];
export const requestStatusMap = Object.fromEntries(
  requestStatuses.map((s) => [s.value, s]),
) as Record<RequestStatusValue, (typeof requestStatuses)[number]>;

/**
 * Customer / provider-facing simplified status.
 * Internal statuses still exist (accepted, feedback_given, etc.) for admin/analytics,
 * but the visible UI collapses them into three stages.
 */
export type VisibleStatus = "open" | "in_progress" | "completed" | "cancelled" | "disputed";

export function toVisibleStatus(status: RequestStatusValue): VisibleStatus {
  switch (status) {
    case "requested":
      return "open";
    case "accepted":
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "disputed":
      return "disputed";
    default:
      return "open";
  }
}

export const visibleStatusMeta: Record<VisibleStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-orange/15 text-orange" },
  completed: { label: "Completed", color: "bg-green/10 text-green" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700" },
  disputed: { label: "Disputed", color: "bg-destructive/10 text-destructive" },
};

/**
 * Plain-language "what's happening right now" hint for the request, tailored
 * to who is viewing it. Returns null when no extra context is useful.
 */
export function statusHint(
  status: RequestStatusValue,
  viewerRole: "customer" | "provider",
  opts: { customerConfirmed?: boolean | null; providerConfirmed?: boolean | null; hasProvider?: boolean } = {},
): { tone: "info" | "action" | "success" | "muted" | "warn"; text: string } | null {
  const { customerConfirmed, providerConfirmed, hasProvider } = opts;
  if (status === "requested") {
    return viewerRole === "customer"
      ? { tone: "info", text: hasProvider ? "Waiting for the provider to accept." : "Live — providers can respond now." }
      : { tone: "action", text: "Open request — respond to be considered." };
  }
  if (status === "accepted") {
    return viewerRole === "customer"
      ? { tone: "info", text: "Provider confirmed. They'll mark the job in progress when they start." }
      : { tone: "action", text: "You've accepted. Tap Mark in progress when you start the work." };
  }
  if (status === "in_progress") {
    if (viewerRole === "customer") {
      return customerConfirmed
        ? { tone: "info", text: "Waiting for the provider to confirm completion." }
        : { tone: "action", text: "Work in progress — tap Confirm completion when it's done." };
    }
    return providerConfirmed
      ? { tone: "info", text: "Waiting for the customer to confirm completion." }
      : { tone: "action", text: "In progress — tap Mark completed when the work is finished." };
  }
  if (status === "completed") {
    return viewerRole === "customer"
      ? { tone: "success", text: "Job completed. Leave a verified review to help others." }
      : { tone: "success", text: "Job completed. Thanks for delivering!" };
  }
  if (status === "cancelled") return { tone: "muted", text: "This request was cancelled." };
  if (status === "disputed") return { tone: "warn", text: "Dispute opened — Tuungane is reviewing." };
  return null;
}

// User-facing urgency labels mapped to the existing DB enum
export const urgencyOptions = [
  { value: "emergency", label: "Today" },
  { value: "urgent", label: "This week" },
  { value: "normal", label: "Flexible" },
] as const;
export type UrgencyValue = (typeof urgencyOptions)[number]["value"];

export const budgetBuckets = [
  "Not sure",
  "Under 50,000 UGX",
  "50,000 – 100,000 UGX",
  "100,000 – 300,000 UGX",
  "Above 300,000 UGX",
  "Negotiable",
] as const;

export const contactMethods = [
  { value: "in_app", label: "Chat on Tuungane" },
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "any", label: "Any" },
] as const;
export type ContactMethodValue = (typeof contactMethods)[number]["value"];

export const visibilityOptions = [
  { value: "public", label: "Public in service feed", hint: "Anyone can see and respond." },
  { value: "matching_only", label: "Only matching providers", hint: "Only providers in this category & area." },
] as const;
export type VisibilityValue = (typeof visibilityOptions)[number]["value"];

export const reportReasons = [
  "Fake service provider",
  "Fraud or scam",
  "Service was not delivered",
  "Poor conduct",
  "Abusive content",
  "Fake review",
  "Misleading information",
  "Wrong category",
  "Other issue",
];

export interface ServiceRequestRow {
  id: string;
  customer_id: string;
  provider_id: string | null;
  service_profile_id: string | null;
  category_slug: string | null;
  subcategory: string | null;
  service_needed: string;
  title: string | null;
  visibility: VisibilityValue;
  selected_provider_id: string | null;
  completion_code: string | null;
  provider_confirmed_completion: boolean;
  customer_confirmed_completion: boolean;
  location: string;
  district: string | null;
  town: string | null;
  area: string | null;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  urgency: UrgencyValue;
  urgent_flag: boolean;
  budget_range: string | null;
  preferred_contact_method: ContactMethodValue;
  customer_phone: string | null;
  customer_whatsapp: string | null;
  attachment_url: string | null;
  status: RequestStatusValue;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  disputed_at: string | null;
}

export type ResponseStatus = "sent" | "viewed" | "shortlisted" | "chosen" | "declined" | "withdrawn";

export interface ProviderResponseRow {
  id: string;
  request_id: string;
  provider_id: string;
  message: string;
  quote_amount: number | null;
  availability_note: string | null;
  estimated_time: string | null;
  portfolio_post_id: string | null;
  contact_preference: ContactMethodValue | null;
  status: ResponseStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceFeedbackRow {
  id: string;
  service_request_id: string;
  customer_id: string;
  provider_id: string;
  did_use_provider: boolean;
  was_completed: boolean;
  rating: number;
  quality_rating: number | null;
  timekeeping_rating: number | null;
  communication_rating: number | null;
  price_fairness_rating: number | null;
  would_recommend: boolean;
  service_provided: string;
  review_text: string;
  was_on_time: string | null;
  work_quality_good: string | null;
  price_fair: string | null;
  would_use_again: string | null;
  issue_reported: boolean;
  issue_description: string | null;
  is_verified_review: boolean;
  is_visible: boolean;
  created_at: string;
}

export interface TrustStatsRow {
  provider_id: string;
  total_service_requests: number;
  completed_service_requests: number;
  cancelled_service_requests: number;
  disputed_service_requests: number;
  total_verified_reviews: number;
  average_rating: number;
  total_recommendations: number;
  total_followers: number;
  response_rate: number;
  completion_rate: number;
  trust_score: number;
}

export function trustScoreLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Highly Trusted", color: "bg-green/10 text-green" };
  if (score >= 70) return { label: "Trusted Provider", color: "bg-emerald-100 text-emerald-700" };
  if (score >= 55) return { label: "Building Trust", color: "bg-amber-100 text-amber-700" };
  return { label: "New Provider", color: "bg-slate-100 text-slate-700" };
}
