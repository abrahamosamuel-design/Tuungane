export const officialPostTypes = [
  { value: "opportunity", label: "Request", color: "bg-orange/10 text-orange" },
  { value: "featured_provider", label: "Featured Provider", color: "bg-navy/10 text-navy" },
  { value: "verified_provider", label: "Verified Provider", color: "bg-green/10 text-green" },
  { value: "service_highlight", label: "Service Highlight", color: "bg-blue-100 text-blue-700" },
  { value: "safety_tip", label: "Safety Tip", color: "bg-amber-100 text-amber-700" },
  { value: "platform_update", label: "Platform Update", color: "bg-purple-100 text-purple-700" },
  { value: "user_education", label: "User Education", color: "bg-pink-100 text-pink-700" },
  { value: "new_feature", label: "New Feature", color: "bg-emerald-100 text-emerald-700" },
  { value: "announcement", label: "Announcement", color: "bg-slate-100 text-slate-700" },
] as const;

export type OfficialPostTypeValue = (typeof officialPostTypes)[number]["value"];

export const officialPostTypeMap = Object.fromEntries(
  officialPostTypes.map((p) => [p.value, p]),
) as Record<OfficialPostTypeValue, (typeof officialPostTypes)[number]>;

export interface OfficialPostRow {
  id: string;
  official_account_id: string;
  post_type: OfficialPostTypeValue;
  title: string;
  content: string;
  category_slug: string | null;
  subcategory: string | null;
  location: string | null;
  image_url: string | null;
  linked_provider_id: string | null;
  linked_opportunity_id: string | null;
  contact_info: string | null;
  safety_note: string | null;
  source_verified: boolean;
  is_featured: boolean;
  is_pinned: boolean;
  is_homepage: boolean;
  status: string;
  expires_at: string | null;
  created_at: string;
}

export interface OfficialAccountRow {
  id: string;
  name: string;
  bio: string;
  tagline: string;
  profile_image_url: string | null;
  cover_image_url: string | null;
  is_official: boolean;
  is_verified: boolean;
  is_active: boolean;
  posting_enabled: boolean;
}
