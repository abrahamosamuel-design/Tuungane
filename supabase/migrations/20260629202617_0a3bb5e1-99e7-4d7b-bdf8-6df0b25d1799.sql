-- Revoke sensitive columns from anon (and authenticated where contact reveal RPCs exist)

-- business_pages: contact fields
REVOKE SELECT (contact_phone, whatsapp, email) ON public.business_pages FROM anon;
REVOKE SELECT (contact_phone, whatsapp, email) ON public.business_pages FROM authenticated;

-- featured_locations: coordinates
REVOKE SELECT (latitude, longitude) ON public.featured_locations FROM anon;

-- official_post_likes: user_id
REVOKE SELECT (user_id) ON public.official_post_likes FROM anon;

-- opportunities: contact fields
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM authenticated;

-- opportunity_applications: contact_phone gated via get_application_phone / reveal_application_contact RPCs
REVOKE SELECT (contact_phone) ON public.opportunity_applications FROM anon;
REVOKE SELECT (contact_phone) ON public.opportunity_applications FROM authenticated;

-- post_likes: user_id
REVOKE SELECT (user_id) ON public.post_likes FROM anon;

-- public_profiles: contact fields
REVOKE SELECT (phone, whatsapp, email) ON public.public_profiles FROM anon;
REVOKE SELECT (phone, whatsapp, email) ON public.public_profiles FROM authenticated;

-- service_profiles: contact fields (exposed via get_provider_contact RPC)
REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM anon;
REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM authenticated;

-- service_requests: contact fields + coordinates
REVOKE SELECT (customer_phone, customer_whatsapp) ON public.service_requests FROM anon;
REVOKE SELECT (customer_phone, customer_whatsapp) ON public.service_requests FROM authenticated;
REVOKE SELECT (latitude, longitude) ON public.service_requests FROM anon;
