
-- business_pages: hide contact fields from anon
REVOKE SELECT (contact_phone, whatsapp, email) ON public.business_pages FROM anon;

-- featured_locations: hide coordinates from anon
REVOKE SELECT (latitude, longitude) ON public.featured_locations FROM anon;

-- official_post_likes: hide user_id from anon (aggregate counts still OK via count())
REVOKE SELECT (user_id) ON public.official_post_likes FROM anon;

-- opportunities: hide contact fields from anon
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;

-- opportunity_applications: contact_phone gated via get_application_phone() RPC
REVOKE SELECT (contact_phone) ON public.opportunity_applications FROM anon, authenticated;

-- post_likes: hide user_id from anon
REVOKE SELECT (user_id) ON public.post_likes FROM anon;

-- public_profiles: hide contact fields from anon
REVOKE SELECT (phone, whatsapp, email) ON public.public_profiles FROM anon;

-- service_profiles: hide contact fields and coordinates from anon
REVOKE SELECT (phone, whatsapp, email, latitude, longitude) ON public.service_profiles FROM anon;

-- service_requests: hide customer contact and coordinates from anon
REVOKE SELECT (customer_phone, customer_whatsapp, latitude, longitude) ON public.service_requests FROM anon;
