
-- business_pages: remove blanket anon SELECT, grant only non-contact columns
REVOKE SELECT ON public.business_pages FROM anon;
GRANT SELECT (id, owner_id, slug, name, org_type, category_slug, subcategory, description, logo_url, cover_url, district, town, area, address, opening_hours, services, products, verified, is_featured, suspended, seeded_by_official, claim_status, created_at, updated_at, country, region, latitude, longitude) ON public.business_pages TO anon;

-- service_profiles: same pattern
REVOKE SELECT ON public.service_profiles FROM anon;
GRANT SELECT (user_id, business_name, category_slug, subcategory, bio, district, town, area, areas_served, years_experience, verified, availability, suspended, created_at, updated_at, cover_url, seeded_by_official, seeded_status, country, region, latitude, longitude, service_radius_km) ON public.service_profiles TO anon;

-- opportunities: same pattern
REVOKE SELECT ON public.opportunities FROM anon;
GRANT SELECT (id, title, opportunity_type, category_slug, subcategory, location, district, town, area, description, requirements, compensation, deadline, image_url, poster_id, poster_type, status, is_featured, created_at, updated_at, expires_at, business_page_id, archived) ON public.opportunities TO anon;
