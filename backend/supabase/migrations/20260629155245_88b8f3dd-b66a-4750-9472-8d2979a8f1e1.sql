-- Restrict anonymous access to sensitive columns via column-level REVOKE.
-- RLS policies operate at row-level only; PostgREST honors column-level
-- privileges, so revoking SELECT on specific columns from the `anon` role
-- prevents unauthenticated reads of contact details, raw coordinates, and
-- engagement user_ids while keeping the public listings working.

-- 1. business_pages: hide contact + coordinates from anon
REVOKE SELECT (email, whatsapp, contact_phone, latitude, longitude)
  ON public.business_pages FROM anon;

-- 2. featured_locations: hide raw coordinates from anon
REVOKE SELECT (latitude, longitude)
  ON public.featured_locations FROM anon;

-- 3. official_post_likes: hide liker user_id from anon (counts via RPC)
REVOKE SELECT (user_id)
  ON public.official_post_likes FROM anon;

-- 4. opportunities: hide contact fields from anon
REVOKE SELECT (contact_phone, whatsapp_number, contact_email)
  ON public.opportunities FROM anon;

-- 5. post_likes: hide liker user_id from anon
REVOKE SELECT (user_id)
  ON public.post_likes FROM anon;

-- 6. public_profiles: hide contact + coordinates from anon
REVOKE SELECT (phone, whatsapp, email, latitude, longitude)
  ON public.public_profiles FROM anon;

-- 7. service_profiles: hide contact + coordinates from anon
REVOKE SELECT (phone, whatsapp, email, latitude, longitude)
  ON public.service_profiles FROM anon;

-- 8. service_requests: hide customer contact + coordinates from anon
REVOKE SELECT (customer_phone, customer_whatsapp, latitude, longitude)
  ON public.service_requests FROM anon;
