
-- Post likes: require auth to see who liked
DROP POLICY IF EXISTS likes_read_all ON public.post_likes;
CREATE POLICY likes_read_auth ON public.post_likes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.post_likes FROM anon;

DROP POLICY IF EXISTS opl_read_all ON public.official_post_likes;
CREATE POLICY opl_read_auth ON public.official_post_likes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.official_post_likes FROM anon;

-- business_pages: revoke sensitive columns from anon
REVOKE SELECT ON public.business_pages FROM anon;
GRANT SELECT (id,owner_id,slug,name,org_type,category_slug,subcategory,description,logo_url,cover_url,district,town,area,address,opening_hours,services,products,verified,is_featured,suspended,seeded_by_official,claim_status,created_at,updated_at,country,region) ON public.business_pages TO anon;

-- public_profiles
REVOKE SELECT ON public.public_profiles FROM anon;
GRANT SELECT (id,owner_id,profile_type,slug,name,category_slug,subcategory,bio,avatar_url,cover_url,country,region,district,town,area,address,areas_served,service_radius_km,opening_hours,verified,availability,is_featured,suspended,seeded_by_official,claim_status,legacy_source,legacy_ref,created_at,updated_at) ON public.public_profiles TO anon;

-- service_profiles
REVOKE SELECT ON public.service_profiles FROM anon;
GRANT SELECT (user_id,business_name,category_slug,subcategory,bio,district,town,area,areas_served,years_experience,verified,availability,suspended,created_at,updated_at,cover_url,seeded_by_official,seeded_status,country,region,service_radius_km,header_url,media_urls,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note,price_updated_at,provider_type) ON public.service_profiles TO anon;

-- opportunities
REVOKE SELECT ON public.opportunities FROM anon;
GRANT SELECT (id,title,opportunity_type,category_slug,subcategory,location,district,town,area,description,requirements,compensation,deadline,image_url,poster_id,poster_type,status,is_featured,created_at,updated_at,expires_at,business_page_id,archived) ON public.opportunities TO anon;

-- service_requests
REVOKE SELECT ON public.service_requests FROM anon;
GRANT SELECT (id,customer_id,provider_id,service_profile_id,category_slug,subcategory,service_needed,location,district,town,area,description,preferred_date,preferred_time,urgency,budget_range,preferred_contact_method,attachment_url,status,created_at,updated_at,completed_at,cancelled_at,disputed_at,title,visibility,selected_provider_id,provider_confirmed_completion,customer_confirmed_completion,urgent_flag,country,region,public_profile_id,profile_service_id,media_urls,posted_as_type,posted_as_name,posted_as_avatar_url,posted_as_ref_type,posted_as_ref_id) ON public.service_requests TO anon;

-- featured_locations: hide exact coordinates from anon
REVOKE SELECT ON public.featured_locations FROM anon;
GRANT SELECT (id,country,region,district,town,area,category_slug,priority,note,active,created_by_admin_id,created_at,updated_at) ON public.featured_locations TO anon;
