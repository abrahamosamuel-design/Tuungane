export const requestStatuses = [
  { value: "requested", label: "Requested", color: "bg-blue-100 text-blue-700" },
  { value: "accepted", label: "Accepted", color: "bg-amber-100 text-amber-700" },
  { value: "in_progress", label: "In progress", color: "bg-indigo-100 text-indigo-700" },
  { value: "completed", label: "Completed", color: "bg-green/10 text-green" },
  { value: "cancelled", label: "Cancelled", color: "bg-slate-100 text-slate-700" },
  { value: "disputed", label: "Disputed", color: "bg-destructive/10 text-destructive" },
] as const;

export type RequestStatusValue = (typeof requestStatuses)[number]["value"];
export const requestStatusMap = Object.fromEntries(
  requestStatuses.map((s) => [s.value, s]),
) as Record<RequestStatusValue, (typeof requestStatuses)[number]>;

export const urgencyOptions = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
] as const;
export type UrgencyValue = (typeof urgencyOptions)[number]["value"];

export const contactMethods = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "in_app", label: "In-app" },
  { value: "any", label: "Any" },
] as const;
export type ContactMethodValue = (typeof contactMethods)[number]["value"];

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
  provider_id: string;
  service_profile_id: string | null;
  category_slug: string | null;
  subcategory: string | null;
  service_needed: string;
  location: string;
  district: string | null;
  town: string | null;
  area: string | null;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  urgency: UrgencyValue;
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

export interface ServiceFeedbackRow {
  id: string;
  service_request_id: string;
  customer_id: string;
  provider_id: string;
  did_use_provider: boolean;
  was_completed: boolean;
  rating: number;
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
}
