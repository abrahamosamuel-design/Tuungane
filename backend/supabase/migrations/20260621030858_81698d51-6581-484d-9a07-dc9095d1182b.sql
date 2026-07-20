
-- post_likes / official_post_likes: hide user_id from anon
REVOKE SELECT (user_id) ON public.post_likes FROM anon;
REVOKE SELECT (user_id) ON public.official_post_likes FROM anon;

-- opportunities: hide contact columns from anon
REVOKE SELECT (contact_phone, contact_email, whatsapp_number) ON public.opportunities FROM anon;

-- service_requests: hide customer contact + raw GPS from anon
REVOKE SELECT (customer_phone, customer_whatsapp, latitude, longitude) ON public.service_requests FROM anon;

-- featured_locations: hide raw GPS from anon
REVOKE SELECT (latitude, longitude) ON public.featured_locations FROM anon;

-- profile_claim_requests: contact fields gated behind get_profile_claim_contact() RPC
REVOKE SELECT (phone_number, whatsapp_number, email, supporting_file_url)
  ON public.profile_claim_requests FROM authenticated, anon;
