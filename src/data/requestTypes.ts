// Public-facing copy and option lists for the Requests product surface.

export const requestFilterChips = [
  { value: "all", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "nearby", label: "Nearby" },
  { value: "verified", label: "Verified" },
  { value: "open", label: "Open" },
] as const;
export type RequestFilterChip = (typeof requestFilterChips)[number]["value"];

export const requestCheckboxFilters = [
  { value: "urgent_only", label: "Urgent only" },
  { value: "verified_customer", label: "Verified customer only" },
  { value: "budget_shown", label: "Budget shown" },
  { value: "near_me", label: "Near me" },
] as const;

export const REQUESTS_SAFETY_TEXT =
  "Verify the customer, location, and request details before starting work. Do not share sensitive information or make unsafe payments. Report suspicious requests.";

export const REQUESTS_COPY = {
  eyebrow: "OPEN REQUESTS",
  heading: "Find Open Requests Near You",
  supporting:
    "Browse real requests from people and businesses looking for skilled help nearby.",
  primaryCTA: "Post a Service Request",
  searchPlaceholder: "Search requests...",
  locationPlaceholder: "Location e.g. Entebbe, Kampala, Wakiso",
  listTitle: "Recent Requests",
  emptyTitle: "No requests yet",
  emptyDescription:
    "Be the first to create a request, or check back soon for requests near you.",
  emptyCTA: "Post a Service Request",
  detailsTitle: "Request Details",
  dashboardTitle: "My Requests",
  providerAction: "Respond",
} as const;
