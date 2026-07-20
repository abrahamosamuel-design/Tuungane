
-- Revoke contact + coordinate columns from anon
REVOKE SELECT (contact_phone, whatsapp, email, latitude, longitude) ON public.business_pages FROM anon;
REVOKE SELECT (latitude, longitude) ON public.featured_locations FROM anon;
REVOKE SELECT (user_id) ON public.official_post_likes FROM anon;
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;
REVOKE SELECT (user_id) ON public.post_likes FROM anon;
REVOKE SELECT (phone, whatsapp, email, latitude, longitude) ON public.public_profiles FROM anon;
REVOKE SELECT (phone, whatsapp, email, latitude, longitude) ON public.service_profiles FROM anon;
REVOKE SELECT (customer_phone, customer_whatsapp, latitude, longitude) ON public.service_requests FROM anon;
REVOKE SELECT (latitude, longitude) ON public.timeline_posts FROM anon;
