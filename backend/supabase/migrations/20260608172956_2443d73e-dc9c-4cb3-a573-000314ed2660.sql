
-- Properly restrict sensitive contact columns by revoking SELECT on the table
-- and re-granting SELECT only on safe (non-contact) columns.

-- business_pages: hide contact_phone, whatsapp, email from anon
REVOKE SELECT ON public.business_pages FROM anon;
GRANT SELECT (id, owner_id, slug, name, org_type, category_slug, subcategory, description, logo_url, cover_url, district, town, area, address, opening_hours, services, products, verified, is_featured, suspended, seeded_by_official, claim_status, created_at, updated_at, country, region, latitude, longitude) ON public.business_pages TO anon;

-- opportunities: hide contact_phone, whatsapp_number, contact_email from anon
REVOKE SELECT ON public.opportunities FROM anon;
GRANT SELECT (id, title, opportunity_type, category_slug, subcategory, location, district, town, area, description, requirements, compensation, deadline, image_url, poster_id, poster_type, status, is_featured, created_at, updated_at, expires_at, business_page_id, archived) ON public.opportunities TO anon;

-- service_profiles: hide phone, whatsapp, email from anon
REVOKE SELECT ON public.service_profiles FROM anon;
GRANT SELECT (user_id, business_name, category_slug, subcategory, bio, district, town, area, areas_served, years_experience, verified, availability, suspended, created_at, updated_at, cover_url, seeded_by_official, seeded_status, country, region, latitude, longitude, service_radius_km) ON public.service_profiles TO anon;

-- service_requests: hide completion_code from authenticated AND anon (RPC-only access)
REVOKE SELECT ON public.service_requests FROM anon;
REVOKE SELECT ON public.service_requests FROM authenticated;
GRANT SELECT (id, customer_id, provider_id, service_profile_id, category_slug, subcategory, service_needed, location, district, town, area, description, preferred_date, preferred_time, urgency, budget_range, preferred_contact_method, customer_phone, customer_whatsapp, attachment_url, status, created_at, updated_at, completed_at, cancelled_at, disputed_at, title, visibility, selected_provider_id, provider_confirmed_completion, customer_confirmed_completion, urgent_flag, country, region, latitude, longitude) ON public.service_requests TO anon;
GRANT SELECT (id, customer_id, provider_id, service_profile_id, category_slug, subcategory, service_needed, location, district, town, area, description, preferred_date, preferred_time, urgency, budget_range, preferred_contact_method, customer_phone, customer_whatsapp, attachment_url, status, created_at, updated_at, completed_at, cancelled_at, disputed_at, title, visibility, selected_provider_id, provider_confirmed_completion, customer_confirmed_completion, urgent_flag, country, region, latitude, longitude) ON public.service_requests TO authenticated;
