
-- business_pages: contact fields
REVOKE SELECT (contact_phone, whatsapp, email) ON public.business_pages FROM anon;

-- featured_locations: coordinates
REVOKE SELECT (latitude, longitude) ON public.featured_locations FROM anon;

-- opportunities: contact fields
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;

-- public_profiles: contacts + coordinates
REVOKE SELECT (phone, whatsapp, email, latitude, longitude) ON public.public_profiles FROM anon;

-- service_profiles: coordinates
REVOKE SELECT (latitude, longitude) ON public.service_profiles FROM anon;

-- service_requests: customer contact + coordinates
REVOKE SELECT (customer_phone, customer_whatsapp, latitude, longitude) ON public.service_requests FROM anon;

-- engagement identity
REVOKE SELECT (user_id) ON public.post_likes FROM anon;
REVOKE SELECT (user_id) ON public.official_post_likes FROM anon;
