
-- business_pages: hide PII + GPS from anon
REVOKE SELECT (contact_phone, email, whatsapp, latitude, longitude) ON public.business_pages FROM anon;

-- opportunities: hide contact PII from anon
REVOKE SELECT (contact_phone, contact_email, whatsapp_number) ON public.opportunities FROM anon;

-- public_profiles: hide PII + GPS from anon
REVOKE SELECT (phone, email, whatsapp, latitude, longitude) ON public.public_profiles FROM anon;

-- service_profiles: hide PII + GPS from anon
REVOKE SELECT (phone, email, whatsapp, latitude, longitude) ON public.service_profiles FROM anon;

-- service_requests: hide customer contact + GPS from anon
REVOKE SELECT (customer_phone, customer_whatsapp, latitude, longitude) ON public.service_requests FROM anon;

-- featured_locations: hide raw GPS from anon (proximity served via SECURITY DEFINER fns)
REVOKE SELECT (latitude, longitude) ON public.featured_locations FROM anon;

-- profile_claim_requests: requesters must use get_profile_claim_contact() RPC
REVOKE SELECT (phone_number, whatsapp_number, email, supporting_file_url) ON public.profile_claim_requests FROM authenticated;

-- post_likes / official_post_likes: do not expose user_id to anon
REVOKE SELECT (user_id) ON public.post_likes FROM anon;
REVOKE SELECT (user_id) ON public.official_post_likes FROM anon;
