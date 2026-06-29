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
  eyebrow: "SERVICE REQUESTS",
  heading: "Service Requests Near You",
  supporting:
    "Browse requests from people looking for services and respond to the ones you can do.",
  primaryCTA: "Post a Service Request",
  searchPlaceholder: "Search service requests...",
  locationPlaceholder: "Location e.g. Entebbe, Kampala, Wakiso",
  listTitle: "Recent Service Requests",
  emptyTitle: "No service requests available yet",
  emptyDescription:
    "Requests from people looking for services will appear here.",
  emptyCTA: "Post a Service Request",
  detailsTitle: "Service Request Details",
  dashboardTitle: "My Service Requests",
  providerAction: "Respond",
} as const;
